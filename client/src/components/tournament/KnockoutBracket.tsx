import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bracket,
  Seed,
  SeedItem,
  SeedTeam,
  type IRoundProps,
  type IRenderSeedProps,
} from 'react-brackets'
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
  stage: string
  round: number
  matchNumber: number
  winner?: Team | null
}

interface SportConfig {
  periodName: string
  pointsToWinPeriod: number | null
}

interface KnockoutBracketProps {
  matches: Match[]
  teams?: Team[]
  mode: 'spectator' | 'admin'
  tournamentSlug: string
  sport: SportConfig
  onAssignTeam?: (matchId: string, side: 'home' | 'away', teamId: string | null) => void
}

// Define the order of stages for proper bracket layout
const STAGE_ORDER = [
  'ROUND_OF_16',
  'QUARTERFINAL',
  'SEMIFINAL',
  'FINAL',
]

const STAGE_LABELS: Record<string, string> = {
  ROUND_OF_16: 'Round of 16',
  QUARTERFINAL: 'Quarterfinals',
  SEMIFINAL: 'Semifinals',
  FINAL: 'Final',
  THIRD_PLACE: '3rd Place',
}

export function KnockoutBracket({
  matches,
  teams = [],
  mode,
  tournamentSlug,
  sport,
  onAssignTeam,
}: KnockoutBracketProps) {
  // Transform matches to library format
  const { bracketRounds, thirdPlaceMatch } = useMemo(() => {
    // Separate third place match
    const thirdPlace = matches.find(m => m.stage === 'THIRD_PLACE') ?? null
    const bracketMatchList = matches.filter(m => m.stage !== 'THIRD_PLACE')

    // Group matches by stage
    const stageGroups: Record<string, Match[]> = {}
    for (const match of bracketMatchList) {
      if (stageGroups[match.stage] === undefined) {
        stageGroups[match.stage] = []
      }
      stageGroups[match.stage]!.push(match)
    }

    // Sort matches within each stage by matchNumber
    for (const stage of Object.keys(stageGroups)) {
      stageGroups[stage]!.sort((a, b) => a.matchNumber - b.matchNumber)
    }

    // Build rounds in order
    const rounds: IRoundProps[] = []
    for (const stage of STAGE_ORDER) {
      const stageMatches = stageGroups[stage]
      if (stageMatches && stageMatches.length > 0) {
        rounds.push({
          title: STAGE_LABELS[stage] ?? stage,
          seeds: stageMatches.map(match => ({
            id: match.id,
            teams: [
              {
                name: match.homeTeam?.shortName ?? match.homeTeam?.name ?? 'TBD',
                id: match.homeTeamId,
                team: match.homeTeam,
              },
              {
                name: match.awayTeam?.shortName ?? match.awayTeam?.name ?? 'TBD',
                id: match.awayTeamId,
                team: match.awayTeam,
              },
            ],
            // Store original match for custom rendering
            match,
          })),
        })
      }
    }

    return {
      bracketRounds: rounds,
      thirdPlaceMatch: thirdPlace,
    }
  }, [matches])

  // Custom seed component - IMPORTANT: Seed must be the root element for connectors to work
  const CustomSeed = ({ seed, breakpoint }: IRenderSeedProps) => {
    const match = seed.match as Match | undefined
    if (!match) return null

    const isLive = match.status === 'LIVE'
    const isCompleted = match.status === 'COMPLETED'

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
        return String(sets)
      }
      return side === 'home' ? String(match.homeScore) : String(match.awayScore)
    }

    const isWinner = (side: 'home' | 'away') => {
      if (!isCompleted || !match.winner) return false
      const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId
      return match.winner.id === teamId
    }

    const canAssign = mode === 'admin' && onAssignTeam

    const renderTeamRow = (side: 'home' | 'away') => {
      const team = side === 'home' ? match.homeTeam : match.awayTeam
      const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId
      const winner = isWinner(side)

      // Admin mode with TBD slot - show team selector
      if (canAssign && team === null) {
        return (
          <SeedTeam className="!bg-card !text-foreground !justify-between !px-2">
            <Select
              value={teamId ?? '__TBD__'}
              onValueChange={(value) => onAssignTeam!(match.id, side, value === '__TBD__' ? null : value)}
            >
              <SelectTrigger className="h-6 w-24 text-xs border-0 bg-transparent p-0">
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
          </SeedTeam>
        )
      }

      return (
        <SeedTeam
          className={`!bg-card !text-foreground !justify-between !px-2 ${
            winner ? '!font-semibold !text-green-600 dark:!text-green-400' : ''
          }`}
        >
          <span className="truncate text-xs">
            {team?.shortName ?? team?.name ?? 'TBD'}
          </span>
          <span className={`ml-2 text-xs font-medium ${isLive ? 'text-red-500' : ''}`}>
            {getScore(side)}
          </span>
        </SeedTeam>
      )
    }

    // Determine link URL
    const getLinkUrl = () => {
      if (mode === 'spectator') {
        return `/tournaments/${tournamentSlug}/matches/${match.id}`
      }
      if (mode === 'admin' && (match.homeTeam || match.awayTeam)) {
        return `/tournaments/${tournamentSlug}/admin/matches/${match.id}`
      }
      return null
    }

    const linkUrl = getLinkUrl()

    const cardInner = (
      <>
        {isLive && (
          <div className="px-2 pt-1 flex items-center gap-1 bg-card rounded-t-md">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs text-red-500">LIVE</span>
          </div>
        )}
        {renderTeamRow('home')}
        {renderTeamRow('away')}
      </>
    )

    // Seed MUST be the root element for CSS nth-child connectors to work
    return (
      <Seed mobileBreakpoint={breakpoint}>
        <SeedItem className={`!bg-card !rounded-md !shadow-sm ${isLive ? '!border !border-red-500/50' : '!border !border-border'}`}>
          {linkUrl ? (
            <Link to={linkUrl} className="block hover:bg-muted/50 rounded-md">
              {cardInner}
            </Link>
          ) : (
            cardInner
          )}
        </SeedItem>
      </Seed>
    )
  }

  // Render third place match
  const renderThirdPlaceMatch = () => {
    if (!thirdPlaceMatch) return null

    const match = thirdPlaceMatch
    const isLive = match.status === 'LIVE'
    const isCompleted = match.status === 'COMPLETED'

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
        return String(side === 'home' ? setDisplay.setsWon.home : setDisplay.setsWon.away)
      }
      return side === 'home' ? String(match.homeScore) : String(match.awayScore)
    }

    const isWinner = (side: 'home' | 'away') => {
      if (!isCompleted || !match.winner) return false
      const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId
      return match.winner.id === teamId
    }

    const renderRow = (side: 'home' | 'away') => {
      const team = side === 'home' ? match.homeTeam : match.awayTeam
      const winner = isWinner(side)

      return (
        <div
          className={`flex items-center justify-between py-1.5 px-2 ${
            winner ? 'font-semibold text-green-600 dark:text-green-400' : ''
          }`}
        >
          <span className="truncate text-sm">
            {team?.shortName ?? team?.name ?? 'TBD'}
          </span>
          <span className={`ml-2 text-sm font-medium ${isLive ? 'text-red-500' : ''}`}>
            {getScore(side)}
          </span>
        </div>
      )
    }

    const cardContent = (
      <div
        className={`rounded-md border bg-card text-card-foreground shadow-sm w-40 ${
          isLive ? 'border-red-500/50' : 'border-border'
        } ${mode === 'spectator' ? 'hover:bg-muted/50' : ''}`}
      >
        {isLive && (
          <div className="px-2 pt-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs text-red-500">LIVE</span>
          </div>
        )}
        {renderRow('home')}
        <div className="border-t border-border mx-1" />
        {renderRow('away')}
      </div>
    )

    const wrappedContent = mode === 'spectator' ? (
      <Link to={`/tournaments/${tournamentSlug}/matches/${match.id}`}>
        {cardContent}
      </Link>
    ) : mode === 'admin' && (match.homeTeam || match.awayTeam) ? (
      <Link to={`/tournaments/${tournamentSlug}/admin/matches/${match.id}`}>
        {cardContent}
      </Link>
    ) : cardContent

    return (
      <div className="mt-8 pt-4 border-t">
        <h3 className="mb-4 text-sm font-semibold">Third Place Match</h3>
        {wrappedContent}
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No knockout matches scheduled yet.
      </div>
    )
  }

  if (bracketRounds.length === 0) {
    return (
      <div>
        <div className="text-center text-muted-foreground py-8">
          No bracket matches scheduled yet.
        </div>
        {renderThirdPlaceMatch()}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="bracket-wrapper">
        <Bracket
          rounds={bracketRounds}
          renderSeedComponent={CustomSeed}
          roundTitleComponent={(title) => (
            <div className="text-sm font-semibold text-center mb-2 text-foreground">
              {title}
            </div>
          )}
          mobileBreakpoint={0}
        />
      </div>
      {renderThirdPlaceMatch()}
    </div>
  )
}
