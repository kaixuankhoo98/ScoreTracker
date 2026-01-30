import { useCallback, useEffect, useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'scoretracker-theme'

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme
}

function applyTheme(theme: Theme) {
  const resolved = getResolvedTheme(theme)
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
}

// Store for reactive updates
let currentTheme: Theme = getStoredTheme()
const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): Theme {
  return currentTheme
}

function setTheme(theme: Theme) {
  currentTheme = theme
  localStorage.setItem(STORAGE_KEY, theme)
  applyTheme(theme)
  notifyListeners()
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => 'system' as Theme)
  const resolvedTheme = getResolvedTheme(theme)

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (currentTheme === 'system') {
        applyTheme('system')
        notifyListeners()
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const cycleTheme = useCallback(() => {
    const order: Theme[] = ['light', 'dark', 'system']
    const currentIndex = order.indexOf(theme)
    const nextTheme = order[(currentIndex + 1) % order.length] ?? 'system'
    setTheme(nextTheme)
  }, [theme])

  return {
    theme,
    resolvedTheme,
    setTheme,
    cycleTheme,
  }
}
