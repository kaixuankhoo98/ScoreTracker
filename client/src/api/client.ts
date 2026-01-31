import axios, { type AxiosError } from 'axios'

// API base URL - proxied through Vite in development
const API_BASE = '/api'

// Create axios instance with defaults
export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Type for API responses
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  pagination?: {
    total: number
    page: number
    limit: number
  }
}

// Error handling helper
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse<unknown>>
    return axiosError.response?.data.error ?? axiosError.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unknown error occurred'
}

// Add tournament password to requests
export function setTournamentPassword(password: string | null) {
  if (password !== null && password.length > 0) {
    api.defaults.headers.common['X-Tournament-Password'] = password
  } else {
    delete api.defaults.headers.common['X-Tournament-Password']
  }
}
