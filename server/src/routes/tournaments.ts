import { Router } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../db.js'
import { generateSlug, getPagination } from '../utils.js'
import { loadTournament, requireAdmin } from '../middleware/auth.js'
import {
  CreateTournamentSchema,
  UpdateTournamentSchema,
  VerifyPasswordSchema,
  GenerateMatchesSchema,
} from '../../../shared/src/schemas.js'
import { generateTournamentMatches } from '../../../shared/src/tournament-formats.js'

const router = Router()

// Helper to safely get string param
function getStringParam(param: string | string[] | undefined): string | undefined {
  return typeof param === 'string' ? param : undefined
}

// GET /api/tournaments - List tournaments
router.get('/', async (req, res) => {
  try {
    const { skip, take } = getPagination(
      req.query.page as string | undefined,
      req.query.limit as string | undefined
    )
    const status = req.query.status as string | undefined

    const where = status !== undefined && status.length > 0 ? { status: status as never } : {}

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          sport: true,
          _count: {
            select: { teams: true, matches: true },
          },
        },
      }),
      prisma.tournament.count({ where }),
    ])

    // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const safeData = tournaments.map(({ adminPasswordHash, ...t }) => t)

    res.json({
      success: true,
      data: safeData,
      pagination: { total, page: Math.floor(skip / take) + 1, limit: take },
    })
  } catch (error) {
    console.error('Error fetching tournaments:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch tournaments' })
  }
})

// POST /api/tournaments - Create tournament
router.post('/', async (req, res) => {
  try {
    const parsed = CreateTournamentSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message })
      return
    }

    const { adminPassword, ...data } = parsed.data

    // Hash password
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10)

    // Generate unique slug
    const slug = generateSlug(data.name)

    const tournament = await prisma.tournament.create({
      data: {
        ...data,
        slug,
        adminPasswordHash,
      },
      include: {
        sport: true,
      },
    })

    // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { adminPasswordHash: _hash, ...safeData } = tournament

    res.status(201).json({ success: true, data: safeData })
  } catch (error) {
    console.error('Error creating tournament:', error)
    res.status(500).json({ success: false, error: 'Failed to create tournament' })
  }
})

// GET /api/tournaments/:slug - Get tournament by slug
router.get('/:slug', async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { slug: req.params.slug },
      include: {
        sport: true,
        teams: {
          orderBy: { seed: 'asc' },
        },
        groups: {
          include: {
            teams: true,
          },
        },
        matches: {
          include: {
            homeTeam: true,
            awayTeam: true,
            winner: true,
          },
          orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
        },
        _count: {
          select: { teams: true, matches: true },
        },
      },
    })

    if (!tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' })
      return
    }

    // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { adminPasswordHash: _hash, ...safeData } = tournament

    res.json({ success: true, data: safeData })
  } catch (error) {
    console.error('Error fetching tournament:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch tournament' })
  }
})

// PUT /api/tournaments/:slug - Update tournament (admin only)
router.put('/:slug', loadTournament, requireAdmin, async (req, res) => {
  try {
    const slug = getStringParam(req.params.slug)
    if (slug === undefined || slug.length === 0) {
      res.status(400).json({ success: false, error: 'Slug required' })
      return
    }

    const parsed = UpdateTournamentSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message })
      return
    }

    const tournament = await prisma.tournament.update({
      where: { slug },
      data: parsed.data,
      include: { sport: true },
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { adminPasswordHash, ...safeData } = tournament

    res.json({ success: true, data: safeData })
  } catch (error) {
    console.error('Error updating tournament:', error)
    res.status(500).json({ success: false, error: 'Failed to update tournament' })
  }
})

// DELETE /api/tournaments/:slug - Delete tournament (admin only)
router.delete('/:slug', loadTournament, requireAdmin, async (req, res) => {
  try {
    const slug = getStringParam(req.params.slug)
    if (slug === undefined || slug.length === 0) {
      res.status(400).json({ success: false, error: 'Slug required' })
      return
    }

    await prisma.tournament.delete({
      where: { slug },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting tournament:', error)
    res.status(500).json({ success: false, error: 'Failed to delete tournament' })
  }
})

// POST /api/tournaments/:slug/verify-password - Verify admin password
router.post('/:slug/verify-password', loadTournament, async (req, res) => {
  try {
    const parsed = VerifyPasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message })
      return
    }

    if (!req.tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' })
      return
    }

    const isValid = await bcrypt.compare(parsed.data.password, req.tournament.adminPasswordHash)

    res.json({ success: true, data: { valid: isValid } })
  } catch (error) {
    console.error('Error verifying password:', error)
    res.status(500).json({ success: false, error: 'Failed to verify password' })
  }
})

// POST /api/tournaments/:slug/generate-matches - Generate matches based on format
router.post('/:slug/generate-matches', loadTournament, requireAdmin, async (req, res) => {
  try {
    const parsed = GenerateMatchesSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message })
      return
    }

    if (!req.tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' })
      return
    }

    // Get tournament with teams
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.tournament.id },
      include: {
        teams: { orderBy: { seed: 'asc' } },
        groups: true,
      },
    })

    if (!tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' })
      return
    }

    if (tournament.teams.length < 2) {
      res.status(400).json({
        success: false,
        error: 'At least 2 teams required to generate matches',
      })
      return
    }

    // Delete existing matches and groups
    await prisma.match.deleteMany({
      where: { tournamentId: tournament.id },
    })
    await prisma.tournamentGroup.deleteMany({
      where: { tournamentId: tournament.id },
    })

    // Generate tournament structure
    const options: { groupCount?: number; advancingPerGroup?: number } = {}
    if (parsed.data.groupCount !== undefined) {
      options.groupCount = parsed.data.groupCount
    }
    if (parsed.data.advancingPerGroup !== undefined) {
      options.advancingPerGroup = parsed.data.advancingPerGroup
    }
    const generated = generateTournamentMatches(tournament.format, tournament.teams.length, options)

    // Create groups if any
    const groupMap = new Map<number, string>()
    for (let i = 0; i < generated.groups.length; i++) {
      const groupData = generated.groups[i]
      if (!groupData) continue

      const group = await prisma.tournamentGroup.create({
        data: {
          name: groupData.name,
          tournamentId: tournament.id,
        },
      })
      groupMap.set(i, group.id)

      // Assign teams to groups
      for (const teamIndex of groupData.teamIndices) {
        const team = tournament.teams[teamIndex]
        if (team) {
          await prisma.team.update({
            where: { id: team.id },
            data: { groupId: group.id },
          })
        }
      }
    }

    // Create matches
    const matches = []
    for (const match of generated.matches) {
      const homeTeam = match.homeTeamIndex !== null ? tournament.teams[match.homeTeamIndex] : null
      const awayTeam = match.awayTeamIndex !== null ? tournament.teams[match.awayTeamIndex] : null
      const groupId = match.groupIndex !== undefined ? groupMap.get(match.groupIndex) : null

      const created = await prisma.match.create({
        data: {
          tournamentId: tournament.id,
          homeTeamId: homeTeam?.id ?? null,
          awayTeamId: awayTeam?.id ?? null,
          groupId: groupId ?? null,
          round: match.round,
          matchNumber: match.matchNumber,
          stage: match.stage,
        },
      })
      matches.push(created)
    }

    res.json({ success: true, data: { matchCount: matches.length } })
  } catch (error) {
    console.error('Error generating matches:', error)
    res.status(500).json({ success: false, error: 'Failed to generate matches' })
  }
})

export default router
