import type { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../db.js'

// Extend Express Request to include tournament
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tournament?: {
        id: string
        slug: string
        adminPasswordHash: string
      }
      isAdmin?: boolean
    }
  }
}

// Middleware to load tournament and check admin access
export async function loadTournament(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawSlug = req.params.slug ?? req.params.tournamentSlug
    const slug = typeof rawSlug === 'string' ? rawSlug : undefined

    if (slug === undefined || slug.length === 0) {
      res.status(400).json({ success: false, error: 'Tournament slug required' })
      return
    }

    const tournament = await prisma.tournament.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        adminPasswordHash: true,
      },
    })

    if (!tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' })
      return
    }

    req.tournament = tournament

    // Check for admin password in header
    const password = req.headers['x-tournament-password']
    if (typeof password === 'string' && password.length > 0) {
      const isValid = await bcrypt.compare(password, tournament.adminPasswordHash)
      req.isAdmin = isValid
    } else {
      req.isAdmin = false
    }

    next()
  } catch (error) {
    console.error('Error loading tournament:', error)
    res.status(500).json({ success: false, error: 'Failed to load tournament' })
  }
}

// Middleware that requires admin access
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.isAdmin !== true) {
    res.status(401).json({ success: false, error: 'Admin access required' })
    return
  }
  next()
}
