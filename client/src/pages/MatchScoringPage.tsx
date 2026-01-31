import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Undo2,
  SkipForward,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useMatch,
  useStartMatch,
  usePauseMatch,
  useEndMatch,
  useAddScore,
  useUndoScore,
  useNextPeriod,
} from '@/api/matches'
import { useTournamentAuth } from '@/hooks/useTournamentAuth'
import { useMatchSubscription } from '@/hooks/useMatchSubscription'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { MatchScoreboard } from '@/components/match/MatchScoreboard'

export function MatchScoringPage() {
  const { slug, matchId } = useParams<{ slug: string; matchId: string }>()
  const { data: match, isLoading } = useMatch(matchId ?? '')
  const { isAuthenticated, isVerifying, login } = useTournamentAuth(slug ?? '')
  const { subscribe } = useMatchSubscription(matchId ?? '')

  const startMutation = useStartMatch(matchId ?? '', slug)
  const pauseMutation = usePauseMatch(matchId ?? '', slug)
  const endMutation = useEndMatch(matchId ?? '', slug)
  const scoreMutation = useAddScore(matchId ?? '')
  const undoMutation = useUndoScore(matchId ?? '')
  const nextPeriodMutation = useNextPeriod(matchId ?? '')

  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [endMatchDialogOpen, setEndMatchDialogOpen] = useState(false)

  // Subscribe to real-time updates when component mounts
  useState(() => {
    if (matchId !== undefined && matchId.length > 0) {
      subscribe()
    }
  })

  const handleLogin = async () => {
    setPasswordError('')
    const success = await login(password)
    if (!success) {
      setPasswordError('Invalid password')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (match === undefined) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Match not found</p>
        </CardContent>
      </Card>
    )
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>
              Enter the admin password to score this match
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleLogin()
                  }
                }}
              />
              {passwordError.length > 0 && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>
            <Button
              onClick={() => void handleLogin()}
              disabled={isVerifying}
              className="w-full"
            >
              {isVerifying ? 'Verifying...' : 'Login'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sport = match.tournament.sport
  const isLive = match.status === 'LIVE'
  const isScheduled = match.status === 'SCHEDULED'
  const isPaused = match.status === 'PAUSED'
  const isCompleted = match.status === 'COMPLETED'

  const handleScore = async (teamSide: 'HOME' | 'AWAY', points: number, action: string) => {
    await scoreMutation.mutateAsync({ teamSide, points, action })
  }

  const handleStart = async () => {
    await startMutation.mutateAsync()
    toast.success('Match started')
  }

  const handlePause = async () => {
    await pauseMutation.mutateAsync()
  }

  const handleEndClick = () => {
    setEndMatchDialogOpen(true)
  }

  const handleEndConfirm = async () => {
    await endMutation.mutateAsync()
    toast.success('Match ended')
    setEndMatchDialogOpen(false)
  }

  const handleUndo = async () => {
    await undoMutation.mutateAsync()
    toast.success('Score undone')
  }

  const handleNextPeriod = async () => {
    await nextPeriodMutation.mutateAsync()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/tournaments/${slug ?? ''}/admin`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Match Scoring</h1>
          <p className="text-sm text-muted-foreground">
            {match.tournament.name} - Match #{match.matchNumber}
          </p>
        </div>
        <Badge
          variant={
            isLive ? 'live' : isCompleted ? 'success' : 'secondary'
          }
        >
          {match.status}
        </Badge>
      </div>

      {/* Scoreboard */}
      <MatchScoreboard
        match={{
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          homePeriodScores: match.homePeriodScores ?? [],
          awayPeriodScores: match.awayPeriodScores ?? [],
          currentPeriod: match.currentPeriod,
          status: match.status,
          winner: match.winner,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
        }}
        sport={{
          periodName: sport.periodName,
          pointsToWinPeriod: sport.pointsToWinPeriod ?? null,
        }}
        variant="compact"
        showStatusBadge={false}
      />

      {/* Match Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Match Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {(isScheduled || isPaused) && (
            <Button onClick={() => void handleStart()} disabled={startMutation.isPending}>
              <Play className="mr-2 h-4 w-4" />
              {isPaused ? 'Resume' : 'Start Match'}
            </Button>
          )}
          {isLive && (
            <>
              <Button
                variant="outline"
                onClick={() => void handlePause()}
                disabled={pauseMutation.isPending}
              >
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
              <Button
                variant="destructive"
                onClick={handleEndClick}
                disabled={endMutation.isPending}
              >
                <Square className="mr-2 h-4 w-4" />
                End Match
              </Button>
            </>
          )}
          {(isLive || isPaused) && match.currentPeriod < sport.periods && (
            <Button
              variant="outline"
              onClick={() => void handleNextPeriod()}
              disabled={nextPeriodMutation.isPending}
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Next {sport.periodName}
            </Button>
          )}
          {(isLive || isPaused) && (
            <Button
              variant="outline"
              onClick={() => void handleUndo()}
              disabled={undoMutation.isPending}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Undo Last
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Scoring Buttons */}
      {isLive && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Home Team Scoring */}
          <Card>
            <CardHeader>
              <CardTitle>{match.homeTeam?.name ?? 'Home'}</CardTitle>
              <CardDescription>Add points</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {sport.scoreIncrements.map((points, i) => (
                  <Button
                    key={points}
                    size="lg"
                    className="h-16 text-lg"
                    onClick={() =>
                      void handleScore(
                        'HOME',
                        points,
                        sport.scoreLabels[i] ?? `${points} Point`
                      )
                    }
                    disabled={scoreMutation.isPending}
                  >
                    +{points} ({sport.scoreLabels[i] ?? `${points} Point`})
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Away Team Scoring */}
          <Card>
            <CardHeader>
              <CardTitle>{match.awayTeam?.name ?? 'Away'}</CardTitle>
              <CardDescription>Add points</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {sport.scoreIncrements.map((points, i) => (
                  <Button
                    key={points}
                    size="lg"
                    variant="secondary"
                    className="h-16 text-lg"
                    onClick={() =>
                      void handleScore(
                        'AWAY',
                        points,
                        sport.scoreLabels[i] ?? `${points} Point`
                      )
                    }
                    disabled={scoreMutation.isPending}
                  >
                    +{points} ({sport.scoreLabels[i] ?? `${points} Point`})
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Score Events */}
      {match.scoreEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {match.scoreEvents.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {event.teamSide === 'HOME'
                      ? match.homeTeam?.name
                      : match.awayTeam?.name}{' '}
                    - {event.action}
                  </span>
                  <span className="text-muted-foreground">
                    +{event.points} ({sport.periodName} {event.period})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={endMatchDialogOpen}
        onOpenChange={setEndMatchDialogOpen}
        title="End Match"
        description="Are you sure you want to end this match? This action cannot be undone."
        confirmLabel="End Match"
        onConfirm={() => void handleEndConfirm()}
        variant="destructive"
        isPending={endMutation.isPending}
      />
    </div>
  )
}
