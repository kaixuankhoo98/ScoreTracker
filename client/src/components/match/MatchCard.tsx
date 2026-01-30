import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Team } from '@shared/schemas'

interface MatchCardProps {
  match: {
    id: string
    homeTeamId: string | null
    awayTeamId: string | null
    homeScore: number
    awayScore: number
    status: string
    stage: string
    round: number
    matchNumber: number
    homeTeam: Team | null
    awayTeam: Team | null
    winner: Team | null
  }
  tournamentSlug: string
  sport: {
    periodName: string
  }
}

const statusVariants: Record<string, 'default' | 'secondary' | 'live' | 'success'> = {
  SCHEDULED: 'secondary',
  LIVE: 'live',
  PAUSED: 'warning' as 'default',
  COMPLETED: 'success',
  CANCELLED: 'default',
}

export function MatchCard({ match, tournamentSlug, sport: _sport }: MatchCardProps) {
  const isLive = match.status === 'LIVE'
  const isCompleted = match.status === 'COMPLETED'

  return (
    <Link to={`/tournaments/${tournamentSlug}/matches/${match.id}`}>
      <Card
        className={`transition-colors hover:bg-muted/50 ${
          isLive ? 'border-red-500/50' : ''
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <span
                  className={`font-medium ${
                    isCompleted && match.winner?.id === match.homeTeamId
                      ? 'text-green-600 dark:text-green-400'
                      : ''
                  }`}
                >
                  {match.homeTeam?.name ?? 'TBD'}
                </span>
                <span
                  className={`text-xl font-bold ${
                    isLive ? 'text-red-500' : ''
                  }`}
                >
                  {match.homeScore}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`font-medium ${
                    isCompleted && match.winner?.id === match.awayTeamId
                      ? 'text-green-600 dark:text-green-400'
                      : ''
                  }`}
                >
                  {match.awayTeam?.name ?? 'TBD'}
                </span>
                <span
                  className={`text-xl font-bold ${
                    isLive ? 'text-red-500' : ''
                  }`}
                >
                  {match.awayScore}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {match.stage.replace('_', ' ')} - Match {match.matchNumber}
            </span>
            <Badge variant={statusVariants[match.status] ?? 'default'}>
              {isLive && (
                <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              )}
              {match.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
