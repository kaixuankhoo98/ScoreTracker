import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initializeSocket } from './socket/server.js'
import sportsRouter from './routes/sports.js'
import tournamentsRouter from './routes/tournaments.js'
import teamsRouter from './routes/teams.js'
import matchesRouter from './routes/matches.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const httpServer = createServer(app)

// Configuration
const PORT = parseInt(process.env['PORT'] ?? '3000', 10)
const NODE_ENV = process.env['NODE_ENV'] ?? 'development'
const CORS_ORIGINS = (process.env['CORS_ORIGINS'] ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())

// Middleware
app.use(cors({ origin: CORS_ORIGINS, credentials: true }))
app.use(express.json())

// Request logging in development
if (NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`)
    next()
  })
}

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

// Serve static files in production
if (NODE_ENV === 'production') {
  const publicPath = join(__dirname, '..', 'public')
  app.use(express.static(publicPath))

  // SPA fallback - serve index.html for client-side routing
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      next()
      return
    }
    res.sendFile(join(publicPath, 'index.html'))
  })
}

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err)
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

// Initialize Socket.io
initializeSocket(httpServer, CORS_ORIGINS)

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Environment: ${NODE_ENV}`)
  if (NODE_ENV !== 'production') {
    console.log(`CORS origins: ${CORS_ORIGINS.join(', ')}`)
  }
})
