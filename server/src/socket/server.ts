import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  MatchUpdatePayload,
  ScoreEventPayload,
  MatchStartedPayload,
  MatchEndedPayload,
  MatchPausedPayload,
  PeriodChangedPayload,
} from '../../../shared/src/socket-events.js'

let io: Server<ClientToServerEvents, ServerToClientEvents> | null = null

export function initializeSocket(httpServer: HttpServer, corsOrigins: string[]) {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`)

    // Join match room for live updates
    socket.on('join_match', (matchId) => {
      const room = `match:${matchId}`
      void socket.join(room)
      console.log(`${socket.id} joined room ${room}`)
    })

    // Leave match room
    socket.on('leave_match', (matchId) => {
      const room = `match:${matchId}`
      void socket.leave(room)
      console.log(`${socket.id} left room ${room}`)
    })

    // Join tournament room for tournament-wide updates
    socket.on('join_tournament', (tournamentId) => {
      const room = `tournament:${tournamentId}`
      void socket.join(room)
      console.log(`${socket.id} joined room ${room}`)
    })

    // Leave tournament room
    socket.on('leave_tournament', (tournamentId) => {
      const room = `tournament:${tournamentId}`
      void socket.leave(room)
      console.log(`${socket.id} left room ${room}`)
    })

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`)
    })
  })

  return io
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized')
  }
  return io
}

// Broadcast functions
export function broadcastMatchUpdate(matchId: string, data: MatchUpdatePayload) {
  getIO().to(`match:${matchId}`).emit('match_update', data)
}

export function broadcastScoreEvent(matchId: string, data: ScoreEventPayload) {
  getIO().to(`match:${matchId}`).emit('score_event', data)
}

export function broadcastMatchStarted(matchId: string, data: MatchStartedPayload) {
  getIO().to(`match:${matchId}`).emit('match_started', data)
}

export function broadcastMatchEnded(matchId: string, data: MatchEndedPayload) {
  getIO().to(`match:${matchId}`).emit('match_ended', data)
}

export function broadcastMatchPaused(matchId: string, data: MatchPausedPayload) {
  getIO().to(`match:${matchId}`).emit('match_paused', data)
}

export function broadcastPeriodChanged(matchId: string, data: PeriodChangedPayload) {
  getIO().to(`match:${matchId}`).emit('period_changed', data)
}
