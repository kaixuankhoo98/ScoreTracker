import { Link } from 'react-router-dom'
import { getSetBasedDisplay } from '@/utils/scoreDisplay'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Team {
  id: string
  name: string
  shortName?: string | null
}

interface Match {
  id: string
  homeTeam: Team | null
  awayTeam: Team | null
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number
  awayScore: number
  homePeriodScores?: number[]
  awayPeriodScores?: number[]
  status: string
  winner?: Team | null
  isBye?: boolean
}

interface SportConfig {
  periodName: string
  pointsToWinPeriod: number | null
}

interface BracketMatchCardProps {
  match: Match
  mode: 'spectator' | 'admin'
  teams?: Team[]
  sport: SportConfig
  onAssignTeam?: (side: 'home' | 'away', teamId: string | null) => void
  tournamentSlug: string
}

export function BracketMatchCard({
  match,
  mode,
  teams = [],
  sport,
  onAssignTeam,
  tournamentSlug,
}: BracketMatchCardProps) {
  const isCompleted = match.status === 'COMPLETED'
  const isLive = match.status === 'LIVE'

  // Get set-based display data
  const setDisplay = getSetBasedDisplay(
    {
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homePeriodScores: match.homePeriodScores ?? [],
      awayPeriodScores: match.awayPeriodScores ?? [],
      status: match.status,
    },
    {
      pointsToWinPeriod: sport.pointsToWinPeriod ?? null,
      periodName: sport.periodName,
    }
  )

  const getScore = (side: 'home' | 'away') => {
    if (match.status === 'SCHEDULED') return '-'

    if (setDisplay.isSetBased) {
      const sets = side === 'home' ? setDisplay.setsWon.home : setDisplay.setsWon.away
      const currentPts = setDisplay.currentSetScore
        ? side === 'home'
          ? setDisplay.currentSetScore.home
          : setDisplay.currentSetScore.away
        : null

      if (currentPts !== null) {
        return `${String(sets)} (${String(currentPts)})`
      }
      return String(sets)
    }

    return side === 'home' ? String(match.homeScore) : String(match.awayScore)
  }

  const isWinner = (side: 'home' | 'away') => {
    if (!isCompleted || match.winner === null || match.winner === undefined) return false
    const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId
    return match.winner.id === teamId
  }

  const renderTeamRow = (side: 'home' | 'away') => {
    const team = side === 'home' ? match.homeTeam : match.awayTeam
    const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId
    const winner = isWinner(side)

    // Admin mode with TBD slot
    if (mode === 'admin' && team === null && onAssignTeam !== undefined) {
      return (
        <div className="flex items-center justify-between py-1">
          <Select
            value={teamId ?? '__TBD__'}
            onValueChange={(value) => {
              onAssignTeam(side, value === '__TBD__' ? null : value)
            }}
          >
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__TBD__">TBD</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.shortName ?? t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">-</span>
        </div>
      )
    }

    return (
      <div
        className={`flex items-center justify-between py-1 ${
          winner ? 'font-semibold text-green-600 dark:text-green-400' : ''
        }`}
      >
        <span className="truncate text-sm">
          {team?.shortName ?? team?.name ?? (match.isBye === true ? 'BYE' : 'TBD')}
        </span>
        <span className={`ml-2 text-sm font-medium ${isLive ? 'text-red-500' : ''}`}>
          {getScore(side)}
        </span>
      </div>
    )
  }

  const cardContent = (
    <div
      className={`rounded-md border bg-card p-2 text-card-foreground shadow-sm transition-colors ${
        isLive ? 'border-red-500/50' : ''
      } ${mode === 'spectator' ? 'hover:bg-muted/50' : ''}`}
    >
      {isLive && (
        <div className="mb-1 flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          <span className="text-xs text-red-500">LIVE</span>
        </div>
      )}
      {renderTeamRow('home')}
      <div className="border-t my-0.5" />
      {renderTeamRow('away')}
    </div>
  )

  if (mode === 'spectator') {
    return <Link to={`/tournaments/${tournamentSlug}/matches/${match.id}`}>{cardContent}</Link>
  }

  // Admin mode - wrap with link to scoring page if match has teams assigned
  if (match.homeTeam !== null || match.awayTeam !== null) {
    return (
      <Link to={`/tournaments/${tournamentSlug}/admin/matches/${match.id}`}>{cardContent}</Link>
    )
  }

  return cardContent
}
