import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

// GET /api/sports - List all sports
router.get('/', async (_req, res) => {
  try {
    const sports = await prisma.sport.findMany({
      orderBy: { name: 'asc' },
    })

    res.json({ success: true, data: sports })
  } catch (error) {
    console.error('Error fetching sports:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch sports' })
  }
})

// GET /api/sports/:slug - Get sport by slug
router.get('/:slug', async (req, res) => {
  try {
    const sport = await prisma.sport.findUnique({
      where: { slug: req.params['slug'] },
    })

    if (!sport) {
      res.status(404).json({ success: false, error: 'Sport not found' })
      return
    }

    res.json({ success: true, data: sport })
  } catch (error) {
    console.error('Error fetching sport:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch sport' })
  }
})

export default router
