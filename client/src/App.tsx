import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/pages/HomePage'
import { NewTournamentPage } from '@/pages/NewTournamentPage'
import { TournamentPage } from '@/pages/TournamentPage'
import { AdminPage } from '@/pages/AdminPage'
import { MatchScoringPage } from '@/pages/MatchScoringPage'
import { MatchViewPage } from '@/pages/MatchViewPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 10, // 10 seconds
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/tournaments/new" element={<NewTournamentPage />} />
            <Route path="/tournaments/:slug" element={<TournamentPage />} />
            <Route path="/tournaments/:slug/admin" element={<AdminPage />} />
            <Route
              path="/tournaments/:slug/admin/matches/:matchId"
              element={<MatchScoringPage />}
            />
            <Route path="/tournaments/:slug/matches/:matchId" element={<MatchViewPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
