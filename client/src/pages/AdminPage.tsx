import { useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Play, RefreshCw, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  useTournament,
  useAddTeam,
  useAddTeamsBulk,
  useDeleteTeam,
  useGenerateMatches,
  useUpdateTournament,
  useCreateMatch,
  useUpdateSeeds,
} from '@/api/tournaments'
import { useUpdateMatchById } from '@/api/matches'
import { useTournamentAuth } from '@/hooks/useTournamentAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { MatchFormDialog } from '@/components/admin/MatchFormDialog'
import { MatchAdminCard } from '@/components/admin/MatchAdminCard'
import { BracketEditor } from '@/components/admin/BracketEditor'
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

interface SortableTeamItemProps {
  id: string
  name: string
  index: number
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}

function SortableTeamItem({
  id,
  name,
  index,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: SortableTeamItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border p-2 bg-card ${isDragging ? 'shadow-lg z-10' : ''}`}
    >
      <div className="flex flex-col gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onMoveUp}
          disabled={isFirst}
        >
          <span className="text-xs">▲</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onMoveDown}
          disabled={isLast}
        >
          <span className="text-xs">▼</span>
        </Button>
      </div>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="w-6 text-sm text-muted-foreground">#{index + 1}</span>
      <span className="font-medium flex-1">{name}</span>
    </div>
  )
}

export function AdminPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: tournament, isLoading } = useTournament(slug ?? '')
  const { isAuthenticated, isVerifying, login, tryRestoreSession } = useTournamentAuth(slug ?? '')
  const addTeamMutation = useAddTeam(slug ?? '')
  const addTeamsBulkMutation = useAddTeamsBulk(slug ?? '')
  const deleteTeamMutation = useDeleteTeam(slug ?? '')
  const generateMatchesMutation = useGenerateMatches(slug ?? '')
  const updateTournamentMutation = useUpdateTournament(slug ?? '')
  const createMatchMutation = useCreateMatch(slug ?? '')
  const updateMatchMutation = useUpdateMatchById(slug ?? '')
  const updateSeedsMutation = useUpdateSeeds(slug ?? '')

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
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null)
  const [generateMatchesDialogOpen, setGenerateMatchesDialogOpen] = useState(false)
  const [seedEditorOpen, setSeedEditorOpen] = useState(false)
  const [editingSeeds, setEditingSeeds] = useState<{ id: string; name: string; seed: number }[]>([])

  // Generate matches config state
  const [groupCount, setGroupCount] = useState(2)
  const [advancingPerGroup, setAdvancingPerGroup] = useState(2)
  const [useSeeding, setUseSeeding] = useState(true)

  // Drag and drop sensors for seed editor
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over !== null && active.id !== over.id) {
      setEditingSeeds((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

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
    toast.success('Team added')
    teamForm.reset()
    setAddTeamOpen(false)
  }

  const onBulkAdd = async (data: BulkTeamsData) => {
    const teamNames = data.teams
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name.length > 0)

    await addTeamsBulkMutation.mutateAsync(teamNames.map((name) => ({ name })))
    toast.success(`${String(teamNames.length)} teams added`)
    bulkForm.reset()
    setBulkAddOpen(false)
  }

  const onDeleteTeamClick = useCallback((teamId: string) => {
    setDeleteTeamId(teamId)
  }, [])

  const onDeleteTeamConfirm = async () => {
    if (deleteTeamId !== null) {
      await deleteTeamMutation.mutateAsync(deleteTeamId)
      toast.success('Team deleted')
      setDeleteTeamId(null)
    }
  }

  const onGenerateMatchesClick = () => {
    // Set default group count based on team count
    if (tournament) {
      const teamCount = tournament.teams.length
      const defaultGroups = Math.max(2, Math.min(4, Math.floor(teamCount / 4)))
      setGroupCount(defaultGroups)
    }
    setGenerateMatchesDialogOpen(true)
  }

  const onGenerateMatchesConfirm = async () => {
    const options =
      tournament?.format === 'GROUP_KNOCKOUT'
        ? { groupCount, advancingPerGroup, useSeeding }
        : { useSeeding }
    await generateMatchesMutation.mutateAsync(options)
    toast.success('Matches generated')
    setGenerateMatchesDialogOpen(false)
  }

  const onOpenSeedEditor = () => {
    if (tournament) {
      // Initialize editing seeds from current team data
      const seeds = tournament.teams.map((team, index) => ({
        id: team.id,
        name: team.name,
        seed: team.seed ?? index + 1,
      }))
      // Sort by current seed
      seeds.sort((a, b) => a.seed - b.seed)
      setEditingSeeds(seeds)
      setSeedEditorOpen(true)
    }
  }

  const onSaveSeedsConfirm = async () => {
    const seedUpdates = editingSeeds.map((team, index) => ({
      teamId: team.id,
      seed: index + 1, // Position in list = new seed
    }))
    await updateSeedsMutation.mutateAsync(seedUpdates)
    toast.success('Seeds updated')
    setSeedEditorOpen(false)
  }

  const moveTeamUp = (index: number) => {
    if (index === 0) return
    setEditingSeeds((prev) => {
      const newSeeds = [...prev]
      const temp = newSeeds[index - 1]
      const current = newSeeds[index]
      if (temp && current) {
        newSeeds[index - 1] = current
        newSeeds[index] = temp
      }
      return newSeeds
    })
  }

  const moveTeamDown = (index: number) => {
    setEditingSeeds((prev) => {
      if (index >= prev.length - 1) return prev
      const newSeeds = [...prev]
      const temp = newSeeds[index + 1]
      const current = newSeeds[index]
      if (temp && current) {
        newSeeds[index + 1] = current
        newSeeds[index] = temp
      }
      return newSeeds
    })
  }

  const onStartTournament = async () => {
    await updateTournamentMutation.mutateAsync({ status: 'IN_PROGRESS' })
    toast.success('Tournament started')
  }

  const onCreateMatch = async (data: CreateMatch) => {
    await createMatchMutation.mutateAsync(data)
    toast.success('Match created')
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
          <p className="text-center text-muted-foreground">Tournament not found</p>
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
            <CardDescription>Enter the admin password to manage {tournament.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => void passwordForm.handleSubmit(onPasswordSubmit)(e)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...passwordForm.register('password')} />
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
  const canStart = tournament.status === 'DRAFT' && tournament.matches.length > 0

  // Filter knockout matches for bracket editor
  const knockoutMatches = tournament.matches.filter((m) =>
    ['ROUND_OF_16', 'QUARTERFINAL', 'SEMIFINAL', 'FINAL', 'THIRD_PLACE'].includes(m.stage)
  )

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
                {tournament.teams.length >= 2 && (
                  <Button variant="outline" size="sm" onClick={onOpenSeedEditor}>
                    Edit Seeds
                  </Button>
                )}
                <Dialog open={bulkAddOpen} onOpenChange={setBulkAddOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Multiple Teams</DialogTitle>
                      <DialogDescription>Enter one team name per line</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => void bulkForm.handleSubmit(onBulkAdd)(e)}>
                      <Textarea
                        placeholder="Team 1&#10;Team 2&#10;Team 3"
                        rows={6}
                        {...bulkForm.register('teams')}
                      />
                      <DialogFooter className="mt-4">
                        <Button type="submit" disabled={addTeamsBulkMutation.isPending}>
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
                        <Button type="submit" disabled={addTeamMutation.isPending}>
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
              <p className="text-center text-muted-foreground py-4">No teams added yet</p>
            ) : (
              <div className="space-y-2">
                {tournament.teams.map((team, index) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-6">
                        #{team.seed ?? index + 1}
                      </span>
                      <div>
                        <span className="font-medium">{team.name}</span>
                        {team.shortName !== null && (
                          <span className="ml-2 text-muted-foreground">({team.shortName})</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        onDeleteTeamClick(team.id)
                      }}
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
                onClick={onGenerateMatchesClick}
                disabled={!canGenerateMatches || generateMatchesMutation.isPending}
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {tournament.matches.length > 0 ? 'Regenerate Matches' : 'Generate Matches'}
              </Button>
              {!canGenerateMatches && (
                <p className="text-sm text-destructive">Add at least 2 teams to generate matches</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bracket Editor for Knockout Tournaments */}
        {knockoutMatches.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Bracket</CardTitle>
              <CardDescription>
                Assign teams to knockout matches. Click on a match to manage scoring.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BracketEditor
                matches={knockoutMatches}
                teams={tournament.teams}
                tournamentSlug={slug ?? ''}
                sport={{
                  periodName: tournament.sport.periodName,
                  pointsToWinPeriod: tournament.sport.pointsToWinPeriod ?? null,
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Matches */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Matches ({tournament.matches.length})</CardTitle>
                <CardDescription>
                  Click on a match to manage scoring. Hover over scheduled matches to edit or
                  delete.
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

      <ConfirmDialog
        open={deleteTeamId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTeamId(null)
        }}
        title="Delete Team"
        description="Are you sure you want to delete this team? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => void onDeleteTeamConfirm()}
        variant="destructive"
        isPending={deleteTeamMutation.isPending}
      />

      {/* Generate Matches Config Dialog */}
      <Dialog open={generateMatchesDialogOpen} onOpenChange={setGenerateMatchesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Matches</DialogTitle>
            <DialogDescription>
              {tournament.matches.length > 0
                ? 'This will delete existing matches and generate new ones.'
                : 'Configure your tournament structure and generate matches.'}
            </DialogDescription>
          </DialogHeader>

          {tournament.format === 'GROUP_KNOCKOUT' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Number of Groups</Label>
                <Select
                  value={String(groupCount)}
                  onValueChange={(v) => {
                    setGroupCount(Number(v))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} Groups
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Teams Advancing Per Group</Label>
                <Select
                  value={String(advancingPerGroup)}
                  onValueChange={(v) => {
                    setAdvancingPerGroup(Number(v))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        Top {n} {n === 1 ? 'team' : 'teams'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Team Distribution</Label>
                <Select
                  value={useSeeding ? 'seeded' : 'random'}
                  onValueChange={(v) => {
                    setUseSeeding(v === 'seeded')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seeded">Seeded (pot-based)</SelectItem>
                    <SelectItem value="random">Random</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {useSeeding
                    ? 'Top seeds placed in different groups (e.g., seeds 1 & 2 never in same group)'
                    : 'Teams randomly shuffled into groups'}
                </p>
              </div>

              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">Preview:</p>
                <p className="text-muted-foreground">
                  {groupCount} groups with ~{Math.ceil(tournament.teams.length / groupCount)} teams
                  each
                </p>
                <p className="text-muted-foreground">
                  {groupCount * advancingPerGroup} teams advance to knockout stage
                </p>
              </div>
            </div>
          )}

          {tournament.format !== 'GROUP_KNOCKOUT' && (
            <div className="space-y-4">
              {tournament.format === 'SINGLE_ELIMINATION' && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Use Seeding</Label>
                    <p className="text-xs text-muted-foreground">
                      Apply seeded distribution when generating bracket
                    </p>
                  </div>
                  <Switch checked={useSeeding} onCheckedChange={setUseSeeding} />
                </div>
              )}
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="text-muted-foreground">
                  Format: {tournament.format.replace(/_/g, ' ')}
                </p>
                <p className="text-muted-foreground">{tournament.teams.length} teams</p>
                {tournament.format === 'SINGLE_ELIMINATION' && (
                  <p className="text-muted-foreground mt-2 text-xs">
                    {useSeeding
                      ? 'Top seeds will receive byes if fewer teams than bracket slots. Higher seeds face lower seeds.'
                      : 'Teams will be randomly placed in the bracket.'}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setGenerateMatchesDialogOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void onGenerateMatchesConfirm()}
              disabled={generateMatchesMutation.isPending}
            >
              {generateMatchesMutation.isPending ? 'Generating...' : 'Generate Matches'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seed Editor Dialog */}
      <Dialog open={seedEditorOpen} onOpenChange={setSeedEditorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Seeds</DialogTitle>
            <DialogDescription>
              Drag teams to reorder. Position determines seed (1 = top seed).
            </DialogDescription>
          </DialogHeader>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={editingSeeds.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {editingSeeds.map((team, index) => (
                  <SortableTeamItem
                    key={team.id}
                    id={team.id}
                    name={team.name}
                    index={index}
                    onMoveUp={() => {
                      moveTeamUp(index)
                    }}
                    onMoveDown={() => {
                      moveTeamDown(index)
                    }}
                    isFirst={index === 0}
                    isLast={index === editingSeeds.length - 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSeedEditorOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void onSaveSeedsConfirm()}
              disabled={updateSeedsMutation.isPending}
            >
              {updateSeedsMutation.isPending ? 'Saving...' : 'Save Seeds'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
