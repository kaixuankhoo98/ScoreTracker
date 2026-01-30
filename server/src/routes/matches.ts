import { Router } from 'express'
import { prisma } from '../db.js'
import { loadTournament, requireAdmin } from '../middleware/auth.js'
import {
  CreateMatchSchema,
  UpdateMatchSchema,
  AddScoreSchema,
} from '../../../shared/src/schemas.js'
import { getSportHandler, type MatchState } from '../../../shared/src/sports.js'
import {
  broadcastMatchUpdate,
  broadcastScoreEvent,
  broadcastMatchStarted,
  broadcastMatchEnded,
  broadcastMatchPaused,
  broadcastPeriodChanged,
} from '../socket/server.js'

const router = Router({ mergeParams: true })

// GET /api/tournaments/:slug/matches - List matches
router.get('/', loadTournament, async (req, res) => {
  try {
    if (!req.tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' })
      return
    }

    const stage = req.query['stage'] as string | undefined
    const status = req.query['status'] as string | undefined
    const round = req.query['round'] as string | undefined

    const where: Record<string, unknown> = { tournamentId: req.tournament.id }
    if (stage) where['stage'] = stage
    if (status) where['status'] = status
    if (round) where['round'] = parseInt(round, 10)

    const matches = await prisma.match.findMany({
      where,
      include: {
        homeTeam: true,
        awayTeam: true,
        winner: true,
        group: true,
      },
      orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
    })

    res.json({ success: true, data: matches })
  } catch (error) {
    console.error('Error fetching matches:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch matches' })
  }
})

// POST /api/tournaments/:slug/matches - Create match (admin only)
router.post('/', loadTournament, requireAdmin, async (req, res) => {
  try {
    if (!req.tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' })
      return
    }

    const parsed = CreateMatchSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message })
      return
    }

    const match = await prisma.match.create({
      data: {
        ...parsed.data,
        tournamentId: req.tournament.id,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    })

    res.status(201).json({ success: true, data: match })
  } catch (error) {
    console.error('Error creating match:', error)
    res.status(500).json({ success: false, error: 'Failed to create match' })
  }
})

// GET /api/matches/:matchId - Get match by ID
router.get('/:matchId', async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params['matchId'] },
      include: {
        homeTeam: true,
        awayTeam: true,
        winner: true,
        group: true,
        tournament: {
          include: { sport: true },
        },
        scoreEvents: {
          where: { undone: false },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found' })
      return
    }

    res.json({ success: true, data: match })
  } catch (error) {
    console.error('Error fetching match:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch match' })
  }
})

// PUT /api/matches/:matchId - Update match (admin only)
router.put('/:matchId', async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params['matchId'] },
      include: { tournament: true },
    })

    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found' })
      return
    }

    // Check admin password
    const password = req.headers['x-tournament-password']
    if (typeof password !== 'string') {
      res.status(401).json({ success: false, error: 'Admin access required' })
      return
    }

    const bcrypt = await import('bcrypt')
    const isValid = await bcrypt.compare(password, match.tournament.adminPasswordHash)
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid password' })
      return
    }

    const parsed = UpdateMatchSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message })
      return
    }

    const updated = await prisma.match.update({
      where: { id: req.params['matchId'] },
      data: parsed.data,
      include: {
        homeTeam: true,
        awayTeam: true,
        winner: true,
      },
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating match:', error)
    res.status(500).json({ success: false, error: 'Failed to update match' })
  }
})

// POST /api/matches/:matchId/start - Start match (admin only)
router.post('/:matchId/start', async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params['matchId'] },
      include: { tournament: true },
    })

    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found' })
      return
    }

    // Check admin password
    const password = req.headers['x-tournament-password']
    if (typeof password !== 'string') {
      res.status(401).json({ success: false, error: 'Admin access required' })
      return
    }

    const bcrypt = await import('bcrypt')
    const isValid = await bcrypt.compare(password, match.tournament.adminPasswordHash)
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid password' })
      return
    }

    if (match.status !== 'SCHEDULED' && match.status !== 'PAUSED') {
      res.status(400).json({ success: false, error: 'Match cannot be started' })
      return
    }

    const startedAt = new Date()
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: 'LIVE',
        startedAt: match.startedAt ?? startedAt,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    })

    // Broadcast match started
    broadcastMatchStarted(match.id, {
      matchId: match.id,
      startedAt: startedAt.toISOString(),
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error starting match:', error)
    res.status(500).json({ success: false, error: 'Failed to start match' })
  }
})

