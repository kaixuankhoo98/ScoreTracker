import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Share2, Wifi, WifiOff } from 'lucide-react'
import { useMatch } from '@/api/matches'
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
import { MatchScoreboard } from '@/components/match/MatchScoreboard'

export function MatchViewPage() {
  const { slug, matchId } = useParams<{ slug: string; matchId: string }>()
  const { data: match, isLoading } = useMatch(matchId ?? '')
  const { isSubscribed, isConnected, subscribe, lastEvent } =
    useMatchSubscription(matchId ?? '')

  // Auto-subscribe when viewing a live match
  useState(() => {
    if (matchId !== undefined && matchId.length > 0) {
      subscribe()
    }
  })

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share !== undefined) {
      try {
        await navigator.share({
          title: `${match?.homeTeam?.name ?? 'TBD'} vs ${match?.awayTeam?.name ?? 'TBD'}`,
          text: `Watch the live score!`,
          url,
        })
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (match === undefined) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Match not found</p>
        </CardContent>
      </Card>
    )
  }

  const sport = match.tournament.sport
  const isLive = match.status === 'LIVE'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/tournaments/${slug ?? ''}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">
              {match.tournament.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {match.stage.replace('_', ' ')} - Match #{match.matchNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          )}
          <Button variant="ghost" size="icon" onClick={() => void handleShare()}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Scoreboard */}
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
        variant="large"
        isSubscribed={isSubscribed}
      />

      {/* Recent Events */}
      {match.scoreEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Scoring</CardTitle>
            <CardDescription>Latest scoring events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {match.scoreEvents.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        event.teamSide === 'HOME' ? 'default' : 'secondary'
                      }
                    >
                      {event.teamSide === 'HOME'
                        ? match.homeTeam?.shortName ?? 'HOME'
                        : match.awayTeam?.shortName ?? 'AWAY'}
                    </Badge>
                    <span className="text-sm">{event.action}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">+{event.points}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {sport.periodName} {event.period}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live indicator animation when events happen */}
      {lastEvent !== null && isLive && (
        <div className="fixed bottom-4 right-4">
          <div className="animate-bounce rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white shadow-lg">
            Score Updated!
          </div>
        </div>
      )}
    </div>
  )
}
