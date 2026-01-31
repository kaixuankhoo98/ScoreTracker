import { Router } from 'express'
import { prisma } from '../db.js'
import { loadTournament, requireAdmin } from '../middleware/auth.js'
import { CreateTeamSchema, UpdateTeamSchema } from '../../../shared/src/schemas.js'

const router = Router({ mergeParams: true })

// Helper to safely get string param
function getStringParam(param: string | string[] | undefined): string | undefined {
  return typeof param === 'string' ? param : undefined
}

// GET /api/tournaments/:slug/teams - List teams
router.get('/', loadTournament, async (req, res) => {
  try {
    if (!req.tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' })
      return
    }

    const teams = await prisma.team.findMany({
      where: { tournamentId: req.tournament.id },
      include: {
        group: true,
        _count: {
          select: {
            homeMatches: true,
            awayMatches: true,
            wonMatches: true,
          },
        },
      },
      orderBy: [{ seed: 'asc' }, { name: 'asc' }],
    })

    res.json({ success: true, data: teams })
  } catch (error) {
    console.error('Error fetching teams:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch teams' })
  }
})

// POST /api/tournaments/:slug/teams - Add team (admin only)
router.post('/', loadTournament, requireAdmin, async (req, res) => {
  try {
    if (!req.tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' })
      return
    }

    const parsed = CreateTeamSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message })
      return
    }

    // Check for duplicate name
    const existing = await prisma.team.findUnique({
      where: {
        tournamentId_name: {
          tournamentId: req.tournament.id,
          name: parsed.data.name,
        },
      },
    })

    if (existing) {
      res.status(400).json({
        success: false,
        error: 'Team with this name already exists in the tournament',
      })
      return
    }

    const team = await prisma.team.create({
      data: {
        ...parsed.data,
        tournamentId: req.tournament.id,
      },
      include: { group: true },
    })

    res.status(201).json({ success: true, data: team })
  } catch (error) {
    console.error('Error creating team:', error)
    res.status(500).json({ success: false, error: 'Failed to create team' })
  }
})

// POST /api/tournaments/:slug/teams/bulk - Add multiple teams (admin only)
router.post('/bulk', loadTournament, requireAdmin, async (req, res) => {
  try {
    if (!req.tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' })
      return
    }

    const { teams } = req.body as { teams: unknown[] }

    if (!Array.isArray(teams) || teams.length === 0) {
      res.status(400).json({ success: false, error: 'Teams array required' })
      return
    }

    const created = []
    const errors = []

    for (let i = 0; i < teams.length; i++) {
      const parsed = CreateTeamSchema.safeParse(teams[i])
      if (!parsed.success) {
        errors.push({ index: i, error: parsed.error.message })
        continue
      }

      try {
        const team = await prisma.team.create({
          data: {
            ...parsed.data,
            tournamentId: req.tournament.id,
            seed: parsed.data.seed ?? i + 1,
          },
        })
        created.push(team)
      } catch {
        errors.push({ index: i, error: 'Team name may already exist' })
      }
    }

    res.status(201).json({
      success: true,
      data: { created, errors },
    })
  } catch (error) {
    console.error('Error creating teams:', error)
    res.status(500).json({ success: false, error: 'Failed to create teams' })
  }
})

// GET /api/tournaments/:slug/teams/:teamId - Get team
router.get('/:teamId', loadTournament, async (req, res) => {
  try {
    if (!req.tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' })
      return
    }

    const teamId = getStringParam(req.params.teamId)
    if (teamId === undefined || teamId.length === 0) {
      res.status(400).json({ success: false, error: 'Team ID required' })
      return
    }

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        tournamentId: req.tournament.id,
      },
      include: {
        group: true,
        homeMatches: {
          include: { awayTeam: true, winner: true },
          orderBy: { matchNumber: 'asc' },
        },
        awayMatches: {
          include: { homeTeam: true, winner: true },
          orderBy: { matchNumber: 'asc' },
        },
      },
    })

    if (!team) {
      res.status(404).json({ success: false, error: 'Team not found' })
      return
    }

    res.json({ success: true, data: team })
  } catch (error) {
    console.error('Error fetching team:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch team' })
  }
})

// PUT /api/tournaments/:slug/teams/:teamId - Update team (admin only)
router.put('/:teamId', loadTournament, requireAdmin, async (req, res) => {
  try {
    if (!req.tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' })
      return
    }

    const teamId = getStringParam(req.params.teamId)
    if (teamId === undefined || teamId.length === 0) {
      res.status(400).json({ success: false, error: 'Team ID required' })
      return
    }

    const parsed = UpdateTeamSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message })
      return
    }

    const team = await prisma.team.updateMany({
      where: {
        id: teamId,
        tournamentId: req.tournament.id,
      },
      data: parsed.data,
    })

    if (team.count === 0) {
      res.status(404).json({ success: false, error: 'Team not found' })
      return
    }

    const updated = await prisma.team.findUnique({
      where: { id: teamId },
      include: { group: true },
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating team:', error)
    res.status(500).json({ success: false, error: 'Failed to update team' })
  }
})

// DELETE /api/tournaments/:slug/teams/:teamId - Delete team (admin only)
router.delete('/:teamId', loadTournament, requireAdmin, async (req, res) => {
  try {
    if (!req.tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' })
      return
    }

    const teamId = getStringParam(req.params.teamId)
    if (teamId === undefined || teamId.length === 0) {
      res.status(400).json({ success: false, error: 'Team ID required' })
      return
    }

    const team = await prisma.team.deleteMany({
      where: {
        id: teamId,
        tournamentId: req.tournament.id,
      },
    })

    if (team.count === 0) {
      res.status(404).json({ success: false, error: 'Team not found' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting team:', error)
    res.status(500).json({ success: false, error: 'Failed to delete team' })
  }
})

export default router
