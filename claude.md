# ScoreTracker Development Guidelines

## Project Overview

ScoreTracker is a full-stack TypeScript monorepo for live tournament scoring.

**Stack:**

- Frontend: React 19 + Vite 7 + TanStack Query 5
- Backend: Express 5 + Prisma 5 + PostgreSQL 16
- Real-time: Socket.io
- Shared: Zod schemas + TypeScript types

**Workspaces:**

- `client/` - React SPA
- `server/` - Express API
- `shared/` - Shared types and schemas (`@scoretracker/shared`)

---

## TypeScript Conventions

### Strict Mode

All packages use strict TypeScript with these additional flags:

- `noUncheckedIndexedAccess: true` - Array/object access returns `T | undefined`
- `exactOptionalPropertyTypes: true` - Distinguishes `undefined` from missing
- `noImplicitReturns: true`

### Path Aliases

```typescript
// Client
import { Button } from '@/components/ui/button'
import { useTournament } from '@/api/tournaments'

// Both client and server
import type { Team, Match } from '@shared/schemas'
import { CreateMatchSchema } from '@shared/schemas'
```

### Type-Only Imports

Always use `type` keyword for type-only imports:

```typescript
import type { Team, Match } from '@shared/schemas'
import { type ReactNode, useState } from 'react'
```

---

## API Patterns

### Response Format

All API responses follow this structure:

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  pagination?: { total: number; page: number; limit: number }
}
```

### Server Route Pattern

```typescript
router.post('/', async (req, res) => {
  try {
    const parsed = CreateTournamentSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message })
      return
    }

    const result = await prisma.tournament.create({ data: parsed.data })
    res.status(201).json({ success: true, data: result })
  } catch (error) {
    console.error('Error creating tournament:', error)
    res.status(500).json({ success: false, error: 'Failed to create tournament' })
  }
})
```

### Client API Fetching

Use TanStack Query with query key factories:

```typescript
export const tournamentKeys = {
  all: ['tournaments'] as const,
  lists: () => [...tournamentKeys.all, 'list'] as const,
  detail: (slug: string) => [...tournamentKeys.all, 'detail', slug] as const,
}

export function useTournament(slug: string) {
  return useQuery({
    queryKey: tournamentKeys.detail(slug),
    queryFn: () => fetchTournament(slug),
    enabled: slug.length > 0,
    staleTime: 1000 * 10,
  })
}
```

---

## Zod Schema Patterns

### Shared Validation

Schemas in `shared/src/schemas.ts` are used by both client and server:

```typescript
export const CreateTeamSchema = z.object({
  name: z.string().min(1).max(100),
  shortName: z.string().min(1).max(10).optional(),
  seed: z.number().int().positive().optional(),
})

export type CreateTeam = z.infer<typeof CreateTeamSchema>
```

### Server Validation

```typescript
const parsed = CreateTeamSchema.safeParse(req.body)
if (!parsed.success) {
  res.status(400).json({ success: false, error: parsed.error.message })
  return
}
// parsed.data is now typed
```

---

## React Component Patterns

### Functional Components with Props Interface

```typescript
interface MatchCardProps {
  match: MatchWithRelations
  tournamentSlug: string
  sport: { periodName: string; pointsToWinPeriod?: number | null }
}

export function MatchCard({ match, tournamentSlug, sport }: MatchCardProps) {
  // Component logic
}
```

### Loading/Error States

```typescript
if (isLoading) {
  return <div className="animate-pulse">Loading...</div>
}

if (error instanceof Error) {
  return <Card><CardContent><p>{error.message}</p></CardContent></Card>
}

if (data === undefined) {
  return <Card><CardContent><p>Not found</p></CardContent></Card>
}

// Render success state
```

### Shadcn/ui Components

UI components in `client/src/components/ui/` use:

- Radix UI primitives
- `class-variance-authority` (CVA) for variants
- `cn()` utility from `@/lib/utils` for class merging

```typescript
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

<Button variant="destructive" size="sm" className={cn('mt-2', isActive && 'ring-2')}>
  Delete
</Button>
```

---

## Socket.io Events

### Type-Safe Events

Events are defined in `shared/src/socket-events.ts`:

```typescript
export interface ServerToClientEvents {
  match_update: (data: MatchUpdatePayload) => void
  score_event: (data: ScoreEventPayload) => void
}

export interface ClientToServerEvents {
  join_match: (matchId: string) => void
  leave_match: (matchId: string) => void
}
```

### Client Usage

```typescript
const { socket, isConnected } = useSocket()

useEffect(() => {
  if (!isConnected) return
  socket.emit('join_match', matchId)
  socket.on('match_update', handleUpdate)
  return () => {
    socket.emit('leave_match', matchId)
    socket.off('match_update', handleUpdate)
  }
}, [isConnected, matchId])
```

---

## Styling

### Tailwind CSS v4

- OKLCH color system with CSS variables
- Dark mode via `.dark` class on `<html>`
- Utility-first approach

### Color Variables

```css
/* Light mode */
--background: oklch(1 0 0);
--foreground: oklch(0.145 0 0);
--primary: oklch(0.205 0 0);

/* Dark mode */
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
}
```

---

## File Naming

- Components: `PascalCase.tsx` (e.g., `MatchCard.tsx`)
- Hooks: `camelCase.ts` (e.g., `useSocket.ts`)
- Utils/API: `camelCase.ts` (e.g., `tournaments.ts`)
- Tests: `*.test.ts` or `*.test.tsx`

---

## Environment Variables

### Server (.env)

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/scoretracker"
PORT=3000
NODE_ENV=development
CORS_ORIGINS="http://localhost:5173,http://localhost:3000"
```

### Client

Uses Vite proxy in development - no client-side env vars needed.

---

## Commands

```bash
# Development
npm run dev              # Run client (5173) + server (3000)

# Database
npm run db:push          # Sync schema to database
npm run db:seed          # Seed database

# Linting
npm run lint             # Lint all packages

# Type Checking (no root tsconfig - must run per package)
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit
cd shared && npx tsc --noEmit

# Testing
npm test                 # Run all tests (client + server + shared)
npm run test:client      # Cypress component tests
npm run test:server      # Vitest
npm run test:shared      # Vitest

# Build
npm run build            # Build for production
```
