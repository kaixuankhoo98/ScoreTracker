import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Team } from '@shared/schemas'
import { getSetBasedDisplay } from '@/utils/scoreDisplay'

interface MatchCardProps {
  match: {
    id: string
    homeTeamId: string | null
    awayTeamId: string | null
    homeScore: number
    awayScore: number
    homePeriodScores?: number[]
    awayPeriodScores?: number[]
    status: string
    stage: string
    round: number
    matchNumber: number
    homeTeam: Team | null
    awayTeam: Team | null
    winner: Team | null
    isBye?: boolean
  }
  tournamentSlug: string
  sport: {
    periodName: string
    pointsToWinPeriod?: number | null
  }
}

const statusVariants: Record<string, 'default' | 'secondary' | 'live' | 'success'> = {
  SCHEDULED: 'secondary',
  LIVE: 'live',
  PAUSED: 'warning' as 'default',
  COMPLETED: 'success',
  CANCELLED: 'default',
}

export function MatchCard({ match, tournamentSlug, sport }: MatchCardProps) {
  const isLive = match.status === 'LIVE'
  const isCompleted = match.status === 'COMPLETED'

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

  // Render score based on whether it's set-based
  const renderScore = (side: 'home' | 'away') => {
    const score = side === 'home' ? match.homeScore : match.awayScore

    if (setDisplay.isSetBased) {
      const setsWon = side === 'home' ? setDisplay.setsWon.home : setDisplay.setsWon.away
      const currentSetPts = setDisplay.currentSetScore
        ? side === 'home'
          ? setDisplay.currentSetScore.home
          : setDisplay.currentSetScore.away
        : null

      return (
        <span className="flex items-center gap-2">
          <span className={`text-xl font-bold ${isLive ? 'text-red-500' : ''}`}>{setsWon}</span>
          {currentSetPts !== null && (
            <span className="text-sm text-muted-foreground">({currentSetPts})</span>
          )}
        </span>
      )
    }

    return <span className={`text-xl font-bold ${isLive ? 'text-red-500' : ''}`}>{score}</span>
  }

  // Determine team name styling
  const getTeamStyle = (side: 'home' | 'away') => {
    const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId
    const isWinner = isCompleted && match.winner?.id === teamId

    // For set-based sports, highlight previous set winner
    const wonPreviousSet = setDisplay.isSetBased && isLive && setDisplay.previousSetWinner === side

    if (isWinner) {
      return 'font-medium text-green-600 dark:text-green-400'
    }
    if (wonPreviousSet) {
      return 'font-medium text-green-600 dark:text-green-400'
    }
    return 'font-medium'
  }

  return (
    <Link to={`/tournaments/${tournamentSlug}/matches/${match.id}`}>
      <Card className={`transition-colors hover:bg-muted/50 ${isLive ? 'border-red-500/50' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <span className={getTeamStyle('home')}>
                  {match.homeTeam?.name ?? (match.isBye === true ? 'BYE' : 'TBD')}
                </span>
                {renderScore('home')}
              </div>
              <div className="flex items-center justify-between">
                <span className={getTeamStyle('away')}>
                  {match.awayTeam?.name ?? (match.isBye === true ? 'BYE' : 'TBD')}
                </span>
                {renderScore('away')}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {match.stage.replace('_', ' ')} - Match {match.matchNumber}
            </span>
            <Badge variant={statusVariants[match.status] ?? 'default'}>
              {isLive && <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
              {match.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
