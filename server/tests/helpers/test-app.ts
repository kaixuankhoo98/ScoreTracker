import express, { type Express } from 'express'
import cors from 'cors'
import sportsRouter from '../../src/routes/sports.js'
import tournamentsRouter from '../../src/routes/tournaments.js'
import teamsRouter from '../../src/routes/teams.js'
import matchesRouter from '../../src/routes/matches.js'

export function createTestApp(): Express {
  const app = express()

  // Middleware
  app.use(cors({ origin: '*', credentials: true }))
  app.use(express.json())

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // API Routes
  app.use('/api/sports', sportsRouter)
  app.use('/api/tournaments', tournamentsRouter)
  app.use('/api/tournaments/:slug/teams', teamsRouter)
  app.use('/api/tournaments/:slug/matches', matchesRouter)
  app.use('/api/matches', matchesRouter)

  // Error handler
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Test app error:', err)
      res.status(500).json({ success: false, error: 'Internal server error' })
    }
  )

  // 404 handler for API routes
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ success: false, error: 'Not found' })
    } else {
      res.status(404).send('Not found')
    }
  })

  return app
}
