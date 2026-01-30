import { Link } from 'react-router-dom'
import { Plus, Trophy, Users, Calendar } from 'lucide-react'
import { useTournaments } from '@/api/tournaments'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'live'> = {
  DRAFT: 'secondary',
  REGISTRATION: 'warning',
  IN_PROGRESS: 'live',
  COMPLETED: 'success',
  CANCELLED: 'destructive' as 'default',
}

export function HomePage() {
  const { data, isLoading, error } = useTournaments()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
          <p className="text-muted-foreground">
            Create and manage your sports tournaments
          </p>
        </div>
        <Button asChild>
          <Link to="/tournaments/new">
            <Plus className="mr-2 h-4 w-4" />
            New Tournament
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error instanceof Error ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Failed to load tournaments: {error.message}
            </p>
          </CardContent>
        </Card>
      ) : data?.tournaments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No tournaments yet</h3>
            <p className="mt-2 text-center text-muted-foreground">
              Create your first tournament to get started
            </p>
            <Button asChild className="mt-4">
              <Link to="/tournaments/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Tournament
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.tournaments.map((tournament) => (
            <Link
              key={tournament.id}
              to={`/tournaments/${tournament.slug}`}
              className="block"
            >
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="line-clamp-1">
                        {tournament.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-1">
                        {tournament.sport.name} - {tournament.format.replace('_', ' ')}
                      </CardDescription>
                    </div>
                    <Badge variant={statusColors[tournament.status] ?? 'default'}>
                      {tournament.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{tournament._count.teams} teams</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{tournament._count.matches} matches</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
