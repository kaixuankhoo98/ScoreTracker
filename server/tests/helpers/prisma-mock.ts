import { type PrismaClient } from '@prisma/client'
import { beforeEach, vi } from 'vitest'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'

export type MockPrismaClient = DeepMockProxy<PrismaClient>

export const prismaMock = mockDeep<PrismaClient>()

vi.mock('../../src/db.js', () => ({
  prisma: prismaMock,
}))

export function resetPrismaMock() {
  mockReset(prismaMock)
}

// Auto-reset before each test when this module is imported
beforeEach(() => {
  resetPrismaMock()
})
