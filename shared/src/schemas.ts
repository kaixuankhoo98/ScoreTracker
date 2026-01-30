import { z } from 'zod'

// Enums matching Prisma
export const TournamentFormatSchema = z.enum([
  'ROUND_ROBIN',
  'SINGLE_ELIMINATION',
  'DOUBLE_ELIMINATION',
  'GROUP_KNOCKOUT',
])

export const TournamentStatusSchema = z.enum([
  'DRAFT',
  'REGISTRATION',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
])

export const MatchStatusSchema = z.enum([
  'SCHEDULED',
  'LIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
])

export const MatchStageSchema = z.enum([
  'GROUP',
  'ROUND_OF_16',
  'QUARTERFINAL',
  'SEMIFINAL',
  'THIRD_PLACE',
  'FINAL',
])

export const TeamSideSchema = z.enum(['HOME', 'AWAY'])

// Sport schemas
export const SportSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  periods: z.number().int().positive(),
  periodName: z.string(),
  scoreIncrements: z.array(z.number().int().positive()),
  scoreLabels: z.array(z.string()),
  pointsToWinPeriod: z.number().int().positive().nullable(),
  canTie: z.boolean(),
  icon: z.string().nullable(),
})

// Team schemas
export const TeamSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  shortName: z.string().min(1).max(5).nullable(),
  tournamentId: z.string(),
  groupId: z.string().nullable(),
  seed: z.number().int().positive().nullable(),
})

export const CreateTeamSchema = z.object({
  name: z.string().min(1).max(100),
  shortName: z.string().min(1).max(5).optional(),
  groupId: z.string().optional(),
  seed: z.number().int().positive().optional(),
})

export const UpdateTeamSchema = CreateTeamSchema.partial()

// Tournament schemas
export const TournamentSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  slug: z.string(),
  description: z.string().nullable(),
  sportId: z.string(),
  format: TournamentFormatSchema,
  status: TournamentStatusSchema,
  startDate: z.string().datetime().nullable(),
  endDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const CreateTournamentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  sportId: z.string(),
  format: TournamentFormatSchema,
  adminPassword: z.string().min(4).max(100),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const UpdateTournamentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: TournamentStatusSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// Match schemas
export const MatchSchema = z.object({
  id: z.string(),
  tournamentId: z.string(),
  groupId: z.string().nullable(),
  homeTeamId: z.string().nullable(),
  awayTeamId: z.string().nullable(),
  winnerId: z.string().nullable(),
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  homePeriodScores: z.array(z.number().int().min(0)),
  awayPeriodScores: z.array(z.number().int().min(0)),
  currentPeriod: z.number().int().positive(),
  round: z.number().int().positive(),
  matchNumber: z.number().int().positive(),
  stage: MatchStageSchema,
  status: MatchStatusSchema,
  scheduledAt: z.string().datetime().nullable(),
  startedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
})

export const CreateMatchSchema = z.object({
  homeTeamId: z.string().optional(),
  awayTeamId: z.string().optional(),
  groupId: z.string().optional(),
  round: z.number().int().positive().optional(),
  matchNumber: z.number().int().positive().optional(),
  stage: MatchStageSchema.optional(),
  scheduledAt: z.string().datetime().optional(),
})

export const UpdateMatchSchema = z.object({
  homeTeamId: z.string().nullable().optional(),
  awayTeamId: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  status: MatchStatusSchema.optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  stage: MatchStageSchema.optional(),
  round: z.number().int().positive().optional(),
  matchNumber: z.number().int().positive().optional(),
})

// Score event schemas
export const ScoreEventSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  teamSide: TeamSideSchema,
  points: z.number().int(),
  period: z.number().int().positive(),
  action: z.string(),
  undone: z.boolean(),
  createdAt: z.string().datetime(),
})

export const AddScoreSchema = z.object({
  teamSide: TeamSideSchema,
  points: z.number().int().positive(),
  action: z.string(),
})

// Tournament group schemas
export const TournamentGroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  tournamentId: z.string(),
})

export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(50),
})

// Password verification
export const VerifyPasswordSchema = z.object({
  password: z.string().min(1),
})

// Generate matches schema
export const GenerateMatchesSchema = z.object({
  groupCount: z.number().int().min(1).max(8).optional(), // For group knockout
  teamsPerGroup: z.number().int().min(2).max(8).optional(),
  advancingPerGroup: z.number().int().min(1).max(4).optional(),
})

// API Response wrapper
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
  })

// Types derived from schemas
export type TournamentFormat = z.infer<typeof TournamentFormatSchema>
export type TournamentStatus = z.infer<typeof TournamentStatusSchema>
export type MatchStatus = z.infer<typeof MatchStatusSchema>
export type MatchStage = z.infer<typeof MatchStageSchema>
export type TeamSide = z.infer<typeof TeamSideSchema>

export type Sport = z.infer<typeof SportSchema>
export type Team = z.infer<typeof TeamSchema>
export type Tournament = z.infer<typeof TournamentSchema>
export type Match = z.infer<typeof MatchSchema>
export type ScoreEvent = z.infer<typeof ScoreEventSchema>
export type TournamentGroup = z.infer<typeof TournamentGroupSchema>

export type CreateTeam = z.infer<typeof CreateTeamSchema>
export type UpdateTeam = z.infer<typeof UpdateTeamSchema>
export type CreateTournament = z.infer<typeof CreateTournamentSchema>
export type UpdateTournament = z.infer<typeof UpdateTournamentSchema>
export type CreateMatch = z.infer<typeof CreateMatchSchema>
export type UpdateMatch = z.infer<typeof UpdateMatchSchema>
export type AddScore = z.infer<typeof AddScoreSchema>
export type CreateGroup = z.infer<typeof CreateGroupSchema>
export type GenerateMatches = z.infer<typeof GenerateMatchesSchema>
