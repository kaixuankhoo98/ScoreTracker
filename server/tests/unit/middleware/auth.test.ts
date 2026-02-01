import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { prismaMock } from '../../helpers/prisma-mock.js'
import { loadTournament, requireAdmin } from '../../../src/middleware/auth.js'
import { createTournament } from '../../helpers/factories.js'
import { TEST_PASSWORD, TEST_PASSWORD_HASH } from '../../helpers/auth.js'

describe('auth middleware', () => {
  describe('loadTournament', () => {
    let mockReq: Partial<Request>
    let mockRes: Partial<Response>
    let mockNext: NextFunction
    let jsonMock: ReturnType<typeof vi.fn>
    let statusMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
      jsonMock = vi.fn()
      statusMock = vi.fn().mockReturnThis()
      mockReq = {
        params: { slug: 'test-tournament' },
        headers: {},
      }
      mockRes = {
        status: statusMock,
        json: jsonMock,
      } as unknown as Partial<Response>
      // Wire up status to return the mock res for chaining
      statusMock.mockImplementation(() => mockRes)
      mockNext = vi.fn()
    })

    it('sets req.tournament when tournament exists', async () => {
      const tournament = createTournament({
        slug: 'test-tournament',
        adminPasswordHash: TEST_PASSWORD_HASH,
      })

      // Mock returns only the selected fields (as Prisma would)
      prismaMock.tournament.findUnique.mockResolvedValue({
        id: tournament.id,
        slug: tournament.slug,
        adminPasswordHash: tournament.adminPasswordHash,
      } as typeof tournament)

      await loadTournament(mockReq as Request, mockRes as Response, mockNext)

      expect(prismaMock.tournament.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-tournament' },
        select: {
          id: true,
          slug: true,
          adminPasswordHash: true,
        },
      })
      expect(mockReq.tournament).toEqual({
        id: tournament.id,
        slug: tournament.slug,
        adminPasswordHash: tournament.adminPasswordHash,
      })
      expect(mockNext).toHaveBeenCalled()
    })

    it('returns 404 when tournament not found', async () => {
      prismaMock.tournament.findUnique.mockResolvedValue(null)

      await loadTournament(mockReq as Request, mockRes as Response, mockNext)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Tournament not found',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('returns 400 when slug is missing', async () => {
      mockReq.params = {}

      await loadTournament(mockReq as Request, mockRes as Response, mockNext)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Tournament slug required',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('returns 400 when slug is empty string', async () => {
      mockReq.params = { slug: '' }

      await loadTournament(mockReq as Request, mockRes as Response, mockNext)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Tournament slug required',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('sets isAdmin=true when correct password provided', async () => {
      const tournament = createTournament({
        adminPasswordHash: TEST_PASSWORD_HASH,
      })
      prismaMock.tournament.findUnique.mockResolvedValue(tournament)

      // Mock bcrypt.compare to return true
      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true))

      mockReq.headers = { 'x-tournament-password': TEST_PASSWORD }

      await loadTournament(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.isAdmin).toBe(true)
      expect(mockNext).toHaveBeenCalled()
    })

    it('sets isAdmin=false when wrong password provided', async () => {
      const tournament = createTournament({
        adminPasswordHash: TEST_PASSWORD_HASH,
      })
      prismaMock.tournament.findUnique.mockResolvedValue(tournament)

      // Mock bcrypt.compare to return false
      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false))

      mockReq.headers = { 'x-tournament-password': 'wrong-password' }

      await loadTournament(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.isAdmin).toBe(false)
      expect(mockNext).toHaveBeenCalled()
    })

    it('sets isAdmin=false when no password provided', async () => {
      const tournament = createTournament()
      prismaMock.tournament.findUnique.mockResolvedValue(tournament)

      await loadTournament(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.isAdmin).toBe(false)
      expect(mockNext).toHaveBeenCalled()
    })

    it('sets isAdmin=false when password header is empty string', async () => {
      const tournament = createTournament()
      prismaMock.tournament.findUnique.mockResolvedValue(tournament)
      mockReq.headers = { 'x-tournament-password': '' }

      await loadTournament(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.isAdmin).toBe(false)
      expect(mockNext).toHaveBeenCalled()
    })

    it('uses tournamentSlug param when slug is not available', async () => {
      const tournament = createTournament({ slug: 'alt-slug' })
      prismaMock.tournament.findUnique.mockResolvedValue(tournament)
      mockReq.params = { tournamentSlug: 'alt-slug' }

      await loadTournament(mockReq as Request, mockRes as Response, mockNext)

      expect(prismaMock.tournament.findUnique).toHaveBeenCalledWith({
        where: { slug: 'alt-slug' },
        select: expect.any(Object),
      })
      expect(mockNext).toHaveBeenCalled()
    })

    it('returns 500 on database error', async () => {
      prismaMock.tournament.findUnique.mockRejectedValue(new Error('DB error'))

      await loadTournament(mockReq as Request, mockRes as Response, mockNext)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to load tournament',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('requireAdmin', () => {
    let mockReq: Partial<Request>
    let mockRes: Partial<Response>
    let mockNext: NextFunction
    let jsonMock: ReturnType<typeof vi.fn>
    let statusMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
      jsonMock = vi.fn()
      statusMock = vi.fn().mockReturnThis()
      mockReq = {}
      mockRes = {
        status: statusMock,
        json: jsonMock,
      } as unknown as Partial<Response>
      // Wire up status to return the mock res for chaining
      statusMock.mockImplementation(() => mockRes)
      mockNext = vi.fn()
    })

    it('calls next when isAdmin is true', () => {
      mockReq.isAdmin = true

      requireAdmin(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
    })

    it('returns 401 when isAdmin is false', () => {
      mockReq.isAdmin = false

      requireAdmin(mockReq as Request, mockRes as Response, mockNext)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Admin access required',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('returns 401 when isAdmin is undefined', () => {
      mockReq.isAdmin = undefined

      requireAdmin(mockReq as Request, mockRes as Response, mockNext)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Admin access required',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})