// POST /api/matches/:matchId/pause - Pause match (admin only)
router.post('/:matchId/pause', async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params['matchId'] },
      include: { tournament: true },
    })

    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found' })
      return
    }

    // Check admin password
    const password = req.headers['x-tournament-password']
    if (typeof password !== 'string') {
      res.status(401).json({ success: false, error: 'Admin access required' })
      return
    }

    const bcrypt = await import('bcrypt')
    const isValid = await bcrypt.compare(password, match.tournament.adminPasswordHash)
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid password' })
      return
    }

    if (match.status !== 'LIVE') {
      res.status(400).json({ success: false, error: 'Match is not live' })
      return
    }

    const updated = await prisma.match.update({
      where: { id: match.id },
      data: { status: 'PAUSED' },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    })

    broadcastMatchPaused(match.id, {
      matchId: match.id,
      status: 'PAUSED',
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error pausing match:', error)
    res.status(500).json({ success: false, error: 'Failed to pause match' })
  }
})

// POST /api/matches/:matchId/end - End match (admin only)
router.post('/:matchId/end', async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params['matchId'] },
      include: { tournament: { include: { sport: true } } },
    })

    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found' })
      return
    }

    // Check admin password
    const password = req.headers['x-tournament-password']
    if (typeof password !== 'string') {
      res.status(401).json({ success: false, error: 'Admin access required' })
      return
    }

    const bcrypt = await import('bcrypt')
    const isValid = await bcrypt.compare(password, match.tournament.adminPasswordHash)
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid password' })
      return
    }

    // Determine winner
    let winnerId: string | null = null
    if (match.homeScore > match.awayScore) {
      winnerId = match.homeTeamId
    } else if (match.awayScore > match.homeScore) {
      winnerId = match.awayTeamId
    }
    // If tied and sport doesn't allow ties, leave winnerId null (admin can resolve)

    const endedAt = new Date()
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: 'COMPLETED',
        winnerId,
        endedAt,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        winner: true,
      },
    })

    broadcastMatchEnded(match.id, {
      matchId: match.id,
      winnerId,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      endedAt: endedAt.toISOString(),
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error ending match:', error)
    res.status(500).json({ success: false, error: 'Failed to end match' })
  }
})

// POST /api/matches/:matchId/score - Add score (admin only)
router.post('/:matchId/score', async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params['matchId'] },
      include: { tournament: { include: { sport: true } } },
    })

    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found' })
      return
    }

    // Check admin password
    const password = req.headers['x-tournament-password']
    if (typeof password !== 'string') {
      res.status(401).json({ success: false, error: 'Admin access required' })
      return
    }

    const bcrypt = await import('bcrypt')
    const isValid = await bcrypt.compare(password, match.tournament.adminPasswordHash)
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid password' })
      return
    }

    const parsed = AddScoreSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message })
      return
    }

    const { teamSide, points, action } = parsed.data

    // Get sport handler
    const handler = getSportHandler(match.tournament.sport)

    // Create match state
    const state: MatchState = {
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homePeriodScores: match.homePeriodScores,
      awayPeriodScores: match.awayPeriodScores,
      currentPeriod: match.currentPeriod,
      status: match.status,
    }

    // Apply score
    const result = handler.applyScore(state, teamSide, points)

    if (!result.valid) {
      res.status(400).json({ success: false, error: result.message ?? 'Invalid action' })
      return
    }

    // Create score event
    const scoreEvent = await prisma.scoreEvent.create({
      data: {
        matchId: match.id,
        teamSide,
        points,
        period: match.currentPeriod,
        action,
      },
    })

    // Update match
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        homeScore: result.newState.homeScore,
        awayScore: result.newState.awayScore,
        homePeriodScores: result.newState.homePeriodScores,
        awayPeriodScores: result.newState.awayPeriodScores,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    })

    // Broadcast score event
    broadcastScoreEvent(match.id, {
      matchId: match.id,
      event: {
        id: scoreEvent.id,
        matchId: scoreEvent.matchId,
        teamSide: scoreEvent.teamSide,
        points: scoreEvent.points,
        period: scoreEvent.period,
        action: scoreEvent.action,
        undone: scoreEvent.undone,
        createdAt: scoreEvent.createdAt.toISOString(),
      },
      homeScore: updated.homeScore,
      awayScore: updated.awayScore,
      homePeriodScores: updated.homePeriodScores,
      awayPeriodScores: updated.awayPeriodScores,
    })

    res.json({ success: true, data: { match: updated, event: scoreEvent } })
  } catch (error) {
    console.error('Error adding score:', error)
    res.status(500).json({ success: false, error: 'Failed to add score' })
  }
})

