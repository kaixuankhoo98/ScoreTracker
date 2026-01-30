import { Link, useParams } from 'react-router-dom'
import { Settings, Share2, Users, Calendar } from 'lucide-react'
import { useTournament } from '@/api/tournaments'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MatchCard } from '@/components/match/MatchCard'
import { StandingsTable } from '@/components/tournament/StandingsTable'

const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'live'> = {
  DRAFT: 'secondary',
  REGISTRATION: 'warning',
  IN_PROGRESS: 'live',
  COMPLETED: 'success',
  CANCELLED: 'default',
}

export function TournamentPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: tournament, isLoading, error } = useTournament(slug ?? '')

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share !== undefined) {
      try {
        await navigator.share({
          title: tournament?.name ?? 'Tournament',
          url,
        })
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (error instanceof Error || tournament === undefined) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            {error instanceof Error
              ? `Failed to load tournament: ${error.message}`
              : 'Tournament not found'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const liveMatches = tournament.matches.filter((m) => m.status === 'LIVE')
  const upcomingMatches = tournament.matches.filter((m) => m.status === 'SCHEDULED')
  const completedMatches = tournament.matches.filter((m) => m.status === 'COMPLETED')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {tournament.name}
            </h1>
            <Badge variant={statusColors[tournament.status] ?? 'default'}>
              {tournament.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {tournament.sport.name} - {tournament.format.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void handleShare()}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button asChild size="sm">
            <Link to={`/tournaments/${slug ?? ''}/admin`}>
              <Settings className="mr-2 h-4 w-4" />
              Admin
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Teams</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="h-5 w-5 text-muted-foreground" />
              {tournament.teams.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Matches</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              {tournament.matches.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Live Now</CardDescription>
            <CardTitle className="text-2xl">
              {liveMatches.length > 0 ? (
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  {liveMatches.length} match{liveMatches.length > 1 ? 'es' : ''}
                </span>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {liveMatches.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Live Matches
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {liveMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                tournamentSlug={slug ?? ''}
                sport={tournament.sport}
              />
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="matches">
        <TabsList>
          <TabsTrigger value="matches">All Matches</TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="space-y-4">
          {tournament.matches.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No matches scheduled yet. Add teams and generate matches from
                the admin panel.
              </CardContent>
            </Card>
          ) : (
            <>
              {upcomingMatches.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium">Upcoming</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {upcomingMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        tournamentSlug={slug ?? ''}
                        sport={tournament.sport}
                      />
                    ))}
                  </div>
                </div>
              )}
              {completedMatches.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium">Completed</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {completedMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        tournamentSlug={slug ?? ''}
                        sport={tournament.sport}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="standings">
          <StandingsTable
            teams={tournament.teams}
            matches={tournament.matches}
            groups={tournament.groups}
          />
        </TabsContent>

        <TabsContent value="teams">
          {tournament.teams.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No teams added yet. Add teams from the admin panel.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {tournament.teams.map((team) => (
                <Card key={team.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    {team.shortName !== null && (
                      <CardDescription>{team.shortName}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
