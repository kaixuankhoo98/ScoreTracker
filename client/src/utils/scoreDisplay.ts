export interface SetBasedDisplay {
  isSetBased: boolean
  setsWon: { home: number; away: number }
  currentSetScore: { home: number; away: number } | null
  previousSetWinner: 'home' | 'away' | null
}

interface MatchData {
  homeScore: number
  awayScore: number
  homePeriodScores: number[]
  awayPeriodScores: number[]
  status: string
}

interface SportData {
  pointsToWinPeriod: number | null
  periodName: string
}

export function getSetBasedDisplay(match: MatchData, sport: SportData): SetBasedDisplay {
  // Detect set-based sports by pointsToWinPeriod being a positive number,
  // or by the period name indicating sets/games
  const isSetBased =
    (typeof sport.pointsToWinPeriod === 'number' && sport.pointsToWinPeriod > 0) ||
    ['Set', 'Game'].includes(sport.periodName)

  if (!isSetBased) {
    return {
      isSetBased: false,
      setsWon: { home: 0, away: 0 },
      currentSetScore: null,
      previousSetWinner: null,
    }
  }

  // Count sets won by comparing each period's final score
  let homeSetsWon = 0
  let awaySetsWon = 0
  let previousSetWinner: 'home' | 'away' | null = null

  const completedSets = Math.min(match.homePeriodScores.length, match.awayPeriodScores.length)

  for (let i = 0; i < completedSets; i++) {
    const homeSetScore = match.homePeriodScores[i] ?? 0
    const awaySetScore = match.awayPeriodScores[i] ?? 0

    // A set is won when one team has more points than the other
    // and meets the winning criteria (for completed sets)
    if (homeSetScore > awaySetScore) {
      homeSetsWon++
      previousSetWinner = 'home'
    } else if (awaySetScore > homeSetScore) {
      awaySetsWon++
      previousSetWinner = 'away'
    }
  }

  // Determine current set score (only for LIVE matches)
  let currentSetScore: { home: number; away: number } | null = null

  if (match.status === 'LIVE' && match.homePeriodScores.length > 0) {
    const currentSetIndex = match.homePeriodScores.length - 1
    const homeCurrentSet = match.homePeriodScores[currentSetIndex] ?? 0
    const awayCurrentSet = match.awayPeriodScores[currentSetIndex] ?? 0

    // Check if the current set is still in progress
    // (neither team has definitively won it)
    const pointsToWin = sport.pointsToWinPeriod ?? 0
    const minDiff = 2

    const homeWonSet = homeCurrentSet >= pointsToWin && homeCurrentSet - awayCurrentSet >= minDiff
    const awayWonSet = awayCurrentSet >= pointsToWin && awayCurrentSet - homeCurrentSet >= minDiff

    if (!homeWonSet && !awayWonSet) {
      // Set is still in progress
      currentSetScore = { home: homeCurrentSet, away: awayCurrentSet }
    }
  }

  // Adjust previousSetWinner to exclude current in-progress set
  // The previousSetWinner should be from the last COMPLETED set
  if (currentSetScore !== null && completedSets > 0) {
    // Re-calculate from completed sets only (exclude current in-progress)
    const completedSetCount = completedSets - 1
    previousSetWinner = null
    for (let i = 0; i < completedSetCount; i++) {
      const homeSetScore = match.homePeriodScores[i] ?? 0
      const awaySetScore = match.awayPeriodScores[i] ?? 0
      if (homeSetScore > awaySetScore) {
        previousSetWinner = 'home'
      } else if (awaySetScore > homeSetScore) {
        previousSetWinner = 'away'
      }
    }

    // Recalculate sets won excluding current in-progress set
    homeSetsWon = 0
    awaySetsWon = 0
    for (let i = 0; i < completedSetCount; i++) {
      const homeSetScore = match.homePeriodScores[i] ?? 0
      const awaySetScore = match.awayPeriodScores[i] ?? 0
      if (homeSetScore > awaySetScore) {
        homeSetsWon++
      } else if (awaySetScore > homeSetScore) {
        awaySetsWon++
      }
    }
  }

  return {
    isSetBased,
    setsWon: { home: homeSetsWon, away: awaySetsWon },
    currentSetScore,
    previousSetWinner,
  }
}
