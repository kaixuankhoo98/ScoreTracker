import { useCallback, useRef, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSocket } from './useSocket'
import { tournamentKeys, type TournamentWithRelations } from '@/api/tournaments'
import type { TournamentMatchUpdatePayload } from '@shared/socket-events'

interface TournamentSubscriptionState {
  isSubscribed: boolean
  lastEvent: {
    type: string
    data: unknown
    timestamp: number
  } | null
}

export function useTournamentSubscription(tournamentId: string, tournamentSlug: string) {
  const { socket, isConnected, connect } = useSocket()
  const queryClient = useQueryClient()
  const stateRef = useRef<TournamentSubscriptionState>({
    isSubscribed: false,
    lastEvent: null,
  })
  const listenersRef = useRef(new Set<() => void>())

  const subscribe = useCallback((callback: () => void) => {
    listenersRef.current.add(callback)
    return () => {
      listenersRef.current.delete(callback)
    }
  }, [])

  const getSnapshot = useCallback(() => stateRef.current, [])

  const state = useSyncExternalStore(subscribe, getSnapshot)

  const notifyListeners = useCallback(() => {
    listenersRef.current.forEach((listener) => listener())
  }, [])

  const updateTournamentCache = useCallback(
    (matchId: string, updates: {
      homeScore: number
      awayScore: number
      homePeriodScores: number[]
      awayPeriodScores: number[]
      currentPeriod: number
      status: string
    }) => {
      queryClient.setQueryData(
        tournamentKeys.detail(tournamentSlug),
        (old: TournamentWithRelations | undefined) => {
          if (!old) return old
          return {
            ...old,
            matches: old.matches.map((match) =>
              match.id === matchId
                ? { ...match, ...updates }
                : match
            ),
          }
        }
      )
    },
    [tournamentSlug, queryClient]
  )

  const subscribeToTournament = useCallback(() => {
    if (socket === null || tournamentId.length === 0) return

    // Connect if not connected
    if (!isConnected) {
      connect()
    }

    // Join the tournament room
    socket.emit('join_tournament', tournamentId)

    // Handle tournament match updates
    const handleTournamentMatchUpdate = (data: TournamentMatchUpdatePayload) => {
      if (data.tournamentId === tournamentId) {
        updateTournamentCache(data.matchId, {
          homeScore: data.homeScore,
          awayScore: data.awayScore,
          homePeriodScores: data.homePeriodScores,
          awayPeriodScores: data.awayPeriodScores,
          currentPeriod: data.currentPeriod,
          status: data.status,
        })
        stateRef.current = {
          isSubscribed: true,
          lastEvent: { type: 'tournament_match_update', data, timestamp: Date.now() },
        }
        notifyListeners()
      }
    }

    // Register event handler
    socket.on('tournament_match_update', handleTournamentMatchUpdate)

    stateRef.current = { ...stateRef.current, isSubscribed: true }
    notifyListeners()

    // Return cleanup function
    return () => {
      socket.emit('leave_tournament', tournamentId)
      socket.off('tournament_match_update', handleTournamentMatchUpdate)

      stateRef.current = { isSubscribed: false, lastEvent: null }
      notifyListeners()
    }
  }, [socket, tournamentId, isConnected, connect, updateTournamentCache, notifyListeners])

  const unsubscribeFromTournament = useCallback(() => {
    if (socket !== null && tournamentId.length > 0) {
      socket.emit('leave_tournament', tournamentId)
      stateRef.current = { isSubscribed: false, lastEvent: null }
      notifyListeners()
    }
  }, [socket, tournamentId, notifyListeners])

  return {
    isSubscribed: state.isSubscribed,
    lastEvent: state.lastEvent,
    subscribe: subscribeToTournament,
    unsubscribe: unsubscribeFromTournament,
    isConnected,
  }
}
