import { KnockoutBracket } from '@/components/tournament/KnockoutBracket'
import { useUpdateMatchById } from '@/api/matches'

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
  stage: string
  round: number
  matchNumber: number
  winner?: Team | null
}

interface SportConfig {
  periodName: string
  pointsToWinPeriod: number | null
}

interface BracketEditorProps {
  matches: Match[]
  teams: Team[]
  tournamentSlug: string
  sport: SportConfig
}

export function BracketEditor({
  matches,
  teams,
  tournamentSlug,
  sport,
}: BracketEditorProps) {
  const updateMatchMutation = useUpdateMatchById(tournamentSlug)

  const handleAssignTeam = async (
    matchId: string,
    side: 'home' | 'away',
    teamId: string | null
  ) => {
    const match = matches.find((m) => m.id === matchId)
    if (match === undefined) return

    await updateMatchMutation.mutateAsync({
      matchId,
      data: {
        homeTeamId: side === 'home' ? teamId : match.homeTeamId,
        awayTeamId: side === 'away' ? teamId : match.awayTeamId,
      },
    })
  }

  return (
    <KnockoutBracket
      matches={matches}
      teams={teams}
      mode="admin"
      tournamentSlug={tournamentSlug}
      sport={sport}
      onAssignTeam={(matchId, side, teamId) => void handleAssignTeam(matchId, side, teamId)}
    />
  )
}
