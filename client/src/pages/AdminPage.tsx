import { useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Play, RefreshCw } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useTournament,
  useAddTeam,
  useAddTeamsBulk,
  useDeleteTeam,
  useGenerateMatches,
  useUpdateTournament,
  useCreateMatch,
} from '@/api/tournaments'
import { useUpdateMatchById } from '@/api/matches'
import { useTournamentAuth } from '@/hooks/useTournamentAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { MatchFormDialog } from '@/components/admin/MatchFormDialog'
import { MatchAdminCard } from '@/components/admin/MatchAdminCard'
import type { CreateMatch, MatchStage } from '@shared/schemas'

const teamFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  shortName: z.string().max(5).optional(),
})

const bulkTeamsSchema = z.object({
  teams: z.string().min(1, 'Enter at least one team name'),
})

const passwordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

type TeamFormData = z.infer<typeof teamFormSchema>
type BulkTeamsData = z.infer<typeof bulkTeamsSchema>
type PasswordData = z.infer<typeof passwordSchema>

export function AdminPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: tournament, isLoading } = useTournament(slug ?? '')
  const { isAuthenticated, isVerifying, login, tryRestoreSession } =
    useTournamentAuth(slug ?? '')
  const addTeamMutation = useAddTeam(slug ?? '')
  const addTeamsBulkMutation = useAddTeamsBulk(slug ?? '')
  const deleteTeamMutation = useDeleteTeam(slug ?? '')
  const generateMatchesMutation = useGenerateMatches(slug ?? '')
  const updateTournamentMutation = useUpdateTournament(slug ?? '')
  const createMatchMutation = useCreateMatch(slug ?? '')
  const updateMatchMutation = useUpdateMatchById(slug ?? '')

  const [addTeamOpen, setAddTeamOpen] = useState(false)
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [matchFormOpen, setMatchFormOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<{
    id: string
    homeTeamId?: string
    awayTeamId?: string
    stage: MatchStage
    round: number
    matchNumber: number
    scheduledAt?: string | null
    status: string
  } | null>(null)

  // Try to restore session on mount
  useState(() => {
    void tryRestoreSession()
  })

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
  })

  const teamForm = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
  })

  const bulkForm = useForm<BulkTeamsData>({
    resolver: zodResolver(bulkTeamsSchema),
  })

  const onPasswordSubmit = async (data: PasswordData) => {
    const success = await login(data.password)
    if (!success) {
      passwordForm.setError('password', { message: 'Invalid password' })
    }
  }

  const onAddTeam = async (data: TeamFormData) => {
    await addTeamMutation.mutateAsync(data)
    teamForm.reset()
    setAddTeamOpen(false)
  }

  const onBulkAdd = async (data: BulkTeamsData) => {
    const teamNames = data.teams
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name.length > 0)

    await addTeamsBulkMutation.mutateAsync(
      teamNames.map((name) => ({ name }))
    )
    bulkForm.reset()
    setBulkAddOpen(false)
  }

  const onDeleteTeam = useCallback(
    async (teamId: string) => {
      if (confirm('Are you sure you want to delete this team?')) {
        await deleteTeamMutation.mutateAsync(teamId)
      }
    },
    [deleteTeamMutation]
  )

  const onGenerateMatches = async () => {
    if (
      confirm(
        'This will delete existing matches and generate new ones. Continue?'
      )
    ) {
      await generateMatchesMutation.mutateAsync({})
    }
  }

  const onStartTournament = async () => {
    await updateTournamentMutation.mutateAsync({ status: 'IN_PROGRESS' })
  }

  const onCreateMatch = async (data: CreateMatch) => {
    await createMatchMutation.mutateAsync(data)
    setMatchFormOpen(false)
  }

  const onEditMatch = (match: typeof editingMatch) => {
    setEditingMatch(match)
    setMatchFormOpen(true)
  }

  const onCloseMatchForm = () => {
    setMatchFormOpen(false)
    setEditingMatch(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (tournament === undefined) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Tournament not found
          </p>
        </CardContent>
      </Card>
    )
  }

  // Show login dialog if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>
              Enter the admin password to manage {tournament.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => void passwordForm.handleSubmit(onPasswordSubmit)(e)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...passwordForm.register('password')}
                />
                {passwordForm.formState.errors.password?.message !== undefined && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isVerifying}>
                {isVerifying ? 'Verifying...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  const canGenerateMatches = tournament.teams.length >= 2
  const canStart =
    tournament.status === 'DRAFT' && tournament.matches.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/tournaments/${slug ?? ''}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <p className="text-muted-foreground">Admin Dashboard</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Teams Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Teams ({tournament.teams.length})</CardTitle>
              <div className="flex gap-2">
                <Dialog open={bulkAddOpen} onOpenChange={setBulkAddOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Multiple Teams</DialogTitle>
                      <DialogDescription>
                        Enter one team name per line
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => void bulkForm.handleSubmit(onBulkAdd)(e)}
                    >
                      <Textarea
                        placeholder="Team 1&#10;Team 2&#10;Team 3"
                        rows={6}
                        {...bulkForm.register('teams')}
                      />
                      <DialogFooter className="mt-4">
                        <Button
                          type="submit"
                          disabled={addTeamsBulkMutation.isPending}
                        >
                          Add Teams
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={addTeamOpen} onOpenChange={setAddTeamOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Team
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Team</DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => void teamForm.handleSubmit(onAddTeam)(e)}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label>Team Name</Label>
                        <Input {...teamForm.register('name')} />
                        {teamForm.formState.errors.name?.message !== undefined && (
                          <p className="text-sm text-destructive">
                            {teamForm.formState.errors.name.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Short Name (optional)</Label>
                        <Input
                          placeholder="ABC"
                          maxLength={5}
                          {...teamForm.register('shortName')}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={addTeamMutation.isPending}
                        >
                          Add Team
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {tournament.teams.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No teams added yet
              </p>
            ) : (
              <div className="space-y-2">
                {tournament.teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <span className="font-medium">{team.name}</span>
                      {team.shortName !== null && (
                        <span className="ml-2 text-muted-foreground">
                          ({team.shortName})
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void onDeleteTeam(team.id)}
                      disabled={deleteTeamMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tournament Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Tournament Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <h4 className="font-medium">Status</h4>
                <Badge variant="secondary">{tournament.status}</Badge>
              </div>
              {canStart && (
                <Button
                  onClick={() => void onStartTournament()}
                  disabled={updateTournamentMutation.isPending}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Tournament
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Generate Matches</h4>
              <p className="text-sm text-muted-foreground">
                Generate the match schedule based on your tournament format (
                {tournament.format.replace(/_/g, ' ')})
              </p>
              <Button
                onClick={() => void onGenerateMatches()}
                disabled={
                  !canGenerateMatches || generateMatchesMutation.isPending
                }
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {tournament.matches.length > 0
                  ? 'Regenerate Matches'
                  : 'Generate Matches'}
              </Button>
              {!canGenerateMatches && (
                <p className="text-sm text-destructive">
                  Add at least 2 teams to generate matches
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Matches */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Matches ({tournament.matches.length})</CardTitle>
                <CardDescription>
                  Click on a match to manage scoring. Hover over scheduled matches to edit or delete.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingMatch(null)
                  setMatchFormOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Match
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tournament.matches.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No matches yet. Add teams and generate matches, or create a match manually.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {tournament.matches.map((match) => (
                  <MatchAdminCard
                    key={match.id}
                    match={match}
                    tournamentSlug={slug ?? ''}
                    onEdit={onEditMatch}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Match Form Dialog */}
      <MatchFormDialog
        open={matchFormOpen}
        onOpenChange={onCloseMatchForm}
        onSubmit={async (data) => {
          if (editingMatch) {
            // Update existing match
            await updateMatchMutation.mutateAsync({
              matchId: editingMatch.id,
              data: {
                homeTeamId: data.homeTeamId ?? null,
                awayTeamId: data.awayTeamId ?? null,
                stage: data.stage,
                round: data.round,
                matchNumber: data.matchNumber,
                scheduledAt: data.scheduledAt ?? null,
              },
            })
            setMatchFormOpen(false)
            setEditingMatch(null)
          } else {
            await onCreateMatch(data)
          }
        }}
        teams={tournament.teams}
        isPending={createMatchMutation.isPending || updateMatchMutation.isPending}
        mode={editingMatch ? 'edit' : 'create'}
        defaultValues={
          editingMatch !== null
            ? {
                homeTeamId: editingMatch.homeTeamId,
                awayTeamId: editingMatch.awayTeamId,
                stage: editingMatch.stage,
                round: editingMatch.round,
                matchNumber: editingMatch.matchNumber,
                scheduledAt: editingMatch.scheduledAt ?? undefined,
              }
            : {}
        }
        nextMatchNumber={
          tournament.matches.length > 0
            ? Math.max(...tournament.matches.map((m) => m.matchNumber)) + 1
            : 1
        }
      />
    </div>
  )
}
