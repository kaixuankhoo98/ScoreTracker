import type { Match, ScoreEvent, MatchStatus } from './schemas.js'

// Client -> Server events
export interface ClientToServerEvents {
  join_match: (matchId: string) => void
  leave_match: (matchId: string) => void
  join_tournament: (tournamentId: string) => void
  leave_tournament: (tournamentId: string) => void
}

// Server -> Client events
export interface ServerToClientEvents {
  match_update: (data: MatchUpdatePayload) => void
  score_event: (data: ScoreEventPayload) => void
  match_started: (data: MatchStartedPayload) => void
  match_ended: (data: MatchEndedPayload) => void
  match_paused: (data: MatchPausedPayload) => void
  period_changed: (data: PeriodChangedPayload) => void
  tournament_update: (data: TournamentUpdatePayload) => void
  error: (data: ErrorPayload) => void
}

// Payload types
export interface MatchUpdatePayload {
  matchId: string
  homeScore: number
  awayScore: number
  homePeriodScores: number[]
  awayPeriodScores: number[]
  currentPeriod: number
  status: MatchStatus
}

export interface ScoreEventPayload {
  matchId: string
  event: ScoreEvent
  homeScore: number
  awayScore: number
  homePeriodScores: number[]
  awayPeriodScores: number[]
}

export interface MatchStartedPayload {
  matchId: string
  startedAt: string
}

export interface MatchEndedPayload {
  matchId: string
  winnerId: string | null
  homeScore: number
  awayScore: number
  endedAt: string
}

export interface MatchPausedPayload {
  matchId: string
  status: MatchStatus
}

export interface PeriodChangedPayload {
  matchId: string
  currentPeriod: number
  homePeriodScores: number[]
  awayPeriodScores: number[]
}

export interface TournamentUpdatePayload {
  tournamentId: string
  matches?: Partial<Match>[]
}

export interface ErrorPayload {
  message: string
  code?: string
}

// Socket room naming
export const getMatchRoom = (matchId: string) => `match:${matchId}`
export const getTournamentRoom = (tournamentId: string) => `tournament:${tournamentId}`
