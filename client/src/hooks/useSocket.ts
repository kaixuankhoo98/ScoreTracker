import { useCallback, useSyncExternalStore } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/socket-events'

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

// Singleton socket instance
let socket: TypedSocket | null = null
let connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected'
const listeners = new Set<() => void>()

function getSocket(): TypedSocket {
  if (socket === null) {
    socket = io({
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      connectionState = 'connected'
      listeners.forEach((listener) => {
        listener()
      })
    })

    socket.on('disconnect', () => {
      connectionState = 'disconnected'
      listeners.forEach((listener) => {
        listener()
      })
    })

    socket.on('connect_error', () => {
      connectionState = 'disconnected'
      listeners.forEach((listener) => {
        listener()
      })
    })
  }

  return socket
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

function getSnapshot(): 'disconnected' | 'connecting' | 'connected' {
  return connectionState
}

export function useSocket() {
  const status = useSyncExternalStore(subscribe, getSnapshot)

  const connect = useCallback(() => {
    const s = getSocket()
    if (!s.connected) {
      connectionState = 'connecting'
      listeners.forEach((listener) => {
        listener()
      })
      s.connect()
    }
  }, [])

  const disconnect = useCallback(() => {
    getSocket().disconnect()
  }, [])

  return {
    socket: getSocket(),
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
  }
}
