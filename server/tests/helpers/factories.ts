import type { Sport, Tournament, Team, Match, ScoreEvent, TournamentGroup } from '@prisma/client'

// Counter for generating unique IDs
let idCounter = 0

function generateId(prefix: string = 'id'): string {
  return `${prefix}-${++idCounter}`
}

// Reset counter between test files if needed
export function resetFactoryCounter() {
  idCounter = 0
}

// Sport factory
export function createSport(overrides: Partial<Sport> = {}): Sport {
  const id = overrides.id ?? generateId('sport')
  return {
    id,
    name: `Sport ${id}`,
    slug: `sport-${id}`,
    description: null,
    periods: 4,
    periodName: 'Quarter',
    scoreIncrements: [1, 2, 3],
    scoreLabels: ['Free Throw', '2-Point', '3-Point'],
    pointsToWinPeriod: null,
    canTie: false,
    icon: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Basketball preset
export function createBasketballSport(overrides: Partial<Sport> = {}): Sport {
  return createSport({
    name: 'Basketball',
    slug: 'basketball',
    periods: 4,
    periodName: 'Quarter',
    scoreIncrements: [1, 2, 3],
    scoreLabels: ['Free Throw', '2-Point', '3-Point'],
    canTie: false,
    icon: 'basketball',
    ...overrides,
  })
}

// Volleyball preset
export function createVolleyballSport(overrides: Partial<Sport> = {}): Sport {
  return createSport({
    name: 'Volleyball',
    slug: 'volleyball',
    periods: 5,
    periodName: 'Set',
    scoreIncrements: [1],
    scoreLabels: ['Point'],
    pointsToWinPeriod: 25,
    canTie: false,
    icon: 'volleyball',
    ...overrides,
  })
}

// Soccer preset
export function createSoccerSport(overrides: Partial<Sport> = {}): Sport {
  return createSport({
    name: 'Soccer',
    slug: 'soccer',
    periods: 2,
    periodName: 'Half',
    scoreIncrements: [1],
    scoreLabels: ['Goal'],
    canTie: true,
    icon: 'soccer',
    ...overrides,
  })
}

// Tournament factory
export function createTournament(overrides: Partial<Tournament> = {}): Tournament {
  const id = overrides.id ?? generateId('tournament')
  return {
    id,
    name: `Tournament ${id}`,
    slug: `tournament-${id}`,
    description: null,
    sportId: overrides.sportId ?? generateId('sport'),
    format: 'ROUND_ROBIN',
    status: 'DRAFT',
    adminPasswordHash: '$2b$10$test-hash', // bcrypt hash placeholder
    startDate: null,
    endDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Tournament with relations
export interface TournamentWithRelations extends Tournament {
  sport: Sport
  teams?: Team[]
  matches?: Match[]
  groups?: TournamentGroup[]
}

export function createTournamentWithRelations(
  overrides: Partial<TournamentWithRelations> = {}
): TournamentWithRelations {
  const sport = overrides.sport ?? createBasketballSport()
  const tournament = createTournament({ sportId: sport.id, ...overrides })
  return {
    ...tournament,
    sport,
    teams: overrides.teams ?? [],
    matches: overrides.matches ?? [],
    groups: overrides.groups ?? [],
  }
}

// Team factory
export function createTeam(overrides: Partial<Team> = {}): Team {
  const id = overrides.id ?? generateId('team')
  return {
    id,
    name: `Team ${id}`,
    shortName: null,
    tournamentId: overrides.tournamentId ?? generateId('tournament'),
    groupId: null,
    seed: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Match factory
export function createMatch(overrides: Partial<Match> = {}): Match {
  const id = overrides.id ?? generateId('match')
  return {
    id,
    tournamentId: overrides.tournamentId ?? generateId('tournament'),
    groupId: null,
    homeTeamId: overrides.homeTeamId ?? null,
    awayTeamId: overrides.awayTeamId ?? null,
    winnerId: null,
    homeScore: 0,
    awayScore: 0,
    homePeriodScores: [],
    awayPeriodScores: [],
    currentPeriod: 1,
    round: 1,
    matchNumber: 1,
    stage: 'GROUP',
    status: 'SCHEDULED',
    scheduledAt: null,
    startedAt: null,
    endedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Match with relations
export interface MatchWithRelations extends Match {
  tournament?: TournamentWithRelations
  homeTeam?: Team | null
  awayTeam?: Team | null
  winner?: Team | null
  scoreEvents?: ScoreEvent[]
}

export function createMatchWithRelations(
  overrides: Partial<MatchWithRelations> = {}
): MatchWithRelations {
  const match = createMatch(overrides)
  return {
    ...match,
    tournament: overrides.tournament,
    homeTeam: overrides.homeTeam ?? null,
    awayTeam: overrides.awayTeam ?? null,
    winner: overrides.winner ?? null,
    scoreEvents: overrides.scoreEvents ?? [],
  }
}

// ScoreEvent factory
export function createScoreEvent(overrides: Partial<ScoreEvent> = {}): ScoreEvent {
  const id = overrides.id ?? generateId('event')
  return {
    id,
    matchId: overrides.matchId ?? generateId('match'),
    teamSide: 'HOME',
    points: 2,
    period: 1,
    action: '2-Point',
    undone: false,
    createdAt: new Date(),
    ...overrides,
  }
}

// TournamentGroup factory
export function createTournamentGroup(overrides: Partial<TournamentGroup> = {}): TournamentGroup {
  const id = overrides.id ?? generateId('group')
  return {
    id,
    name: `Group ${id}`,
    tournamentId: overrides.tournamentId ?? generateId('tournament'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}
