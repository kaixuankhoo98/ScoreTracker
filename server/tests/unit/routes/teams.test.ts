import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcrypt'
import { prismaMock } from '../../helpers/prisma-mock.js'
import { createTestApp } from '../../helpers/test-app.js'
import { createTournament, createTeam } from '../../helpers/factories.js'
import { TEST_PASSWORD_HASH, adminAuthHeader } from '../../helpers/auth.js'

const app = createTestApp()

describe('teams routes', () => {
  const tournamentSlug = 'test-tournament'
  const tournamentId = 'tournament-1'

  beforeEach(() => {
    // Mock loadTournament middleware
    const tournament = createTournament({
      id: tournamentId,
      slug: tournamentSlug,
      adminPasswordHash: TEST_PASSWORD_HASH,
    })
    prismaMock.tournament.findUnique.mockResolvedValue({
      id: tournament.id,
      slug: tournament.slug,
      adminPasswordHash: tournament.adminPasswordHash,
    } as typeof tournament)

    vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true))
  })

  describe('GET /api/tournaments/:slug/teams', () => {
    it('returns teams for tournament', async () => {
      const teams = [
        {
          ...createTeam({ tournamentId }),
          group: null,
          _count: { homeMatches: 2, awayMatches: 2, wonMatches: 1 },
        },
        {
          ...createTeam({ tournamentId }),
          group: null,
          _count: { homeMatches: 2, awayMatches: 2, wonMatches: 3 },
        },
      ]

      prismaMock.team.findMany.mockResolvedValue(teams)

      const response = await request(app).get(`/api/tournaments/${tournamentSlug}/teams`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
    })

    it('returns empty array when no teams', async () => {
      prismaMock.team.findMany.mockResolvedValue([])

      const response = await request(app).get(`/api/tournaments/${tournamentSlug}/teams`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual([])
    })

    it('returns 404 for nonexistent tournament', async () => {
      prismaMock.tournament.findUnique.mockResolvedValue(null)

      const response = await request(app).get('/api/tournaments/nonexistent/teams')

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        success: false,
        error: 'Tournament not found',
      })
    })

    it('returns 500 on database error', async () => {
      prismaMock.team.findMany.mockRejectedValue(new Error('DB error'))

      const response = await request(app).get(`/api/tournaments/${tournamentSlug}/teams`)

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch teams',
      })
    })
  })

  describe('POST /api/tournaments/:slug/teams', () => {
    it('creates team with valid data', async () => {
      const newTeam = { ...createTeam({ name: 'New Team', tournamentId }), group: null }

      prismaMock.team.findUnique.mockResolvedValue(null) // No duplicate
      prismaMock.team.create.mockResolvedValue(newTeam)

      const response = await request(app)
        .post(`/api/tournaments/${tournamentSlug}/teams`)
        .set(adminAuthHeader())
        .send({ name: 'New Team' })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe('New Team')
    })

    it('returns 400 for duplicate team name', async () => {
      const existingTeam = createTeam({ name: 'Existing Team', tournamentId })
      prismaMock.team.findUnique.mockResolvedValue(existingTeam)

      const response = await request(app)
        .post(`/api/tournaments/${tournamentSlug}/teams`)
        .set(adminAuthHeader())
        .send({ name: 'Existing Team' })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        success: false,
        error: 'Team with this name already exists in the tournament',
      })
    })

    it('returns 400 for invalid schema', async () => {
      const response = await request(app)
        .post(`/api/tournaments/${tournamentSlug}/teams`)
        .set(adminAuthHeader())
        .send({ name: '' }) // Empty name is invalid

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('returns 401 without admin auth', async () => {
      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false))

      const response = await request(app)
        .post(`/api/tournaments/${tournamentSlug}/teams`)
        .send({ name: 'New Team' })

      expect(response.status).toBe(401)
      expect(response.body).toEqual({
        success: false,
        error: 'Admin access required',
      })
    })

    it('accepts optional fields', async () => {
      const newTeam = {
        ...createTeam({ name: 'Team', shortName: 'TM', seed: 5, tournamentId }),
        group: null,
      }

      prismaMock.team.findUnique.mockResolvedValue(null)
      prismaMock.team.create.mockResolvedValue(newTeam)

      const response = await request(app)
        .post(`/api/tournaments/${tournamentSlug}/teams`)
        .set(adminAuthHeader())
        .send({ name: 'Team', shortName: 'TM', seed: 5 })

      expect(response.status).toBe(201)
      expect(response.body.data).toMatchObject({
        name: 'Team',
        shortName: 'TM',
        seed: 5,
      })
    })
  })

  describe('POST /api/tournaments/:slug/teams/bulk', () => {
    it('creates multiple teams successfully', async () => {
      const teams = [
        createTeam({ name: 'Team 1', seed: 1, tournamentId }),
        createTeam({ name: 'Team 2', seed: 2, tournamentId }),
      ]

      prismaMock.team.create.mockResolvedValueOnce(teams[0]!).mockResolvedValueOnce(teams[1]!)

      const response = await request(app)
        .post(`/api/tournaments/${tournamentSlug}/teams/bulk`)
        .set(adminAuthHeader())
        .send({
          teams: [{ name: 'Team 1' }, { name: 'Team 2' }],
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.created).toHaveLength(2)
      expect(response.body.data.errors).toHaveLength(0)
    })

    it('reports errors separately from successes', async () => {
      const team1 = createTeam({ name: 'Team 1', tournamentId })

      prismaMock.team.create
        .mockResolvedValueOnce(team1)
        .mockRejectedValueOnce(new Error('Duplicate'))

      const response = await request(app)
        .post(`/api/tournaments/${tournamentSlug}/teams/bulk`)
        .set(adminAuthHeader())
        .send({
          teams: [{ name: 'Team 1' }, { name: 'Team 1' }], // Second would be duplicate
        })

      expect(response.status).toBe(201)
      expect(response.body.data.created).toHaveLength(1)
      expect(response.body.data.errors).toHaveLength(1)
      expect(response.body.data.errors[0].index).toBe(1)
    })

    it('returns 400 when teams array is empty', async () => {
      const response = await request(app)
        .post(`/api/tournaments/${tournamentSlug}/teams/bulk`)
        .set(adminAuthHeader())
        .send({ teams: [] })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        success: false,
        error: 'Teams array required',
      })
    })

    it('returns 400 when teams is not an array', async () => {
      const response = await request(app)
        .post(`/api/tournaments/${tournamentSlug}/teams/bulk`)
        .set(adminAuthHeader())
        .send({ teams: 'not-an-array' })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        success: false,
        error: 'Teams array required',
      })
    })

    it('returns 401 without admin auth', async () => {
      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false))

      const response = await request(app)
        .post(`/api/tournaments/${tournamentSlug}/teams/bulk`)
        .send({ teams: [{ name: 'Team' }] })

      expect(response.status).toBe(401)
    })

    it('captures validation errors for invalid team data', async () => {
      const validTeam = createTeam({ name: 'Valid Team', tournamentId })
      prismaMock.team.create.mockResolvedValue(validTeam)

      const response = await request(app)
        .post(`/api/tournaments/${tournamentSlug}/teams/bulk`)
        .set(adminAuthHeader())
        .send({
          teams: [{ name: '' }, { name: 'Valid Team' }], // First is invalid
        })

      expect(response.status).toBe(201)
      expect(response.body.data.created).toHaveLength(1)
      expect(response.body.data.errors).toHaveLength(1)
      expect(response.body.data.errors[0].index).toBe(0)
    })
  })

  describe('GET /api/tournaments/:slug/teams/:teamId', () => {
    it('returns team with match history', async () => {
      const team = {
        ...createTeam({ id: 'team-1', tournamentId }),
        group: null,
        homeMatches: [],
        awayMatches: [],
      }

      prismaMock.team.findFirst.mockResolvedValue(team)

      const response = await request(app).get(`/api/tournaments/${tournamentSlug}/teams/team-1`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('homeMatches')
      expect(response.body.data).toHaveProperty('awayMatches')
    })

    it('returns 404 when team not found', async () => {
      prismaMock.team.findFirst.mockResolvedValue(null)

      const response = await request(app).get(
        `/api/tournaments/${tournamentSlug}/teams/nonexistent`
      )

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        success: false,
        error: 'Team not found',
      })
    })

    it('returns 500 on database error', async () => {
      prismaMock.team.findFirst.mockRejectedValue(new Error('DB error'))

      const response = await request(app).get(`/api/tournaments/${tournamentSlug}/teams/team-1`)

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch team',
      })
    })
  })

  describe('PUT /api/tournaments/:slug/teams/:teamId', () => {
    it('updates team with valid data', async () => {
      const updatedTeam = {
        ...createTeam({ id: 'team-1', name: 'Updated Name', tournamentId }),
        group: null,
      }

      prismaMock.team.updateMany.mockResolvedValue({ count: 1 })
      prismaMock.team.findUnique.mockResolvedValue(updatedTeam)

      const response = await request(app)
        .put(`/api/tournaments/${tournamentSlug}/teams/team-1`)
        .set(adminAuthHeader())
        .send({ name: 'Updated Name' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('returns 404 when team not found', async () => {
      prismaMock.team.updateMany.mockResolvedValue({ count: 0 })

      const response = await request(app)
        .put(`/api/tournaments/${tournamentSlug}/teams/nonexistent`)
        .set(adminAuthHeader())
        .send({ name: 'New Name' })

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        success: false,
        error: 'Team not found',
      })
    })

    it('returns 401 without admin auth', async () => {
      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false))

      const response = await request(app)
        .put(`/api/tournaments/${tournamentSlug}/teams/team-1`)
        .send({ name: 'New Name' })

      expect(response.status).toBe(401)
    })

    it('returns 400 for invalid data', async () => {
      const response = await request(app)
        .put(`/api/tournaments/${tournamentSlug}/teams/team-1`)
        .set(adminAuthHeader())
        .send({ name: '' }) // Empty name is invalid

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /api/tournaments/:slug/teams/:teamId', () => {
    it('deletes team with admin auth', async () => {
      prismaMock.team.deleteMany.mockResolvedValue({ count: 1 })

      const response = await request(app)
        .delete(`/api/tournaments/${tournamentSlug}/teams/team-1`)
        .set(adminAuthHeader())

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ success: true })
    })

    it('returns 404 when team not found', async () => {
      prismaMock.team.deleteMany.mockResolvedValue({ count: 0 })

      const response = await request(app)
        .delete(`/api/tournaments/${tournamentSlug}/teams/nonexistent`)
        .set(adminAuthHeader())

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        success: false,
        error: 'Team not found',
      })
    })

    it('returns 401 without admin auth', async () => {
      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false))

      const response = await request(app).delete(`/api/tournaments/${tournamentSlug}/teams/team-1`)

      expect(response.status).toBe(401)
    })

    it('returns 500 on database error', async () => {
      prismaMock.team.deleteMany.mockRejectedValue(new Error('DB error'))

      const response = await request(app)
        .delete(`/api/tournaments/${tournamentSlug}/teams/team-1`)
        .set(adminAuthHeader())

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to delete team',
      })
    })
  })
})
