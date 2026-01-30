import { useQuery } from '@tanstack/react-query'
import { api, type ApiResponse } from './client'
import type { Sport } from '@shared/schemas'

// Query keys
export const sportKeys = {
  all: ['sports'] as const,
  detail: (slug: string) => ['sports', slug] as const,
}

// Fetch all sports
async function fetchSports(): Promise<Sport[]> {
  const response = await api.get<ApiResponse<Sport[]>>('/sports')
  return response.data.data ?? []
}

// Fetch sport by slug
async function fetchSport(slug: string): Promise<Sport> {
  const response = await api.get<ApiResponse<Sport>>(`/sports/${slug}`)
  if (!response.data.data) {
    throw new Error('Sport not found')
  }
  return response.data.data
}

// Hooks
export function useSports() {
  return useQuery({
    queryKey: sportKeys.all,
    queryFn: fetchSports,
    staleTime: 1000 * 60 * 60, // Sports don't change often
  })
}

export function useSport(slug: string) {
  return useQuery({
    queryKey: sportKeys.detail(slug),
    queryFn: () => fetchSport(slug),
    enabled: slug.length > 0,
    staleTime: 1000 * 60 * 60,
  })
}
