import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { prismaMock } from '../../helpers/prisma-mock.js'
import { createTestApp } from '../../helpers/test-app.js'
import {
  createSport,
  createBasketballSport,
  createVolleyballSport,
  createSoccerSport,
} from '../../helpers/factories.js'

const app = createTestApp()

describe('sports routes', () => {
  describe('GET /api/sports', () => {
    it('returns all sports sorted by name', async () => {
      const sports = [createBasketballSport(), createSoccerSport(), createVolleyballSport()]

      prismaMock.sport.findMany.mockResolvedValue(sports)

      const response = await request(app).get('/api/sports')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(3)
      expect(response.body.data[0].name).toBe('Basketball')
      expect(response.body.data[1].name).toBe('Soccer')
      expect(response.body.data[2].name).toBe('Volleyball')
      expect(prismaMock.sport.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      })
    })

    it('returns empty array when no sports exist', async () => {
      prismaMock.sport.findMany.mockResolvedValue([])

      const response = await request(app).get('/api/sports')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        data: [],
      })
    })

    it('returns 500 on database error', async () => {
      prismaMock.sport.findMany.mockRejectedValue(new Error('Database error'))

      const response = await request(app).get('/api/sports')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch sports',
      })
    })
  })

  describe('GET /api/sports/:slug', () => {
    it('returns sport when found', async () => {
      const basketball = createBasketballSport()
      prismaMock.sport.findUnique.mockResolvedValue(basketball)

      const response = await request(app).get('/api/sports/basketball')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        name: 'Basketball',
        slug: 'basketball',
        periods: 4,
        periodName: 'Quarter',
        scoreIncrements: [1, 2, 3],
      })
      expect(prismaMock.sport.findUnique).toHaveBeenCalledWith({
        where: { slug: 'basketball' },
      })
    })

    it('returns 404 when sport not found', async () => {
      prismaMock.sport.findUnique.mockResolvedValue(null)

      const response = await request(app).get('/api/sports/nonexistent')

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        success: false,
        error: 'Sport not found',
      })
    })

    it('returns sport with all fields', async () => {
      const volleyball = createVolleyballSport({
        id: 'sport-volleyball',
        description: 'A fun team sport',
      })
      prismaMock.sport.findUnique.mockResolvedValue(volleyball)

      const response = await request(app).get('/api/sports/volleyball')

      expect(response.status).toBe(200)
      expect(response.body.data).toMatchObject({
        id: 'sport-volleyball',
        name: 'Volleyball',
        slug: 'volleyball',
        description: 'A fun team sport',
        periods: 5,
        periodName: 'Set',
        scoreIncrements: [1],
        scoreLabels: ['Point'],
        pointsToWinPeriod: 25,
        canTie: false,
      })
    })

    it('returns 500 on database error', async () => {
      prismaMock.sport.findUnique.mockRejectedValue(new Error('Database error'))

      const response = await request(app).get('/api/sports/basketball')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch sport',
      })
    })
  })
})
