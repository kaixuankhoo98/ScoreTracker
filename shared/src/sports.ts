import type { Sport, TeamSide, MatchStatus } from './schemas.js'

// Sport configuration interface
export interface SportConfig {
  periods: number
  periodName: string
  scoreIncrements: number[]
  scoreLabels: string[]
  pointsToWinPeriod: number | null
  canTie: boolean
}

// Match state for sport handlers
export interface MatchState {
  homeScore: number
  awayScore: number
  homePeriodScores: number[]
  awayPeriodScores: number[]
  currentPeriod: number
  status: MatchStatus
}

// Score action result
export interface ScoreActionResult {
  valid: boolean
  newState: MatchState
  message?: string
  periodEnded?: boolean
  matchEnded?: boolean
  winnerId?: 'home' | 'away' | null
}

// Available scoring actions for current game state
export interface AvailableAction {
  points: number
  label: string
  teamSide: TeamSide
}

// Sport handler interface
export interface SportHandler {
  config: SportConfig

  // Validate if a scoring action is valid
  validateAction(
    state: MatchState,
    teamSide: TeamSide,
    points: number
  ): { valid: boolean; message?: string }

  // Apply a score and return new state
  applyScore(
    state: MatchState,
    teamSide: TeamSide,
    points: number
  ): ScoreActionResult

  // Undo last score
  undoScore(
    state: MatchState,
    teamSide: TeamSide,
    points: number,
    period: number
  ): MatchState

  // Get available actions for current state
  getAvailableActions(state: MatchState): AvailableAction[]

  // Check if period should end
  shouldEndPeriod(state: MatchState): boolean

  // Check if match should end
  shouldEndMatch(state: MatchState): { ended: boolean; winnerId: 'home' | 'away' | null }

  // Advance to next period
  nextPeriod(state: MatchState): MatchState

  // Format score for display
  formatScore(state: MatchState): string

  // Format period score for display
  formatPeriodScore(homePeriodScores: number[], awayPeriodScores: number[]): string
}

// Base sport handler with common functionality
export function createBaseSportHandler(config: SportConfig): SportHandler {
  return {
    config,

    validateAction(state: MatchState, _teamSide: TeamSide, points: number) {
      if (state.status !== 'LIVE') {
        return { valid: false, message: 'Match is not live' }
      }
      if (!config.scoreIncrements.includes(points)) {
        return { valid: false, message: 'Invalid point value' }
      }
      return { valid: true }
    },

    applyScore(state: MatchState, teamSide: TeamSide, points: number): ScoreActionResult {
      const validation = this.validateAction(state, teamSide, points)
      if (!validation.valid) {
        return { valid: false, newState: state, message: validation.message ?? 'Invalid action' }
      }

      const newState = { ...state }
      const periodIndex = state.currentPeriod - 1

      // Ensure period scores arrays are long enough
      while (newState.homePeriodScores.length <= periodIndex) {
        newState.homePeriodScores = [...newState.homePeriodScores, 0]
      }
      while (newState.awayPeriodScores.length <= periodIndex) {
        newState.awayPeriodScores = [...newState.awayPeriodScores, 0]
      }

      // Clone arrays for immutability
      newState.homePeriodScores = [...newState.homePeriodScores]
      newState.awayPeriodScores = [...newState.awayPeriodScores]

      if (teamSide === 'HOME') {
        newState.homeScore += points
        const currentHomePeriod = newState.homePeriodScores[periodIndex]
        if (currentHomePeriod !== undefined) {
          newState.homePeriodScores[periodIndex] = currentHomePeriod + points
        }
      } else {
        newState.awayScore += points
        const currentAwayPeriod = newState.awayPeriodScores[periodIndex]
        if (currentAwayPeriod !== undefined) {
          newState.awayPeriodScores[periodIndex] = currentAwayPeriod + points
        }
      }

      const periodEnded = this.shouldEndPeriod(newState)
      const matchResult = this.shouldEndMatch(newState)

      return {
        valid: true,
        newState,
        periodEnded,
        matchEnded: matchResult.ended,
        winnerId: matchResult.winnerId,
      }
    },

    undoScore(state: MatchState, teamSide: TeamSide, points: number, period: number) {
      const newState = { ...state }
      const periodIndex = period - 1

      newState.homePeriodScores = [...newState.homePeriodScores]
      newState.awayPeriodScores = [...newState.awayPeriodScores]

      if (teamSide === 'HOME') {
        newState.homeScore = Math.max(0, newState.homeScore - points)
        if (newState.homePeriodScores[periodIndex] !== undefined) {
          newState.homePeriodScores[periodIndex] = Math.max(
            0,
            newState.homePeriodScores[periodIndex] - points
          )
        }
      } else {
        newState.awayScore = Math.max(0, newState.awayScore - points)
        if (newState.awayPeriodScores[periodIndex] !== undefined) {
          newState.awayPeriodScores[periodIndex] = Math.max(
            0,
            newState.awayPeriodScores[periodIndex] - points
          )
        }
      }

      return newState
    },

    getAvailableActions(state: MatchState) {
      if (state.status !== 'LIVE') return []

      const actions: AvailableAction[] = []
      for (let i = 0; i < config.scoreIncrements.length; i++) {
        const points = config.scoreIncrements[i]
        if (points === undefined) continue
        const label = config.scoreLabels[i] ?? `${points} Point${points > 1 ? 's' : ''}`

        actions.push({ points, label, teamSide: 'HOME' })
        actions.push({ points, label, teamSide: 'AWAY' })
      }
      return actions
    },

    shouldEndPeriod(_state: MatchState) {
      // Override in specific sport handlers
      return false
    },

    shouldEndMatch(_state: MatchState) {
      // Override in specific sport handlers
      return { ended: false, winnerId: null }
    },

    nextPeriod(state: MatchState) {
      if (state.currentPeriod >= config.periods) {
        return state
      }

      return {
        ...state,
        currentPeriod: state.currentPeriod + 1,
        homePeriodScores: [...state.homePeriodScores, 0],
        awayPeriodScores: [...state.awayPeriodScores, 0],
      }
    },

    formatScore(state: MatchState) {
      return `${state.homeScore} - ${state.awayScore}`
    },

    formatPeriodScore(homePeriodScores: number[], awayPeriodScores: number[]) {
      return homePeriodScores
        .map((home, i) => `${home}-${awayPeriodScores[i] ?? 0}`)
        .join(', ')
    },
  }
}

