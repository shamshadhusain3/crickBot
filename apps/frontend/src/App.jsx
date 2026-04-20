import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from './pages/Home'
import MatchSetup from './pages/MatchSetup'
import Toss from './pages/Toss'
import LiveMatch from './pages/LiveMatch'
import AdminVault from './pages/AdminVault'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="max-w-md mx-auto min-h-screen relative overflow-x-hidden bg-slate-900 border-x border-white/5 shadow-2xl">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/setup" element={<MatchSetup />} />
            <Route path="/toss" element={<Toss />} />
            <Route path="/live" element={<LiveMatch />} />
            <Route path="/match/:matchId" element={<LiveMatch />} />
            <Route path="/admin-vault" element={<AdminVault />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App
