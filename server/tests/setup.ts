import { beforeAll, afterAll, afterEach, vi } from 'vitest'
import { resetPrismaMock } from './helpers/prisma-mock.js'
import { resetSocketMocks } from './helpers/socket-mock.js'
import { resetFactoryCounter } from './helpers/factories.js'

beforeAll(async () => {
  // Suppress console.error/log during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  }
})

afterEach(async () => {
  // Reset all mocks between tests
  resetPrismaMock()
  resetSocketMocks()
  resetFactoryCounter()
})

afterAll(async () => {
  // Restore console methods
  vi.restoreAllMocks()
})
