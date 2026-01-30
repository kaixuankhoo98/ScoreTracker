import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type ApiResponse } from './client'
import type {
  Tournament,
  CreateTournament,
  UpdateTournament,
  Team,
  CreateTeam,
  GenerateMatches,
} from '@shared/schemas'

// Extended tournament type with relations
export interface TournamentWithRelations extends Omit<Tournament, 'sportId'> {
  sport: {
    id: string
    name: string
    slug: string
    periods: number
    periodName: string
    scoreIncrements: number[]
    scoreLabels: string[]
  }
  teams: Team[]
  groups: Array<{
    id: string
    name: string
    teams: Team[]
  }>
  matches: Array<{
    id: string
    homeTeamId: string | null
    awayTeamId: string | null
    homeScore: number
    awayScore: number
    status: string
    stage: string
    round: number
    matchNumber: number
    homeTeam: Team | null
    awayTeam: Team | null
    winner: Team | null
  }>
  _count: {
    teams: number
    matches: number
  }
}

// Query keys
export const tournamentKeys = {
  all: ['tournaments'] as const,
  lists: () => [...tournamentKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...tournamentKeys.lists(), filters] as const,
  details: () => [...tournamentKeys.all, 'detail'] as const,
  detail: (slug: string) => [...tournamentKeys.details(), slug] as const,
}

// Fetch tournaments list
async function fetchTournaments(params?: {
  page?: number
  limit?: number
  status?: string
}): Promise<{ tournaments: TournamentWithRelations[]; pagination: { total: number; page: number; limit: number } }> {
  const response = await api.get<
    ApiResponse<TournamentWithRelations[]> & {
      pagination: { total: number; page: number; limit: number }
    }
  >('/tournaments', { params })
  return {
    tournaments: response.data.data ?? [],
    pagination: response.data.pagination ?? { total: 0, page: 1, limit: 20 },
  }
}

// Fetch single tournament
async function fetchTournament(slug: string): Promise<TournamentWithRelations> {
  const response = await api.get<ApiResponse<TournamentWithRelations>>(
    `/tournaments/${slug}`
  )
  if (!response.data.data) {
    throw new Error('Tournament not found')
  }
  return response.data.data
}

// Create tournament
async function createTournament(
  data: CreateTournament
): Promise<TournamentWithRelations> {
  const response = await api.post<ApiResponse<TournamentWithRelations>>(
    '/tournaments',
    data
  )
  if (!response.data.data) {
    throw new Error(response.data.error ?? 'Failed to create tournament')
  }
  return response.data.data
}

// Update tournament
async function updateTournament(
  slug: string,
  data: UpdateTournament
): Promise<TournamentWithRelations> {
  const response = await api.put<ApiResponse<TournamentWithRelations>>(
    `/tournaments/${slug}`,
    data
  )
  if (!response.data.data) {
    throw new Error(response.data.error ?? 'Failed to update tournament')
  }
  return response.data.data
}

// Delete tournament
async function deleteTournament(slug: string): Promise<void> {
  await api.delete(`/tournaments/${slug}`)
}

// Verify password
async function verifyPassword(
  slug: string,
  password: string
): Promise<boolean> {
  const response = await api.post<ApiResponse<{ valid: boolean }>>(
    `/tournaments/${slug}/verify-password`,
    { password }
  )
  return response.data.data?.valid ?? false
}

// Generate matches
async function generateMatches(
  slug: string,
  options?: GenerateMatches
): Promise<{ matchCount: number }> {
  const response = await api.post<ApiResponse<{ matchCount: number }>>(
    `/tournaments/${slug}/generate-matches`,
    options ?? {}
  )
  if (!response.data.data) {
    throw new Error(response.data.error ?? 'Failed to generate matches')
  }
  return response.data.data
}

// Add team
async function addTeam(slug: string, data: CreateTeam): Promise<Team> {
  const response = await api.post<ApiResponse<Team>>(
    `/tournaments/${slug}/teams`,
    data
  )
  if (!response.data.data) {
    throw new Error(response.data.error ?? 'Failed to add team')
  }
  return response.data.data
}

// Add multiple teams
async function addTeamsBulk(
  slug: string,
  teams: CreateTeam[]
): Promise<{ created: Team[]; errors: Array<{ index: number; error: string }> }> {
  const response = await api.post<
    ApiResponse<{ created: Team[]; errors: Array<{ index: number; error: string }> }>
  >(`/tournaments/${slug}/teams/bulk`, { teams })
  return response.data.data ?? { created: [], errors: [] }
}

// Delete team
async function deleteTeam(slug: string, teamId: string): Promise<void> {
  await api.delete(`/tournaments/${slug}/teams/${teamId}`)
}

// Hooks
export function useTournaments(params?: {
  page?: number
  limit?: number
  status?: string
}) {
  return useQuery({
    queryKey: tournamentKeys.list(params ?? {}),
    queryFn: () => fetchTournaments(params),
    staleTime: 1000 * 30, // 30 seconds
  })
}

export function useTournament(slug: string) {
  return useQuery({
    queryKey: tournamentKeys.detail(slug),
    queryFn: () => fetchTournament(slug),
    enabled: slug.length > 0,
    staleTime: 1000 * 10, // 10 seconds
  })
}

export function useCreateTournament() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTournament,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() })
    },
  })
}

export function useUpdateTournament(slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateTournament) => updateTournament(slug, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(slug) })
      void queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() })
    },
  })
}

export function useDeleteTournament() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTournament,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() })
    },
  })
}

export function useVerifyPassword(slug: string) {
  return useMutation({
    mutationFn: (password: string) => verifyPassword(slug, password),
  })
}

export function useGenerateMatches(slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (options?: GenerateMatches) => generateMatches(slug, options),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(slug) })
    },
  })
}

export function useAddTeam(slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTeam) => addTeam(slug, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(slug) })
    },
  })
}

export function useAddTeamsBulk(slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (teams: CreateTeam[]) => addTeamsBulk(slug, teams),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(slug) })
    },
  })
}

export function useDeleteTeam(slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (teamId: string) => deleteTeam(slug, teamId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(slug) })
    },
  })
}