// Basketball handler
export function createBasketballHandler(): SportHandler {
  const config: SportConfig = {
    periods: 4,
    periodName: 'Quarter',
    scoreIncrements: [1, 2, 3],
    scoreLabels: ['Free Throw', '2-Point', '3-Point'],
    pointsToWinPeriod: null,
    canTie: false,
  }

  const base = createBaseSportHandler(config)

  return {
    ...base,

    shouldEndMatch(state: MatchState) {
      // Basketball ends after 4 quarters (or overtime)
      // Match only ends when manually ended by admin
      // If tied after 4 quarters, goes to overtime
      if (state.currentPeriod >= 4 && state.homeScore !== state.awayScore) {
        const winnerId = state.homeScore > state.awayScore ? 'home' : 'away'
        return { ended: false, winnerId } // Don't auto-end, let admin control
      }
      return { ended: false, winnerId: null }
    },
  }
}

// Volleyball handler
export function createVolleyballHandler(): SportHandler {
  const config: SportConfig = {
    periods: 5,
    periodName: 'Set',
    scoreIncrements: [1],
    scoreLabels: ['Point'],
    pointsToWinPeriod: 25, // 15 for 5th set
    canTie: false,
  }

  const base = createBaseSportHandler(config)

  return {
    ...base,

    shouldEndPeriod(state: MatchState) {
      const periodIndex = state.currentPeriod - 1
      const homeSetScore = state.homePeriodScores[periodIndex] ?? 0
      const awaySetScore = state.awayPeriodScores[periodIndex] ?? 0

      // 5th set goes to 15, others to 25
      const pointsToWin = state.currentPeriod === 5 ? 15 : 25
      const minDiff = 2

      const homeWins = homeSetScore >= pointsToWin && homeSetScore - awaySetScore >= minDiff
      const awayWins = awaySetScore >= pointsToWin && awaySetScore - homeSetScore >= minDiff

      return homeWins || awayWins
    },

    shouldEndMatch(state: MatchState) {
      // Count sets won
      let homeSets = 0
      let awaySets = 0

      for (let i = 0; i < state.currentPeriod; i++) {
        const homeSetScore = state.homePeriodScores[i] ?? 0
        const awaySetScore = state.awayPeriodScores[i] ?? 0

        if (homeSetScore > awaySetScore) homeSets++
        else if (awaySetScore > homeSetScore) awaySets++
      }

      // Best of 5 - first to 3 sets wins
      if (homeSets >= 3) return { ended: true, winnerId: 'home' }
      if (awaySets >= 3) return { ended: true, winnerId: 'away' }

      return { ended: false, winnerId: null }
    },

    formatScore(state: MatchState) {
      // Volleyball shows sets won, not total points
      let homeSets = 0
      let awaySets = 0

      for (let i = 0; i < state.homePeriodScores.length; i++) {
        const homeSetScore = state.homePeriodScores[i] ?? 0
        const awaySetScore = state.awayPeriodScores[i] ?? 0

        if (homeSetScore > awaySetScore) homeSets++
        else if (awaySetScore > homeSetScore) awaySets++
      }

      return `${homeSets} - ${awaySets}`
    },
  }
}

// Soccer handler
export function createSoccerHandler(): SportHandler {
  const config: SportConfig = {
    periods: 2,
    periodName: 'Half',
    scoreIncrements: [1],
    scoreLabels: ['Goal'],
    pointsToWinPeriod: null,
    canTie: true,
  }

  const base = createBaseSportHandler(config)

  return {
    ...base,

    shouldEndMatch(state: MatchState) {
      // Soccer can end in a tie (for group stage)
      // For knockouts, would need overtime/penalties - handled by admin
      if (state.currentPeriod >= 2) {
        if (state.homeScore > state.awayScore) {
          return { ended: false, winnerId: 'home' }
        } else if (state.awayScore > state.homeScore) {
          return { ended: false, winnerId: 'away' }
        } else if (config.canTie) {
          return { ended: false, winnerId: null } // Tie allowed
        }
      }
      return { ended: false, winnerId: null }
    },
  }
}

// Get handler by sport slug
export function getSportHandler(sport: Sport): SportHandler {
  switch (sport.slug) {
    case 'basketball':
      return createBasketballHandler()
    case 'volleyball':
      return createVolleyballHandler()
    case 'soccer':
      return createSoccerHandler()
    default:
      // Generic handler using sport config
      return createBaseSportHandler({
        periods: sport.periods,
        periodName: sport.periodName,
        scoreIncrements: sport.scoreIncrements,
        scoreLabels: sport.scoreLabels,
        pointsToWinPeriod: sport.pointsToWinPeriod,
        canTie: sport.canTie,
      })
  }
}
