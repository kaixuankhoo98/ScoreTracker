import { useCallback, useRef, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSocket } from './useSocket'
import { matchKeys } from '@/api/matches'
import type {
  MatchUpdatePayload,
  ScoreEventPayload,
  MatchStartedPayload,
  MatchEndedPayload,
  MatchPausedPayload,
  PeriodChangedPayload,
} from '@shared/socket-events'

interface MatchSubscriptionState {
  isSubscribed: boolean
  lastEvent: {
    type: string
    data: unknown
    timestamp: number
  } | null
}

export function useMatchSubscription(matchId: string) {
  const { socket, isConnected, connect } = useSocket()
  const queryClient = useQueryClient()
  const stateRef = useRef<MatchSubscriptionState>({
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
    listenersRef.current.forEach((listener) => {
      listener()
    })
  }, [])

  const updateMatchCache = useCallback(
    (
      updates: Partial<{
        homeScore: number
        awayScore: number
        homePeriodScores: number[]
        awayPeriodScores: number[]
        currentPeriod: number
        status: string
      }>
    ) => {
      queryClient.setQueryData(matchKeys.detail(matchId), (old: unknown) => {
        if (old === null || old === undefined) return old
        return { ...(old as object), ...updates }
      })
    },
    [matchId, queryClient]
  )

  const subscribeToMatch = useCallback(() => {
    if (matchId.length === 0) return

    // Connect if not connected
    if (!isConnected) {
      connect()
    }

    // Join the match room
    socket.emit('join_match', matchId)

    // Handle match updates
    const handleMatchUpdate = (data: MatchUpdatePayload) => {
      if (data.matchId === matchId) {
        updateMatchCache({
          homeScore: data.homeScore,
          awayScore: data.awayScore,
          homePeriodScores: data.homePeriodScores,
          awayPeriodScores: data.awayPeriodScores,
          currentPeriod: data.currentPeriod,
          status: data.status,
        })
        stateRef.current = {
          isSubscribed: true,
          lastEvent: { type: 'match_update', data, timestamp: Date.now() },
        }
        notifyListeners()
      }
    }

    const handleScoreEvent = (data: ScoreEventPayload) => {
      if (data.matchId === matchId) {
        updateMatchCache({
          homeScore: data.homeScore,
          awayScore: data.awayScore,
          homePeriodScores: data.homePeriodScores,
          awayPeriodScores: data.awayPeriodScores,
        })
        stateRef.current = {
          isSubscribed: true,
          lastEvent: { type: 'score_event', data, timestamp: Date.now() },
        }
        notifyListeners()
      }
    }

    const handleMatchStarted = (data: MatchStartedPayload) => {
      if (data.matchId === matchId) {
        updateMatchCache({ status: 'LIVE' })
        stateRef.current = {
          isSubscribed: true,
          lastEvent: { type: 'match_started', data, timestamp: Date.now() },
        }
        notifyListeners()
      }
    }

    const handleMatchEnded = (data: MatchEndedPayload) => {
      if (data.matchId === matchId) {
        updateMatchCache({ status: 'COMPLETED' })
        // Refetch to get full data including winner
        void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) })
        stateRef.current = {
          isSubscribed: true,
          lastEvent: { type: 'match_ended', data, timestamp: Date.now() },
        }
        notifyListeners()
      }
    }

    const handleMatchPaused = (data: MatchPausedPayload) => {
      if (data.matchId === matchId) {
        updateMatchCache({ status: data.status })
        stateRef.current = {
          isSubscribed: true,
          lastEvent: { type: 'match_paused', data, timestamp: Date.now() },
        }
        notifyListeners()
      }
    }

    const handlePeriodChanged = (data: PeriodChangedPayload) => {
      if (data.matchId === matchId) {
        updateMatchCache({
          currentPeriod: data.currentPeriod,
          homePeriodScores: data.homePeriodScores,
          awayPeriodScores: data.awayPeriodScores,
        })
        stateRef.current = {
          isSubscribed: true,
          lastEvent: { type: 'period_changed', data, timestamp: Date.now() },
        }
        notifyListeners()
      }
    }

    // Register event handlers
    socket.on('match_update', handleMatchUpdate)
    socket.on('score_event', handleScoreEvent)
    socket.on('match_started', handleMatchStarted)
    socket.on('match_ended', handleMatchEnded)
    socket.on('match_paused', handleMatchPaused)
    socket.on('period_changed', handlePeriodChanged)

    stateRef.current = { ...stateRef.current, isSubscribed: true }
    notifyListeners()

    // Return cleanup function
    return () => {
      socket.emit('leave_match', matchId)
      socket.off('match_update', handleMatchUpdate)
      socket.off('score_event', handleScoreEvent)
      socket.off('match_started', handleMatchStarted)
      socket.off('match_ended', handleMatchEnded)
      socket.off('match_paused', handleMatchPaused)
      socket.off('period_changed', handlePeriodChanged)

      stateRef.current = { isSubscribed: false, lastEvent: null }
      notifyListeners()
    }
  }, [socket, matchId, isConnected, connect, updateMatchCache, queryClient, notifyListeners])

  const unsubscribeFromMatch = useCallback(() => {
    if (matchId.length > 0) {
      socket.emit('leave_match', matchId)
      stateRef.current = { isSubscribed: false, lastEvent: null }
      notifyListeners()
    }
  }, [socket, matchId, notifyListeners])

  return {
    isSubscribed: state.isSubscribed,
    lastEvent: state.lastEvent,
    subscribe: subscribeToMatch,
    unsubscribe: unsubscribeFromMatch,
    isConnected,
  }
}
