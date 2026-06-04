import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useTheme } from './context/ThemeContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Races from './pages/Races'
import RaceDetail from './pages/RaceDetail'
import MakePicks from './pages/MakePicks'
import Leagues from './pages/Leagues'
import LeagueDetail from './pages/LeagueDetail'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import Rules from './pages/Rules'
import CreatePrivateRace from './pages/CreatePrivateRace'
import JoinPrivateRace from './pages/JoinPrivateRace'
import PrivateRaceResults from './pages/PrivateRaceResults'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D0A242]"></div></div>
  if (!user) return <Navigate to="/login" />
  return children
}

export default function App() {
  const { theme } = useTheme()
  return (
    <div className="min-h-screen" style={{ background: theme === 'dark' ? '#000000' : '#ECF2F5' }}>
      <Navbar />
      <main className="pt-16">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/races" element={<Races />} />
 <Route path="/races/create-private" element={<ProtectedRoute><CreatePrivateRace /></ProtectedRoute>} />
          <Route path="/races/join/:inviteCode" element={<ProtectedRoute><JoinPrivateRace /></ProtectedRoute>} />
          <Route path="/races/:id/edit" element={<ProtectedRoute><CreatePrivateRace editMode /></ProtectedRoute>} />
          <Route path="/races/:id" element={<RaceDetail />} />
          <Route path="/races/:id/pick" element={<ProtectedRoute><MakePicks /></ProtectedRoute>} />
          <Route path="/races/:id/results/enter" element={<ProtectedRoute><PrivateRaceResults /></ProtectedRoute>} />
          <Route path="/leagues" element={<Leagues />} />
          <Route path="/leagues/:id" element={<LeagueDetail />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/rules" element={<Rules />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
