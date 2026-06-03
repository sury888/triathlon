import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme } = useTheme()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const dark = theme === 'dark'

  const links = [
    { to: '/races', label: 'Races' },
    { to: '/leagues', label: 'Leagues' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/rules', label: 'Rules' },
  ]

  const isActive = (path) => location.pathname === path

  const accent = dark ? '#15A780' : '#D0A242'
  const accentDark = dark ? '#065F46' : '#8B6914'
  const accentBgActive = dark ? 'rgba(21, 167, 128, 0.15)' : 'rgba(208, 162, 66, 0.15)'

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{
     background: dark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(236, 242, 245, 0.7)',
    //background: dark ? 'rgba(69, 64, 64, 0.94)' : 'rgba(255, 0, 0, 0.7)',
      backdropFilter: 'blur(24px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
      borderBottom: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(180,190,200,0.3)',
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center group">
            <span className="text-xl font-extrabold tracking-tight title-gradient">
              Fantasy Endurance
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-250 gold-underline ${
                  isActive(link.to)
                    ? `text-[${accent}]`
                    : dark ? 'text-[#C7CBD6] hover:text-white' : 'text-[#6B7280] hover:text-[#1F2937]'
                }`}
                style={isActive(link.to) ? { background: accentBgActive, color: accent } : {}}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/profile" className={`flex items-center gap-2 text-sm ${dark ? 'text-[#C7CBD6] hover:text-white' : 'text-[#6B7280] hover:text-[#1F2937]'}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold" style={{ background: accent }}>
                    {user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span>{user.name}</span>
                </Link>
                <button onClick={logout} className={`text-sm transition-colors ${dark ? 'text-[#A8B2C1] hover:text-[#FCA5A5]' : 'text-[#9CA3AF] hover:text-[#E11D48]'}`}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${dark ? 'text-[#C7CBD6] hover:text-white' : 'text-[#6B7280] hover:text-[#1F2937]'}`}>
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary text-sm px-4 py-1.5">
                  Create Account
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button className={`md:hidden ${dark ? 'text-[#C7CBD6]' : 'text-[#6B7280]'}`} onClick={() => setMobileOpen(!mobileOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden px-4 pb-4" style={{
          background: dark ? 'rgba(0, 0, 0, 0.92)' : 'rgba(236, 242, 245, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(180,190,200,0.3)',
        }}>
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`block px-4 py-3 rounded-lg text-sm font-medium`}
              style={isActive(link.to) ? { background: accentBgActive, color: accent } : { color: dark ? '#C7CBD6' : '#6B7280' }}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to="/profile" onClick={() => setMobileOpen(false)} className={`block px-4 py-3 text-sm ${dark ? 'text-[#C7CBD6]' : 'text-[#6B7280]'}`}>
                Profile
              </Link>
              <button onClick={logout} className={`block px-4 py-3 text-sm ${dark ? 'text-[#FCA5A5]' : 'text-[#E11D48]'}`}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileOpen(false)} className={`block px-4 py-3 text-sm ${dark ? 'text-[#C7CBD6]' : 'text-[#6B7280]'}`}>
                Sign In
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className={`block px-4 py-3 text-sm font-medium`} style={{ color: accent }}>
                Create Account
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
