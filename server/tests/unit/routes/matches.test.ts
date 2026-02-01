import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { prismaMock } from '../../helpers/prisma-mock.js'
import { socketMocks } from '../../helpers/socket-mock.js'
import { createTestApp } from '../../helpers/test-app.js'
import {
  createTournament,
  createMatch,
  createTeam,
  createBasketballSport,
  createScoreEvent,
} from '../../helpers/factories.js'
import { TEST_PASSWORD_HASH, adminAuthHeader } from '../../helpers/auth.js'

// Mock bcrypt at module level to handle dynamic imports
const mockCompare = vi.fn()
vi.mock('bcrypt', () => ({
  default: {
    compare: (...args: unknown[]) => mockCompare(...args),
    hash: vi.fn().mockResolvedValue('$2b$10$test-hash'),
  },
  compare: (...args: unknown[]) => mockCompare(...args),
  hash: vi.fn().mockResolvedValue('$2b$10$test-hash'),
}))

const app = createTestApp()

describe('matches routes', () => {
  const tournamentSlug = 'test-tournament'
  const tournamentId = 'tournament-1'
  const matchId = 'match-1'

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

    // Reset and setup bcrypt mock
    mockCompare.mockReset()
    mockCompare.mockResolvedValue(true)
  })

  describe('GET /api/tournaments/:slug/matches', () => {
    it('returns matches for tournament', async () => {
      const matches = [
        {
          ...createMatch({ tournamentId }),
          homeTeam: null,
          awayTeam: null,
          winner: null,
          group: null,
        },
        {
          ...createMatch({ tournamentId }),
          homeTeam: null,
          awayTeam: null,
          winner: null,
          group: null,
        },
      ]

      prismaMock.match.findMany.mockResolvedValue(matches)

      const response = await request(app).get(`/api/tournaments/${tournamentSlug}/matches`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
    })

    it('filters by status', async () => {
      prismaMock.match.findMany.mockResolvedValue([])

      await request(app).get(`/api/tournaments/${tournamentSlug}/matches?status=LIVE`)

      expect(prismaMock.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'LIVE' }),
        })
      )
    })

    it('filters by stage', async () => {
      prismaMock.match.findMany.mockResolvedValue([])

      await request(app).get(`/api/tournaments/${tournamentSlug}/matches?stage=FINAL`)

      expect(prismaMock.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ stage: 'FINAL' }),
        })
      )
    })

    it('filters by round', async () => {
      prismaMock.match.findMany.mockResolvedValue([])

      await request(app).get(`/api/tournaments/${tournamentSlug}/matches?round=2`)

      expect(prismaMock.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ round: 2 }),
        })
      )
    })

    it('returns 404 for nonexistent tournament', async () => {
      prismaMock.tournament.findUnique.mockResolvedValue(null)

      const response = await request(app).get('/api/tournaments/nonexistent/matches')

      expect(response.status).toBe(404)
    })

    it('returns 500 on database error', async () => {
      prismaMock.match.findMany.mockRejectedValue(new Error('DB error'))

      const response = await request(app).get(`/api/tournaments/${tournamentSlug}/matches`)

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch matches',
      })
    })
  })

  describe('POST /api/tournaments/:slug/matches', () => {
    it('creates match with admin auth', async () => {
      const newMatch = { ...createMatch({ tournamentId }), homeTeam: null, awayTeam: null }
      prismaMock.match.create.mockResolvedValue(newMatch)

      const response = await request(app)
        .post(`/api/tournaments/${tournamentSlug}/matches`)
        .set(adminAuthHeader())
        .send({ round: 1, matchNumber: 1 })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('returns 401 without admin auth', async () => {
      mockCompare.mockResolvedValue(false)

      const response = await request(app)
        .post(`/api/tournaments/${tournamentSlug}/matches`)
        .send({ round: 1 })

      expect(response.status).toBe(401)
    })

    it('creates match with team IDs', async () => {
      const team1 = createTeam({ id: 'team-1', tournamentId })
      const team2 = createTeam({ id: 'team-2', tournamentId })
      const newMatch = {
        ...createMatch({ tournamentId, homeTeamId: team1.id, awayTeamId: team2.id }),
        homeTeam: team1,
        awayTeam: team2,
      }

      prismaMock.match.create.mockResolvedValue(newMatch)

      const response = await request(app)
        .post(`/api/tournaments/${tournamentSlug}/matches`)
        .set(adminAuthHeader())
        .send({ homeTeamId: 'team-1', awayTeamId: 'team-2' })

      expect(response.status).toBe(201)
      expect(prismaMock.match.create).toHaveBeenCalled()
    })
  })

  describe('GET /api/matches/:matchId', () => {
    it('returns match with relations', async () => {
      const sport = createBasketballSport()
      const tournament = { ...createTournament({ sportId: sport.id }), sport }
      const match = {
        ...createMatch({ id: matchId, tournamentId: tournament.id }),
        homeTeam: null,
        awayTeam: null,
        winner: null,
        group: null,
        tournament,
        scoreEvents: [],
      }

      prismaMock.match.findUnique.mockResolvedValue(match)

      const response = await request(app).get(`/api/matches/${matchId}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('tournament')
    })

    it('returns 404 when match not found', async () => {
      prismaMock.match.findUnique.mockResolvedValue(null)

      const response = await request(app).get('/api/matches/nonexistent')

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        success: false,
        error: 'Match not found',
      })
    })
  })

  describe('POST /api/matches/:matchId/start', () => {
    it('starts a SCHEDULED match', async () => {
      const tournament = createTournament({ adminPasswordHash: TEST_PASSWORD_HASH })
      const match = {
        ...createMatch({ id: matchId, status: 'SCHEDULED', tournamentId: tournament.id }),
        tournament,
      }
      const updatedMatch = { ...match, status: 'LIVE' as const, homeTeam: null, awayTeam: null }

      prismaMock.match.findUnique.mockResolvedValue(match)
      prismaMock.match.update.mockResolvedValue(updatedMatch)

      const response = await request(app)
        .post(`/api/matches/${matchId}/start`)
        .set(adminAuthHeader())

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(socketMocks.broadcastMatchStarted).toHaveBeenCalledWith(
        matchId,
        expect.objectContaining({ matchId })
      )
    })

    it('resumes a PAUSED match', async () => {
      const tournament = createTournament({ adminPasswordHash: TEST_PASSWORD_HASH })
      const match = {
        ...createMatch({ id: matchId, status: 'PAUSED', tournamentId: tournament.id }),
        tournament,
      }
      const updatedMatch = { ...match, status: 'LIVE' as const, homeTeam: null, awayTeam: null }

      prismaMock.match.findUnique.mockResolvedValue(match)
      prismaMock.match.update.mockResolvedValue(updatedMatch)

      const response = await request(app)
        .post(`/api/matches/${matchId}/start`)
        .set(adminAuthHeader())

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('returns 400 for COMPLETED match', async () => {
      const tournament = createTournament({ adminPasswordHash: TEST_PASSWORD_HASH })
      const match = {
        ...createMatch({ id: matchId, status: 'COMPLETED', tournamentId: tournament.id }),
        tournament,
      }

      prismaMock.match.findUnique.mockResolvedValue(match)

      const response = await request(app)
        .post(`/api/matches/${matchId}/start`)
        .set(adminAuthHeader())

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        success: false,
        error: 'Match cannot be started',
      })
    })

    it('returns 401 without admin auth', async () => {
      const tournament = createTournament({ adminPasswordHash: TEST_PASSWORD_HASH })
      const match = {
        ...createMatch({ id: matchId, tournamentId: tournament.id }),
        tournament,
      }

      prismaMock.match.findUnique.mockResolvedValue(match)
      mockCompare.mockResolvedValue(false)

      const response = await request(app)
        .post(`/api/matches/${matchId}/start`)
        .set(adminAuthHeader('wrong'))

      expect(response.status).toBe(401)
    })

    it('broadcasts to tournament room', async () => {
      const tournament = createTournament({ adminPasswordHash: TEST_PASSWORD_HASH })
      const match = {
        ...createMatch({ id: matchId, status: 'SCHEDULED', tournamentId: tournament.id }),
        tournament,
      }
      const updatedMatch = { ...match, status: 'LIVE' as const, homeTeam: null, awayTeam: null }

      prismaMock.match.findUnique.mockResolvedValue(match)
      prismaMock.match.update.mockResolvedValue(updatedMatch)

      await request(app).post(`/api/matches/${matchId}/start`).set(adminAuthHeader())

      expect(socketMocks.broadcastTournamentMatchUpdate).toHaveBeenCalledWith(
        tournament.id,
        expect.objectContaining({ matchId, status: 'LIVE' })
      )
    })
  })

  describe('POST /api/matches/:matchId/pause', () => {
    it('pauses a LIVE match', async () => {
      const tournament = createTournament({ adminPasswordHash: TEST_PASSWORD_HASH })
      const match = {
        ...createMatch({ id: matchId, status: 'LIVE', tournamentId: tournament.id }),
        tournament,
      }
      const updatedMatch = { ...match, status: 'PAUSED' as const, homeTeam: null, awayTeam: null }

      prismaMock.match.findUnique.mockResolvedValue(match)
      prismaMock.match.update.mockResolvedValue(updatedMatch)

      const response = await request(app)
        .post(`/api/matches/${matchId}/pause`)
        .set(adminAuthHeader())

      expect(response.status).toBe(200)
      expect(socketMocks.broadcastMatchPaused).toHaveBeenCalledWith(
        matchId,
        expect.objectContaining({ matchId, status: 'PAUSED' })
      )
    })

    it('returns 400 for non-LIVE match', async () => {
      const tournament = createTournament({ adminPasswordHash: TEST_PASSWORD_HASH })
      const match = {
        ...createMatch({ id: matchId, status: 'SCHEDULED', tournamentId: tournament.id }),
        tournament,
      }

      prismaMock.match.findUnique.mockResolvedValue(match)

      const response = await request(app)
        .post(`/api/matches/${matchId}/pause`)
        .set(adminAuthHeader())

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        success: false,
        error: 'Match is not live',
      })
    })
  })

  describe('POST /api/matches/:matchId/end', () => {
    it('ends match and determines winner', async () => {
      const sport = createBasketballSport()
      const tournament = {
        ...createTournament({ adminPasswordHash: TEST_PASSWORD_HASH, sportId: sport.id }),
        sport,
      }
      const match = {
        ...createMatch({
          id: matchId,
          status: 'LIVE',
          homeScore: 100,
          awayScore: 90,
          homeTeamId: 'team-1',
          awayTeamId: 'team-2',
          tournamentId: tournament.id,
        }),
        tournament,
      }
      const updatedMatch = {
        ...match,
        status: 'COMPLETED' as const,
        winnerId: 'team-1',
        homeTeam: null,
        awayTeam: null,
        winner: null,
      }

      prismaMock.match.findUnique.mockResolvedValue(match)
      prismaMock.match.update.mockResolvedValue(updatedMatch)

      const response = await request(app).post(`/api/matches/${matchId}/end`).set(adminAuthHeader())

      expect(response.status).toBe(200)
      expect(socketMocks.broadcastMatchEnded).toHaveBeenCalledWith(
        matchId,
        expect.objectContaining({ matchId, winnerId: 'team-1' })
      )
    })

    it('handles tied match', async () => {
      const sport = createBasketballSport()
      const tournament = {
        ...createTournament({ adminPasswordHash: TEST_PASSWORD_HASH, sportId: sport.id }),
        sport,
      }
      const match = {
        ...createMatch({
          id: matchId,
          status: 'LIVE',
          homeScore: 90,
          awayScore: 90,
          homeTeamId: 'team-1',
          awayTeamId: 'team-2',
          tournamentId: tournament.id,
        }),
        tournament,
      }
      const updatedMatch = {
        ...match,
        status: 'COMPLETED' as const,
        winnerId: null,
        homeTeam: null,
        awayTeam: null,
        winner: null,
      }

      prismaMock.match.findUnique.mockResolvedValue(match)
      prismaMock.match.update.mockResolvedValue(updatedMatch)

      const response = await request(app).post(`/api/matches/${matchId}/end`).set(adminAuthHeader())

      expect(response.status).toBe(200)
      expect(socketMocks.broadcastMatchEnded).toHaveBeenCalledWith(
        matchId,
        expect.objectContaining({ winnerId: null })
      )
    })
  })

  describe('POST /api/matches/:matchId/score', () => {
    it('adds score and broadcasts', async () => {
      const sport = createBasketballSport()
      const tournament = {
        ...createTournament({ adminPasswordHash: TEST_PASSWORD_HASH, sportId: sport.id }),
        sport,
      }
      const match = {
        ...createMatch({
          id: matchId,
          status: 'LIVE',
          homeScore: 0,
          awayScore: 0,
          homePeriodScores: [0],
          awayPeriodScores: [0],
          currentPeriod: 1,
          tournamentId: tournament.id,
        }),
        tournament,
      }
      const scoreEvent = createScoreEvent({ matchId, teamSide: 'HOME', points: 2 })
      const updatedMatch = {
        ...match,
        homeScore: 2,
        homePeriodScores: [2],
        homeTeam: null,
        awayTeam: null,
      }

      prismaMock.match.findUnique.mockResolvedValue(match)
      prismaMock.scoreEvent.create.mockResolvedValue(scoreEvent)
      prismaMock.match.update.mockResolvedValue(updatedMatch)

      const response = await request(app)
        .post(`/api/matches/${matchId}/score`)
        .set(adminAuthHeader())
        .send({ teamSide: 'HOME', points: 2, action: '2-Point' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(socketMocks.broadcastScoreEvent).toHaveBeenCalledWith(
        matchId,
        expect.objectContaining({ matchId, homeScore: 2 })
      )
    })

    it('returns 400 for invalid points', async () => {
      const sport = createBasketballSport()
      const tournament = {
        ...createTournament({ adminPasswordHash: TEST_PASSWORD_HASH, sportId: sport.id }),
        sport,
      }
      const match = {
        ...createMatch({ id: matchId, status: 'LIVE', tournamentId: tournament.id }),
        tournament,
      }
      prismaMock.match.findUnique.mockResolvedValue(match)

      const response = await request(app)
        .post(`/api/matches/${matchId}/score`)
        .set(adminAuthHeader())
        .send({ teamSide: 'HOME', points: -1, action: 'Test' })

      expect(response.status).toBe(400)
    })

    it('returns 400 for missing teamSide', async () => {
      const sport = createBasketballSport()
      const tournament = {
        ...createTournament({ adminPasswordHash: TEST_PASSWORD_HASH, sportId: sport.id }),
        sport,
      }
      const match = {
        ...createMatch({ id: matchId, status: 'LIVE', tournamentId: tournament.id }),
        tournament,
      }
      prismaMock.match.findUnique.mockResolvedValue(match)

      const response = await request(app)
        .post(`/api/matches/${matchId}/score`)
        .set(adminAuthHeader())
        .send({ points: 2, action: '2-Point' })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/matches/:matchId/undo', () => {
    it('undos last score event', async () => {
      const sport = createBasketballSport()
      const tournament = {
        ...createTournament({ adminPasswordHash: TEST_PASSWORD_HASH, sportId: sport.id }),
        sport,
      }
      const lastEvent = createScoreEvent({ matchId, teamSide: 'HOME', points: 2, period: 1 })
      const match = {
        ...createMatch({
          id: matchId,
          status: 'LIVE',
          homeScore: 2,
          homePeriodScores: [2],
          awayPeriodScores: [0],
          currentPeriod: 1,
          tournamentId: tournament.id,
        }),
        tournament,
        scoreEvents: [lastEvent],
      }
      const updatedMatch = {
        ...match,
        homeScore: 0,
        homePeriodScores: [0],
        homeTeam: null,
        awayTeam: null,
      }

      prismaMock.match.findUnique.mockResolvedValue(match)
      prismaMock.scoreEvent.update.mockResolvedValue({ ...lastEvent, undone: true })
      prismaMock.match.update.mockResolvedValue(updatedMatch)

      const response = await request(app)
        .post(`/api/matches/${matchId}/undo`)
        .set(adminAuthHeader())

      expect(response.status).toBe(200)
      expect(socketMocks.broadcastMatchUpdate).toHaveBeenCalledWith(
        matchId,
        expect.objectContaining({ homeScore: 0 })
      )
    })

    it('returns 400 when no events to undo', async () => {
      const sport = createBasketballSport()
      const tournament = {
        ...createTournament({ adminPasswordHash: TEST_PASSWORD_HASH, sportId: sport.id }),
        sport,
      }
      const match = {
        ...createMatch({ id: matchId, tournamentId: tournament.id }),
        tournament,
        scoreEvents: [],
      }

      prismaMock.match.findUnique.mockResolvedValue(match)

      const response = await request(app)
        .post(`/api/matches/${matchId}/undo`)
        .set(adminAuthHeader())

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        success: false,
        error: 'No score events to undo',
      })
    })
  })

  describe('POST /api/matches/:matchId/next-period', () => {
    it('advances to next period', async () => {
      const sport = createBasketballSport({ periods: 4 })
      const tournament = {
        ...createTournament({ adminPasswordHash: TEST_PASSWORD_HASH, sportId: sport.id }),
        sport,
      }
      const match = {
        ...createMatch({
          id: matchId,
          currentPeriod: 1,
          homePeriodScores: [25],
          awayPeriodScores: [20],
          tournamentId: tournament.id,
        }),
        tournament,
      }
      const updatedMatch = {
        ...match,
        currentPeriod: 2,
        homePeriodScores: [25, 0],
        awayPeriodScores: [20, 0],
        homeTeam: null,
        awayTeam: null,
      }

      prismaMock.match.findUnique.mockResolvedValue(match)
      prismaMock.match.update.mockResolvedValue(updatedMatch)

      const response = await request(app)
        .post(`/api/matches/${matchId}/next-period`)
        .set(adminAuthHeader())

      expect(response.status).toBe(200)
      expect(socketMocks.broadcastPeriodChanged).toHaveBeenCalledWith(
        matchId,
        expect.objectContaining({ currentPeriod: 2 })
      )
    })

    it('returns 400 at final period', async () => {
      const sport = createBasketballSport({ periods: 4 })
      const tournament = {
        ...createTournament({ adminPasswordHash: TEST_PASSWORD_HASH, sportId: sport.id }),
        sport,
      }
      const match = {
        ...createMatch({
          id: matchId,
          currentPeriod: 4, // Already at final period
          tournamentId: tournament.id,
        }),
        tournament,
      }

      prismaMock.match.findUnique.mockResolvedValue(match)

      const response = await request(app)
        .post(`/api/matches/${matchId}/next-period`)
        .set(adminAuthHeader())

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        success: false,
        error: 'Already at final period',
      })
    })
  })

  describe('DELETE /api/matches/:matchId', () => {
    it('deletes SCHEDULED match', async () => {
      const tournament = createTournament({ adminPasswordHash: TEST_PASSWORD_HASH })
      const match = {
        ...createMatch({ id: matchId, status: 'SCHEDULED', tournamentId: tournament.id }),
        tournament,
      }

      prismaMock.match.findUnique.mockResolvedValue(match)
      prismaMock.match.delete.mockResolvedValue(match)

      const response = await request(app).delete(`/api/matches/${matchId}`).set(adminAuthHeader())

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ success: true })
    })

    it('returns 400 for non-SCHEDULED match', async () => {
      const tournament = createTournament({ adminPasswordHash: TEST_PASSWORD_HASH })
      const match = {
        ...createMatch({ id: matchId, status: 'LIVE', tournamentId: tournament.id }),
        tournament,
      }

      prismaMock.match.findUnique.mockResolvedValue(match)

      const response = await request(app).delete(`/api/matches/${matchId}`).set(adminAuthHeader())

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        success: false,
        error: 'Only scheduled matches can be deleted',
      })
    })

    it('returns 401 without admin auth', async () => {
      const tournament = createTournament({ adminPasswordHash: TEST_PASSWORD_HASH })
      const match = {
        ...createMatch({ id: matchId, tournamentId: tournament.id }),
        tournament,
      }

      prismaMock.match.findUnique.mockResolvedValue(match)
      mockCompare.mockResolvedValue(false)

      const response = await request(app).delete(`/api/matches/${matchId}`)

      expect(response.status).toBe(401)
    })

    it('returns 404 when match not found', async () => {
      prismaMock.match.findUnique.mockResolvedValue(null)

      const response = await request(app).delete(`/api/matches/nonexistent`).set(adminAuthHeader())

      expect(response.status).toBe(404)
    })
  })
})
