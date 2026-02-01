import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcrypt'
import { prismaMock } from '../../helpers/prisma-mock.js'
import { createTestApp } from '../../helpers/test-app.js'
import {
  createTournament,
  createTournamentWithRelations,
  createBasketballSport,
  createTeam,
  createMatch,
} from '../../helpers/factories.js'
import { TEST_PASSWORD, TEST_PASSWORD_HASH, adminAuthHeader } from '../../helpers/auth.js'

const app = createTestApp()

describe('tournaments routes', () => {
  describe('GET /api/tournaments', () => {
    it('returns paginated tournaments', async () => {
      const sport = createBasketballSport()
      const tournaments = [
        { ...createTournament({ sportId: sport.id }), sport, _count: { teams: 4, matches: 6 } },
        { ...createTournament({ sportId: sport.id }), sport, _count: { teams: 8, matches: 12 } },
      ]

      prismaMock.tournament.findMany.mockResolvedValue(tournaments)
      prismaMock.tournament.count.mockResolvedValue(2)

      const response = await request(app).get('/api/tournaments')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 20,
      })
    })

    it('excludes adminPasswordHash from response', async () => {
      const sport = createBasketballSport()
      const tournament = {
        ...createTournament({ sportId: sport.id, adminPasswordHash: TEST_PASSWORD_HASH }),
        sport,
        _count: { teams: 0, matches: 0 },
      }

      prismaMock.tournament.findMany.mockResolvedValue([tournament])
      prismaMock.tournament.count.mockResolvedValue(1)

      const response = await request(app).get('/api/tournaments')

      expect(response.status).toBe(200)
      expect(response.body.data[0]).not.toHaveProperty('adminPasswordHash')
    })

    it('filters by status', async () => {
      prismaMock.tournament.findMany.mockResolvedValue([])
      prismaMock.tournament.count.mockResolvedValue(0)

      await request(app).get('/api/tournaments?status=IN_PROGRESS')

      expect(prismaMock.tournament.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'IN_PROGRESS' },
        })
      )
    })

    it('handles pagination params', async () => {
      prismaMock.tournament.findMany.mockResolvedValue([])
      prismaMock.tournament.count.mockResolvedValue(50)

      const response = await request(app).get('/api/tournaments?page=2&limit=10')

      expect(prismaMock.tournament.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      )
      expect(response.body.pagination).toEqual({
        total: 50,
        page: 2,
        limit: 10,
      })
    })

    it('returns 500 on database error', async () => {
      prismaMock.tournament.findMany.mockRejectedValue(new Error('DB error'))

      const response = await request(app).get('/api/tournaments')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch tournaments',
      })
    })
  })

  describe('POST /api/tournaments', () => {
    beforeEach(() => {
      vi.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve(TEST_PASSWORD_HASH))
    })

    it('creates tournament with valid data', async () => {
      const sport = createBasketballSport({ id: 'sport-1' })
      const newTournament = {
        ...createTournament({ sportId: sport.id }),
        sport,
      }

      prismaMock.tournament.create.mockResolvedValue(newTournament)

      const response = await request(app).post('/api/tournaments').send({
        name: 'Test Tournament',
        sportId: 'sport-1',
        format: 'ROUND_ROBIN',
        adminPassword: 'admin123',
      })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data).not.toHaveProperty('adminPasswordHash')
      expect(prismaMock.tournament.create).toHaveBeenCalled()
    })

    it('returns 400 for invalid schema - missing name', async () => {
      const response = await request(app).post('/api/tournaments').send({
        sportId: 'sport-1',
        format: 'ROUND_ROBIN',
        adminPassword: 'admin123',
      })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('returns 400 for invalid schema - password too short', async () => {
      const response = await request(app).post('/api/tournaments').send({
        name: 'Test',
        sportId: 'sport-1',
        format: 'ROUND_ROBIN',
        adminPassword: '123', // Too short (min 4)
      })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('returns 400 for invalid format', async () => {
      const response = await request(app).post('/api/tournaments').send({
        name: 'Test',
        sportId: 'sport-1',
        format: 'INVALID_FORMAT',
        adminPassword: 'admin123',
      })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('returns 500 on database error', async () => {
      prismaMock.tournament.create.mockRejectedValue(new Error('DB error'))

      const response = await request(app).post('/api/tournaments').send({
        name: 'Test Tournament',
        sportId: 'sport-1',
        format: 'ROUND_ROBIN',
        adminPassword: 'admin123',
      })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to create tournament',
      })
    })
  })

  describe('GET /api/tournaments/:slug', () => {
    it('returns tournament with relations', async () => {
      const sport = createBasketballSport()
      const tournament = {
        ...createTournament({ slug: 'test-tournament', sportId: sport.id }),
        sport,
        teams: [],
        groups: [],
        matches: [],
        _count: { teams: 0, matches: 0 },
      }

      prismaMock.tournament.findUnique.mockResolvedValue(tournament)

      const response = await request(app).get('/api/tournaments/test-tournament')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        slug: 'test-tournament',
      })
      expect(response.body.data).not.toHaveProperty('adminPasswordHash')
    })

    it('returns 404 when tournament not found', async () => {
      prismaMock.tournament.findUnique.mockResolvedValue(null)

      const response = await request(app).get('/api/tournaments/nonexistent')

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        success: false,
        error: 'Tournament not found',
      })
    })

    it('returns 500 on database error', async () => {
      prismaMock.tournament.findUnique.mockRejectedValue(new Error('DB error'))

      const response = await request(app).get('/api/tournaments/test')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch tournament',
      })
    })
  })

  describe('PUT /api/tournaments/:slug', () => {
    beforeEach(() => {
      // Mock loadTournament middleware
      const tournament = createTournament({
        slug: 'test-tournament',
        adminPasswordHash: TEST_PASSWORD_HASH,
      })
      prismaMock.tournament.findUnique.mockResolvedValue({
        id: tournament.id,
        slug: tournament.slug,
        adminPasswordHash: tournament.adminPasswordHash,
      } as typeof tournament)

      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true))
    })

    it('updates tournament with valid admin auth', async () => {
      const sport = createBasketballSport()
      const updatedTournament = {
        ...createTournament({ name: 'Updated Name', slug: 'test-tournament', sportId: sport.id }),
        sport,
      }

      prismaMock.tournament.update.mockResolvedValue(updatedTournament)

      const response = await request(app)
        .put('/api/tournaments/test-tournament')
        .set(adminAuthHeader())
        .send({ name: 'Updated Name' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).not.toHaveProperty('adminPasswordHash')
    })

    it('returns 401 without admin password', async () => {
      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false))

      const response = await request(app)
        .put('/api/tournaments/test-tournament')
        .send({ name: 'Updated Name' })

      expect(response.status).toBe(401)
      expect(response.body).toEqual({
        success: false,
        error: 'Admin access required',
      })
    })

    it('returns 401 with wrong password', async () => {
      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false))

      const response = await request(app)
        .put('/api/tournaments/test-tournament')
        .set(adminAuthHeader('wrong-password'))
        .send({ name: 'Updated Name' })

      expect(response.status).toBe(401)
      expect(response.body).toEqual({
        success: false,
        error: 'Admin access required',
      })
    })

    it('returns 400 for invalid update data', async () => {
      const response = await request(app)
        .put('/api/tournaments/test-tournament')
        .set(adminAuthHeader())
        .send({ name: '' }) // Empty name is invalid

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /api/tournaments/:slug', () => {
    beforeEach(() => {
      const tournament = createTournament({
        slug: 'test-tournament',
        adminPasswordHash: TEST_PASSWORD_HASH,
      })
      prismaMock.tournament.findUnique.mockResolvedValue({
        id: tournament.id,
        slug: tournament.slug,
        adminPasswordHash: tournament.adminPasswordHash,
      } as typeof tournament)

      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true))
    })

    it('deletes tournament with admin auth', async () => {
      prismaMock.tournament.delete.mockResolvedValue(createTournament())

      const response = await request(app)
        .delete('/api/tournaments/test-tournament')
        .set(adminAuthHeader())

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ success: true })
      expect(prismaMock.tournament.delete).toHaveBeenCalledWith({
        where: { slug: 'test-tournament' },
      })
    })

    it('returns 401 without admin auth', async () => {
      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false))

      const response = await request(app).delete('/api/tournaments/test-tournament')

      expect(response.status).toBe(401)
      expect(response.body).toEqual({
        success: false,
        error: 'Admin access required',
      })
    })
  })

  describe('POST /api/tournaments/:slug/verify-password', () => {
    beforeEach(() => {
      const tournament = createTournament({
        slug: 'test-tournament',
        adminPasswordHash: TEST_PASSWORD_HASH,
      })
      prismaMock.tournament.findUnique.mockResolvedValue({
        id: tournament.id,
        slug: tournament.slug,
        adminPasswordHash: tournament.adminPasswordHash,
      } as typeof tournament)
    })

    it('returns valid: true for correct password', async () => {
      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true))

      const response = await request(app)
        .post('/api/tournaments/test-tournament/verify-password')
        .send({ password: TEST_PASSWORD })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        data: { valid: true },
      })
    })

    it('returns valid: false for incorrect password', async () => {
      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false))

      const response = await request(app)
        .post('/api/tournaments/test-tournament/verify-password')
        .send({ password: 'wrong-password' })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        data: { valid: false },
      })
    })

    it('returns 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/tournaments/test-tournament/verify-password')
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('returns 404 for nonexistent tournament', async () => {
      prismaMock.tournament.findUnique.mockResolvedValue(null)

      const response = await request(app)
        .post('/api/tournaments/nonexistent/verify-password')
        .send({ password: 'test' })

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/tournaments/:slug/generate-matches', () => {
    beforeEach(() => {
      const tournament = createTournament({
        id: 'tournament-1',
        slug: 'test-tournament',
        adminPasswordHash: TEST_PASSWORD_HASH,
        format: 'ROUND_ROBIN',
      })
      prismaMock.tournament.findUnique
        .mockResolvedValueOnce({
          id: tournament.id,
          slug: tournament.slug,
          adminPasswordHash: tournament.adminPasswordHash,
        } as typeof tournament)
        .mockResolvedValueOnce({
          ...tournament,
          teams: [
            createTeam({ id: 'team-1', tournamentId: tournament.id }),
            createTeam({ id: 'team-2', tournamentId: tournament.id }),
            createTeam({ id: 'team-3', tournamentId: tournament.id }),
          ],
          groups: [],
        } as never)

      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true))
    })

    it('generates matches with admin auth', async () => {
      prismaMock.match.deleteMany.mockResolvedValue({ count: 0 })
      prismaMock.tournamentGroup.deleteMany.mockResolvedValue({ count: 0 })
      prismaMock.match.create.mockResolvedValue(createMatch())

      const response = await request(app)
        .post('/api/tournaments/test-tournament/generate-matches')
        .set(adminAuthHeader())
        .send({})

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('matchCount')
    })

    it('returns 400 with less than 2 teams', async () => {
      const tournament = createTournament({
        id: 'tournament-1',
        slug: 'test-tournament',
        adminPasswordHash: TEST_PASSWORD_HASH,
        format: 'ROUND_ROBIN',
      })

      // Reset mock to return tournament with only 1 team
      prismaMock.tournament.findUnique
        .mockReset()
        .mockResolvedValueOnce({
          id: tournament.id,
          slug: tournament.slug,
          adminPasswordHash: tournament.adminPasswordHash,
        } as typeof tournament)
        .mockResolvedValueOnce({
          ...tournament,
          teams: [createTeam({ id: 'team-1', tournamentId: tournament.id })],
          groups: [],
        } as never)

      const response = await request(app)
        .post('/api/tournaments/test-tournament/generate-matches')
        .set(adminAuthHeader())
        .send({})

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        success: false,
        error: 'At least 2 teams required to generate matches',
      })
    })

    it('returns 401 without admin auth', async () => {
      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false))

      const response = await request(app)
        .post('/api/tournaments/test-tournament/generate-matches')
        .send({})

      expect(response.status).toBe(401)
      expect(response.body).toEqual({
        success: false,
        error: 'Admin access required',
      })
    })
  })
})
