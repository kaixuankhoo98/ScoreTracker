import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getSetBasedDisplay } from '@/utils/scoreDisplay'

interface MatchScoreboardProps {
  match: {
    homeTeam: { name: string; shortName?: string | null } | null
    awayTeam: { name: string; shortName?: string | null } | null
    homeScore: number
    awayScore: number
    homePeriodScores: number[]
    awayPeriodScores: number[]
    currentPeriod: number
    status: string
    winner?: { id: string } | null
    homeTeamId?: string | null
    awayTeamId?: string | null
  }
  sport: {
    periodName: string
    pointsToWinPeriod: number | null
  }
  variant?: 'large' | 'compact'
  showPeriodBreakdown?: boolean
  showStatusBadge?: boolean
  isSubscribed?: boolean
}

export function MatchScoreboard({
  match,
  sport,
  variant = 'large',
  showPeriodBreakdown = true,
  showStatusBadge = true,
  isSubscribed = false,
}: MatchScoreboardProps) {
  const isLive = match.status === 'LIVE'
  const isCompleted = match.status === 'COMPLETED'

  // Get set-based display data
  const setDisplay = getSetBasedDisplay(
    {
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homePeriodScores: match.homePeriodScores,
      awayPeriodScores: match.awayPeriodScores,
      status: match.status,
    },
    {
      pointsToWinPeriod: sport.pointsToWinPeriod,
      periodName: sport.periodName,
    }
  )

  // For set-based sports in compact mode, show current set score
  const currentSetIndex = match.currentPeriod - 1
  const displayHomeScore = setDisplay.isSetBased
    ? (match.homePeriodScores[currentSetIndex] ?? 0)
    : match.homeScore
  const displayAwayScore = setDisplay.isSetBased
    ? (match.awayPeriodScores[currentSetIndex] ?? 0)
    : match.awayScore

  const getWinnerStyle = (side: 'home' | 'away') => {
    const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId
    if (isCompleted && match.winner?.id === teamId) {
      return 'text-green-600 dark:text-green-400'
    }
    return ''
  }

  if (variant === 'compact') {
    return (
      <Card>
        <CardContent className="pt-6">
          {/* Sets won indicator for set-based sports */}
          {setDisplay.isSetBased && (
            <div className="mb-4 flex justify-center gap-8 text-center">
              <div>
                <span className="text-2xl font-bold">{setDisplay.setsWon.home}</span>
              </div>
              <div className="text-sm text-muted-foreground self-center">
                {sport.periodName}s Won
              </div>
              <div>
                <span className="text-2xl font-bold">{setDisplay.setsWon.away}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <h2 className={`text-lg font-semibold ${getWinnerStyle('home')}`}>
                {match.homeTeam?.name ?? 'TBD'}
              </h2>
              <div className={`mt-2 text-5xl font-bold ${isLive ? 'text-red-500' : ''}`}>
                {displayHomeScore}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <span className="text-sm text-muted-foreground">
                {sport.periodName} {match.currentPeriod}
              </span>
              {isLive && (
                <div className="mt-1 flex items-center gap-1 text-red-500">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  <span className="text-sm font-medium">LIVE</span>
                </div>
              )}
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${getWinnerStyle('away')}`}>
                {match.awayTeam?.name ?? 'TBD'}
              </h2>
              <div className={`mt-2 text-5xl font-bold ${isLive ? 'text-red-500' : ''}`}>
                {displayAwayScore}
              </div>
            </div>
          </div>

          {/* Period scores for compact mode */}
          {showPeriodBreakdown && match.homePeriodScores.length > 1 && (
            <div className="mt-4 flex justify-center gap-4 text-sm text-muted-foreground">
              {match.homePeriodScores.slice(0, -1).map((score, i) => (
                <span key={i}>
                  {sport.periodName} {i + 1}: {score}-{match.awayPeriodScores[i] ?? 0}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Large variant (for spectator view)
  return (
    <Card className={isLive ? 'border-red-500/50 shadow-lg' : ''}>
      <CardContent className="pt-6">
        {showStatusBadge && (
          <div className="flex items-center justify-center gap-2">
            <Badge variant={isLive ? 'live' : isCompleted ? 'success' : 'secondary'}>
              {isLive && <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
              {match.status}
            </Badge>
            {isLive && isSubscribed && (
              <span className="text-xs text-muted-foreground">Real-time updates active</span>
            )}
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <h2 className={`text-xl font-bold ${getWinnerStyle('home')}`}>
              {match.homeTeam?.name ?? 'TBD'}
            </h2>
            {match.homeTeam?.shortName !== undefined && match.homeTeam.shortName !== null && (
              <p className="text-sm text-muted-foreground">{match.homeTeam.shortName}</p>
            )}
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="text-sm text-muted-foreground">
              {sport.periodName} {match.currentPeriod}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className={`text-xl font-bold ${getWinnerStyle('away')}`}>
              {match.awayTeam?.name ?? 'TBD'}
            </h2>
            {match.awayTeam?.shortName !== undefined && match.awayTeam.shortName !== null && (
              <p className="text-sm text-muted-foreground">{match.awayTeam.shortName}</p>
            )}
          </div>
        </div>

        {/* Big Score Display */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center">
            <div
              className={`text-7xl font-bold ${
                isLive ? 'text-red-500' : ''
              } transition-all duration-300`}
            >
              {setDisplay.isSetBased ? setDisplay.setsWon.home : match.homeScore}
            </div>
            {setDisplay.isSetBased && setDisplay.currentSetScore !== null && (
              <div className="mt-1 text-2xl text-muted-foreground">
                ({setDisplay.currentSetScore.home})
              </div>
            )}
          </div>
          <div className="flex items-center justify-center text-3xl text-muted-foreground">-</div>
          <div className="flex flex-col items-center">
            <div
              className={`text-7xl font-bold ${
                isLive ? 'text-red-500' : ''
              } transition-all duration-300`}
            >
              {setDisplay.isSetBased ? setDisplay.setsWon.away : match.awayScore}
            </div>
            {setDisplay.isSetBased && setDisplay.currentSetScore !== null && (
              <div className="mt-1 text-2xl text-muted-foreground">
                ({setDisplay.currentSetScore.away})
              </div>
            )}
          </div>
        </div>

        {/* Period Scores */}
        {showPeriodBreakdown && match.homePeriodScores.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div />
              <div className="font-medium text-muted-foreground">{sport.periodName}s</div>
              <div />
            </div>
            {match.homePeriodScores.map((homeScore, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="font-medium">{homeScore}</div>
                <div className="text-muted-foreground">
                  {sport.periodName} {i + 1}
                </div>
                <div className="font-medium">{match.awayPeriodScores[i] ?? 0}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
