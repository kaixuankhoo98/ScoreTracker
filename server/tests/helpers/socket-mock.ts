import { beforeEach, vi } from 'vitest'

export const socketMocks = {
  broadcastMatchUpdate: vi.fn(),
  broadcastScoreEvent: vi.fn(),
  broadcastMatchStarted: vi.fn(),
  broadcastMatchEnded: vi.fn(),
  broadcastMatchPaused: vi.fn(),
  broadcastPeriodChanged: vi.fn(),
  broadcastTournamentMatchUpdate: vi.fn(),
  getIO: vi.fn(),
  initializeSocket: vi.fn(),
}

vi.mock('../../src/socket/server.js', () => socketMocks)

export function resetSocketMocks() {
  Object.values(socketMocks).forEach((mock) => {
    if (typeof mock.mockReset === 'function') {
      mock.mockReset()
    }
  })
}

// Auto-reset before each test when this module is imported
beforeEach(() => {
  resetSocketMocks()
})
