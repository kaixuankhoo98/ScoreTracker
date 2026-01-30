import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type ApiResponse } from './client'
import type { Match, AddScore, UpdateMatch, Team, ScoreEvent, Sport } from '@shared/schemas'
import { tournamentKeys } from './tournaments'

// Extended match type with relations
export interface MatchWithRelations extends Match {
  homeTeam: Team | null
  awayTeam: Team | null
  winner: Team | null
  group: { id: string; name: string } | null
  tournament: {
    id: string
    name: string
    slug: string
    sport: Sport
  }
  scoreEvents: ScoreEvent[]
}

// Query keys
export const matchKeys = {
  all: ['matches'] as const,
  lists: () => [...matchKeys.all, 'list'] as const,
  list: (tournamentSlug: string, filters?: Record<string, unknown>) =>
    [...matchKeys.lists(), tournamentSlug, filters] as const,
  details: () => [...matchKeys.all, 'detail'] as const,
  detail: (matchId: string) => [...matchKeys.details(), matchId] as const,
}

// Fetch match by ID
async function fetchMatch(matchId: string): Promise<MatchWithRelations> {
  const response = await api.get<ApiResponse<MatchWithRelations>>(
    `/matches/${matchId}`
  )
  if (!response.data.data) {
    throw new Error('Match not found')
  }
  return response.data.data
}

// Update match
async function updateMatch(
  matchId: string,
  data: UpdateMatch
): Promise<MatchWithRelations> {
  const response = await api.put<ApiResponse<MatchWithRelations>>(
    `/matches/${matchId}`,
    data
  )
  if (!response.data.data) {
    throw new Error(response.data.error ?? 'Failed to update match')
  }
  return response.data.data
}

// Start match
async function startMatch(matchId: string): Promise<MatchWithRelations> {
  const response = await api.post<ApiResponse<MatchWithRelations>>(
    `/matches/${matchId}/start`
  )
  if (!response.data.data) {
    throw new Error(response.data.error ?? 'Failed to start match')
  }
  return response.data.data
}

// Pause match
async function pauseMatch(matchId: string): Promise<MatchWithRelations> {
  const response = await api.post<ApiResponse<MatchWithRelations>>(
    `/matches/${matchId}/pause`
  )
  if (!response.data.data) {
    throw new Error(response.data.error ?? 'Failed to pause match')
  }
  return response.data.data
}

// End match
async function endMatch(matchId: string): Promise<MatchWithRelations> {
  const response = await api.post<ApiResponse<MatchWithRelations>>(
    `/matches/${matchId}/end`
  )
  if (!response.data.data) {
    throw new Error(response.data.error ?? 'Failed to end match')
  }
  return response.data.data
}

// Add score
async function addScore(
  matchId: string,
  data: AddScore
): Promise<{ match: MatchWithRelations; event: ScoreEvent }> {
  const response = await api.post<
    ApiResponse<{ match: MatchWithRelations; event: ScoreEvent }>
  >(`/matches/${matchId}/score`, data)
  if (!response.data.data) {
    throw new Error(response.data.error ?? 'Failed to add score')
  }
  return response.data.data
}

// Undo last score
async function undoScore(matchId: string): Promise<MatchWithRelations> {
  const response = await api.post<ApiResponse<MatchWithRelations>>(
    `/matches/${matchId}/undo`
  )
  if (!response.data.data) {
    throw new Error(response.data.error ?? 'Failed to undo score')
  }
  return response.data.data
}

// Next period
async function nextPeriod(matchId: string): Promise<MatchWithRelations> {
  const response = await api.post<ApiResponse<MatchWithRelations>>(
    `/matches/${matchId}/next-period`
  )
  if (!response.data.data) {
    throw new Error(response.data.error ?? 'Failed to advance period')
  }
  return response.data.data
}

// Delete match
async function deleteMatch(matchId: string): Promise<void> {
  const response = await api.delete<ApiResponse<void>>(`/matches/${matchId}`)
  if (!response.data.success) {
    throw new Error(response.data.error ?? 'Failed to delete match')
  }
}

// Hooks
export function useMatch(matchId: string) {
  return useQuery({
    queryKey: matchKeys.detail(matchId),
    queryFn: () => fetchMatch(matchId),
    enabled: matchId.length > 0,
    staleTime: 1000 * 5, // 5 seconds - matches update frequently
    refetchInterval: (query) => {
      // Refetch every 10 seconds if match is live
      const data = query.state.data
      if (data?.status === 'LIVE') {
        return 1000 * 10
      }
      return false
    },
  })
}

export function useUpdateMatch(matchId: string, tournamentSlug?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateMatch) => updateMatch(matchId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) })
      if (tournamentSlug) {
        void queryClient.invalidateQueries({
          queryKey: tournamentKeys.detail(tournamentSlug),
        })
      }
    },
  })
}

// Hook for updating any match (takes matchId at mutation time)
export function useUpdateMatchById(tournamentSlug?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ matchId, data }: { matchId: string; data: UpdateMatch }) =>
      updateMatch(matchId, data),
    onSuccess: (_, { matchId }) => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) })
      if (tournamentSlug) {
        void queryClient.invalidateQueries({
          queryKey: tournamentKeys.detail(tournamentSlug),
        })
      }
    },
  })
}

export function useStartMatch(matchId: string, tournamentSlug?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => startMatch(matchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) })
      if (tournamentSlug) {
        void queryClient.invalidateQueries({
          queryKey: tournamentKeys.detail(tournamentSlug),
        })
      }
    },
  })
}

export function usePauseMatch(matchId: string, tournamentSlug?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => pauseMatch(matchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) })
      if (tournamentSlug) {
        void queryClient.invalidateQueries({
          queryKey: tournamentKeys.detail(tournamentSlug),
        })
      }
    },
  })
}

export function useEndMatch(matchId: string, tournamentSlug?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => endMatch(matchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) })
      if (tournamentSlug) {
        void queryClient.invalidateQueries({
          queryKey: tournamentKeys.detail(tournamentSlug),
        })
      }
    },
  })
}

export function useAddScore(matchId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AddScore) => addScore(matchId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) })
    },
  })
}

export function useUndoScore(matchId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => undoScore(matchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) })
    },
  })
}

export function useNextPeriod(matchId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => nextPeriod(matchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) })
    },
  })
}

export function useDeleteMatch(matchId: string, tournamentSlug?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => deleteMatch(matchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) })
      if (tournamentSlug) {
        void queryClient.invalidateQueries({
          queryKey: tournamentKeys.detail(tournamentSlug),
        })
      }
    },
  })
}
