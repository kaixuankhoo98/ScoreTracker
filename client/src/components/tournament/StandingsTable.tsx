import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Team } from '@shared/schemas'

interface StandingsTableProps {
  teams: Team[]
  matches: {
    homeTeamId: string | null
    awayTeamId: string | null
    homeScore: number
    awayScore: number
    status: string
    winner: { id: string } | null
  }[]
  groups: {
    id: string
    name: string
    teams: Team[]
  }[]
}

interface TeamStanding {
  team: Team
  played: number
  won: number
  lost: number
  drawn: number
  pointsFor: number
  pointsAgainst: number
  points: number
}

function calculateStandings(
  teams: Team[],
  matches: StandingsTableProps['matches']
): TeamStanding[] {
  const standings = new Map<string, TeamStanding>()

  // Initialize standings for all teams
  for (const team of teams) {
    standings.set(team.id, {
      team,
      played: 0,
      won: 0,
      lost: 0,
      drawn: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      points: 0,
    })
  }

  // Process completed matches
  for (const match of matches) {
    if (match.status !== 'COMPLETED') continue
    if (match.homeTeamId === null || match.awayTeamId === null) continue

    const homeStanding = standings.get(match.homeTeamId)
    const awayStanding = standings.get(match.awayTeamId)

    if (homeStanding === undefined || awayStanding === undefined) continue

    // Update games played
    homeStanding.played++
    awayStanding.played++

    // Update points for/against
    homeStanding.pointsFor += match.homeScore
    homeStanding.pointsAgainst += match.awayScore
    awayStanding.pointsFor += match.awayScore
    awayStanding.pointsAgainst += match.homeScore

    // Update win/loss/draw
    if (match.homeScore > match.awayScore) {
      homeStanding.won++
      homeStanding.points += 3
      awayStanding.lost++
    } else if (match.awayScore > match.homeScore) {
      awayStanding.won++
      awayStanding.points += 3
      homeStanding.lost++
    } else {
      homeStanding.drawn++
      awayStanding.drawn++
      homeStanding.points += 1
      awayStanding.points += 1
    }
  }

  // Sort by points, then point differential, then points for
  return Array.from(standings.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const diffA = a.pointsFor - a.pointsAgainst
    const diffB = b.pointsFor - b.pointsAgainst
    if (diffB !== diffA) return diffB - diffA
    return b.pointsFor - a.pointsFor
  })
}

function StandingsTableContent({ standings }: { standings: TeamStanding[] }) {
  if (standings.length === 0) {
    return <p className="py-4 text-center text-muted-foreground">No teams in this group</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="pb-2 text-left font-medium">#</th>
            <th className="pb-2 text-left font-medium">Team</th>
            <th className="pb-2 text-center font-medium">P</th>
            <th className="pb-2 text-center font-medium">W</th>
            <th className="pb-2 text-center font-medium">L</th>
            <th className="pb-2 text-center font-medium">D</th>
            <th className="pb-2 text-center font-medium">PF</th>
            <th className="pb-2 text-center font-medium">PA</th>
            <th className="pb-2 text-center font-medium">+/-</th>
            <th className="pb-2 text-center font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing, index) => (
            <tr key={standing.team.id} className="border-b last:border-0">
              <td className="py-2 text-muted-foreground">{index + 1}</td>
              <td className="py-2 font-medium">{standing.team.name}</td>
              <td className="py-2 text-center">{standing.played}</td>
              <td className="py-2 text-center">{standing.won}</td>
              <td className="py-2 text-center">{standing.lost}</td>
              <td className="py-2 text-center">{standing.drawn}</td>
              <td className="py-2 text-center">{standing.pointsFor}</td>
              <td className="py-2 text-center">{standing.pointsAgainst}</td>
              <td className="py-2 text-center">
                {standing.pointsFor - standing.pointsAgainst >= 0 ? '+' : ''}
                {standing.pointsFor - standing.pointsAgainst}
              </td>
              <td className="py-2 text-center font-bold">{standing.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StandingsTable({ teams, matches, groups }: StandingsTableProps) {
  // If there are groups, show standings per group
  if (groups.length > 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => {
          const groupTeamIds = new Set(group.teams.map((t) => t.id))
          const groupMatches = matches.filter(
            (m) =>
              m.homeTeamId !== null &&
              m.awayTeamId !== null &&
              groupTeamIds.has(m.homeTeamId) &&
              groupTeamIds.has(m.awayTeamId)
          )
          const standings = calculateStandings(group.teams, groupMatches)

          return (
            <Card key={group.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{group.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <StandingsTableContent standings={standings} />
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // No groups - show overall standings
  const standings = calculateStandings(teams, matches)

  if (standings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No standings to display. Add teams and complete matches to see standings.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <StandingsTableContent standings={standings} />
      </CardContent>
    </Card>
  )
}
