import { useCallback, useSyncExternalStore } from 'react'
import { setTournamentPassword } from '@/api/client'
import { useVerifyPassword } from '@/api/tournaments'

// Storage key prefix
const STORAGE_KEY_PREFIX = 'scoretracker_auth_'

// In-memory state for current session
const authState = new Map<string, { password: string; verified: boolean }>()
const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach((listener) => {
    listener()
  })
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

function getSnapshot() {
  return authState
}

// Load from localStorage on init
function loadFromStorage(tournamentSlug: string): string | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${tournamentSlug}`)
    return stored
  } catch {
    return null
  }
}

// Save to localStorage
function saveToStorage(tournamentSlug: string, password: string) {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${tournamentSlug}`, password)
  } catch {
    // Ignore storage errors
  }
}

// Remove from localStorage
function removeFromStorage(tournamentSlug: string) {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${tournamentSlug}`)
  } catch {
    // Ignore storage errors
  }
}

export function useTournamentAuth(tournamentSlug: string) {
  const verifyMutation = useVerifyPassword(tournamentSlug)

  // Subscribe to auth state changes
  useSyncExternalStore(subscribe, getSnapshot)

  const state = authState.get(tournamentSlug)
  const isAuthenticated = state?.verified ?? false
  const password = state?.password ?? null

  // Set the password in the API client when authenticated
  if (isAuthenticated && password !== null) {
    setTournamentPassword(password)
  }

  const login = useCallback(
    async (inputPassword: string): Promise<boolean> => {
      // Verify password with server
      const isValid = await verifyMutation.mutateAsync(inputPassword)

      if (isValid) {
        authState.set(tournamentSlug, {
          password: inputPassword,
          verified: true,
        })
        setTournamentPassword(inputPassword)
        saveToStorage(tournamentSlug, inputPassword)
        notifyListeners()
        return true
      }

      return false
    },
    [tournamentSlug, verifyMutation]
  )

  const logout = useCallback(() => {
    authState.delete(tournamentSlug)
    setTournamentPassword(null)
    removeFromStorage(tournamentSlug)
    notifyListeners()
  }, [tournamentSlug])

  // Try to restore from localStorage if not authenticated
  const tryRestoreSession = useCallback(async () => {
    if (isAuthenticated) return true

    const storedPassword = loadFromStorage(tournamentSlug)
    if (storedPassword === null) return false

    // Verify stored password is still valid
    try {
      const isValid = await verifyMutation.mutateAsync(storedPassword)
      if (isValid) {
        authState.set(tournamentSlug, {
          password: storedPassword,
          verified: true,
        })
        setTournamentPassword(storedPassword)
        notifyListeners()
        return true
      } else {
        // Remove invalid stored password
        removeFromStorage(tournamentSlug)
        return false
      }
    } catch {
      return false
    }
  }, [tournamentSlug, isAuthenticated, verifyMutation])

  return {
    isAuthenticated,
    isVerifying: verifyMutation.isPending,
    login,
    logout,
    tryRestoreSession,
    password,
  }
}