// POST /api/matches/:matchId/undo - Undo last score (admin only)
router.post('/:matchId/undo', async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params['matchId'] },
      include: {
        tournament: { include: { sport: true } },
        scoreEvents: {
          where: { undone: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found' })
      return
    }

    // Check admin password
    const password = req.headers['x-tournament-password']
    if (typeof password !== 'string') {
      res.status(401).json({ success: false, error: 'Admin access required' })
      return
    }

    const bcrypt = await import('bcrypt')
    const isValid = await bcrypt.compare(password, match.tournament.adminPasswordHash)
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid password' })
      return
    }

    const lastEvent = match.scoreEvents[0]
    if (!lastEvent) {
      res.status(400).json({ success: false, error: 'No score events to undo' })
      return
    }

    // Get sport handler
    const handler = getSportHandler(match.tournament.sport)

    // Create match state
    const state: MatchState = {
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homePeriodScores: match.homePeriodScores,
      awayPeriodScores: match.awayPeriodScores,
      currentPeriod: match.currentPeriod,
      status: match.status,
    }

    // Undo score
    const newState = handler.undoScore(
      state,
      lastEvent.teamSide,
      lastEvent.points,
      lastEvent.period
    )

    // Mark event as undone
    await prisma.scoreEvent.update({
      where: { id: lastEvent.id },
      data: { undone: true },
    })

    // Update match
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        homeScore: newState.homeScore,
        awayScore: newState.awayScore,
        homePeriodScores: newState.homePeriodScores,
        awayPeriodScores: newState.awayPeriodScores,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    })

    // Broadcast update
    broadcastMatchUpdate(match.id, {
      matchId: match.id,
      homeScore: updated.homeScore,
      awayScore: updated.awayScore,
      homePeriodScores: updated.homePeriodScores,
      awayPeriodScores: updated.awayPeriodScores,
      currentPeriod: updated.currentPeriod,
      status: updated.status,
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error undoing score:', error)
    res.status(500).json({ success: false, error: 'Failed to undo score' })
  }
})

// POST /api/matches/:matchId/next-period - Advance to next period (admin only)
router.post('/:matchId/next-period', async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params['matchId'] },
      include: { tournament: { include: { sport: true } } },
    })

    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found' })
      return
    }

    // Check admin password
    const password = req.headers['x-tournament-password']
    if (typeof password !== 'string') {
      res.status(401).json({ success: false, error: 'Admin access required' })
      return
    }

    const bcrypt = await import('bcrypt')
    const isValid = await bcrypt.compare(password, match.tournament.adminPasswordHash)
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid password' })
      return
    }

    const sport = match.tournament.sport
    if (match.currentPeriod >= sport.periods) {
      res.status(400).json({ success: false, error: 'Already at final period' })
      return
    }

    const newPeriod = match.currentPeriod + 1
    const homePeriodScores = [...match.homePeriodScores, 0]
    const awayPeriodScores = [...match.awayPeriodScores, 0]

    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        currentPeriod: newPeriod,
        homePeriodScores,
        awayPeriodScores,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    })

    broadcastPeriodChanged(match.id, {
      matchId: match.id,
      currentPeriod: newPeriod,
      homePeriodScores,
      awayPeriodScores,
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error advancing period:', error)
    res.status(500).json({ success: false, error: 'Failed to advance period' })
  }
})

export default router
