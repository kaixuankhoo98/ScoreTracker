import { Link, Outlet } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-6 flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Trophy className="h-5 w-5" />
            <span>ScoreTracker</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
