import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import PageMeta from '../components/PageMeta'

export default function Leagues() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [myLeagues, setMyLeagues] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [newLeague, setNewLeague] = useState({ name: '', isPrivate: false, password: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [leagueStandings, setLeagueStandings] = useState({})
  const [leagueFullStandings, setLeagueFullStandings] = useState({})
  const [searchStandings, setSearchStandings] = useState({})

  useEffect(() => {
    if (user) {
      fetchMyLeagues()
    } else {
      setLoading(false)
    }
  }, [user])

  async function fetchMyLeagues() {
    try {
      const { data } = await api.get(`/leagues/my/${user._id}`)
      setMyLeagues(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (myLeagues.length === 0) return
    async function fetchStandings() {
      const standingsMap = {}
      const results = await Promise.allSettled(
        myLeagues.map(l => api.get(`/leagues/${l._id}/standings`))
      )
      const fullMap = {}
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const full = r.value.data?.leaderboard || []
          fullMap[myLeagues[i]._id] = full
          standingsMap[myLeagues[i]._id] = full.slice(0, 3)
        }
      })
      setLeagueFullStandings(fullMap)
      setLeagueStandings(standingsMap)
    }
    fetchStandings()
  }, [myLeagues])

  async function handleSearch() {
    try {
      const { data } = await api.get(`/leagues/search?q=${searchQuery}`)
      setSearchResults(Array.isArray(data) ? data :(data?.data || []))
      setHasSearched(true)
      // Fetch standings for search results too
      const standingsMap = {}
      const results = await Promise.allSettled(
        data.map(l => api.get(`/leagues/${l._id}/standings`))
      )
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          standingsMap[data[i]._id] = (r.value.data?.leaderboard || []).slice(0, 3)
        }
      })
      setSearchStandings(standingsMap)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/leagues', {
        name: newLeague.name,
        adminId: user._id,
        isPrivate: newLeague.isPrivate,
        password: newLeague.isPrivate ? newLeague.password : null
      })
      setShowCreate(false)
      setNewLeague({ name: '', isPrivate: false, password: '' })
      navigate(`/leagues/${data._id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create league')
    }
  }

  async function handleJoinInvite(e) {
    e.preventDefault()
    setError('')
    try {
      await api.post(`/leagues/join/${inviteCode}`, { userId: user._id })
      setShowJoin(false)
      setInviteCode('')
      fetchMyLeagues()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join league')
    }
  }

  async function handleJoinLeague(leagueId) {
    if (!user) {
      navigate('/login')
      return
    }
    try {
      await api.post(`/leagues/${leagueId}/join`, { userId: user._id })
      fetchMyLeagues()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join')
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D0A242]"></div></div>

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageMeta title="Leagues" description="Browse, create, and join fantasy triathlon leagues" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-3xl font-bold">Leagues</h1>
        {user && (
          <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
            <button onClick={() => setShowJoin(true)} className="btn-secondary text-xs sm:text-sm px-4 py-1.5 sm:py-2 w-36 sm:w-auto text-center">Join via Code</button>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-xs sm:text-sm px-4 py-1.5 sm:py-2 w-36 sm:w-auto text-center">Create League</button>
          </div>
        )}
      </div>

      {!user && (
        <div className="card mb-6 border-[#D0A242]/20 bg-[#D0A242]/5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Want to create or join a league?</p>
              <p className="text-[#9CA3AF] text-sm">Sign in to compete with friends.</p>
            </div>
            <Link to="/login" className="btn-primary text-sm">Sign In</Link>
          </div>
        </div>
      )}

      {error && <div className="bg-[rgba(251,113,133,0.1)] border border-[#BE123C]/40 text-[#E11D48] rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

      {/* Create Modal */}
      {showCreate && user && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New League</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              value={newLeague.name}
              onChange={(e) => setNewLeague({ ...newLeague, name: e.target.value })}
              className="input-field"
              placeholder="League name"
              required
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newLeague.isPrivate}
                onChange={(e) => setNewLeague({ ...newLeague, isPrivate: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-[#6B7280]">Private league (requires password to join)</span>
            </label>
            {newLeague.isPrivate && (
              <input
                type="password"
                value={newLeague.password}
                onChange={(e) => setNewLeague({ ...newLeague, password: e.target.value })}
                className="input-field"
                placeholder="League password"
                required
              />
            )}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm">Create</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Join via Invite Code */}
      {showJoin && user && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Join via Invite Code</h2>
          <form onSubmit={handleJoinInvite} className="flex gap-2">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="input-field"
              placeholder="Enter invite code"
              required
            />
            <button type="submit" className="btn-primary text-sm whitespace-nowrap">Join</button>
            <button type="button" onClick={() => setShowJoin(false)} className="btn-secondary text-sm">Cancel</button>
          </form>
        </div>
      )}

      {/* My Leagues (logged in only) — horizontal scroll like Dashboard */}
      {user && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">My Leagues</h2>
          {myLeagues.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-[#9CA3AF] mb-3">You haven't joined any leagues yet</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">Create League</button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto sm:pb-2 sm:-mx-4 sm:px-4">
              <div className="flex flex-col sm:flex-row gap-4" style={{ minWidth: 'min-content' }}>
                {myLeagues.map(league => {
                  const isAdmin = league.admin === user._id || league.admin?._id === user._id
                  const standings = leagueStandings[league._id] || []
                  const fullStandings = leagueFullStandings[league._id] || []
                  const myRank = fullStandings.findIndex(e => e.userId === user._id) + 1
                  return (
                    <Link key={league._id} to={`/leagues/${league._id}`} className="flex-shrink-0 w-full sm:w-72 card hover:border-[#D0A242]/30 transition-colors">
                      <div className="flex items-center gap-2 pr-6 mb-1">
                        <p className="font-semibold text-lg truncate">{league.name}</p>
                        {isAdmin && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-[rgba(245,158,11,0.12)] text-[#B45309] border border-[#D97706]/20 font-medium whitespace-nowrap">Admin</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-[#9CA3AF]">{league.members?.length || 0} members</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${league.isPrivate ? 'bg-[rgba(251,113,133,0.1)] text-[#E11D48]' : 'bg-[rgba(16,185,129,0.1)] text-[#059669] border border-[#10B981]/20'}`}>
                          {league.isPrivate ? 'Private' : 'Public'}
                        </span>
                      </div>
                      {myRank > 0 && (
                        <div className="text-xs text-[#9CA3AF] mb-2">Your rank: <span className="text-[#D0A242] font-semibold">#{myRank}</span></div>
                      )}
                      {standings.length > 0 ? (
                        <div className="space-y-1">
                          {standings.map((entry, i) => (
                            <div key={entry.userId || i} className={`flex items-center justify-between text-sm px-2 py-1 rounded ${
                              user && entry.userId === user._id ? 'bg-[rgba(208,162,66,0.08)] text-[#1F2937]' : ''
                            }`}>
                              <div className="flex items-center gap-2">
                                <span className={i < 3 ? 'text-[#1F2937] font-bold' : 'text-[#9CA3AF]'}>{i + 1}</span>
                                <span className="truncate max-w-[140px]">{entry.name}</span>
                              </div>
                              <span className="text-[#D0A242] font-medium">{entry.totalPoints || 0}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#9CA3AF]">No standings yet</p>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Leagues (available to everyone) */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Find Leagues</h2>
        <div className="flex gap-2 mb-4">
          <input
            id="search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            placeholder="Search leagues..."
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="btn-primary text-sm">Search</button>
        </div>

        {hasSearched && searchResults.length === 0 && (
          <div className="card text-center py-8">
            <svg className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-[#9CA3AF] mb-1">No leagues found for "{searchQuery}"</p>
            <p className="text-sm text-[#9CA3AF] mb-4">Try a different search or create your own league!</p>
            {user && (
              <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">Create a League</button>
            )}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="overflow-x-auto pb-2 -mx-4 px-4">
            <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
              {searchResults.map(league => {
                const alreadyMember = myLeagues.some(ml => ml._id === league._id)
                const standings = searchStandings[league._id] || []
                return (
                  <div key={league._id} className="flex-shrink-0 w-72 card hover:border-[#D0A242]/30 transition-colors flex flex-col">
                    <Link to={`/leagues/${league._id}`}>
                      <div className="flex items-center gap-2 pr-6 mb-1">
                        <p className="font-semibold text-lg truncate">{league.name}</p>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-[#9CA3AF]">{league.members?.length || 0} members</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${league.isPrivate ? 'bg-[rgba(251,113,133,0.1)] text-[#E11D48]' : 'bg-[rgba(16,185,129,0.1)] text-[#059669] border border-[#10B981]/20'}`}>
                          {league.isPrivate ? 'Private' : 'Public'}
                        </span>
                      </div>
                      {standings.length > 0 ? (
                        <div className="space-y-1 mb-3">
                          {standings.map((entry, i) => (
                            <div key={entry.userId || i} className="flex items-center justify-between text-sm px-2 py-1 rounded">
                              <div className="flex items-center gap-2">
                                <span className={i < 3 ? 'text-[#1F2937] font-bold' : 'text-[#9CA3AF]'}>{i + 1}</span>
                                <span className="truncate max-w-[140px]">{entry.name}</span>
                              </div>
                              <span className="text-[#D0A242] font-medium">{entry.totalPoints || 0}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#9CA3AF] mb-3">No standings yet</p>
                      )}
                    </Link>
                    <div className="mt-auto pt-2 border-t border-[rgba(180,190,200,0.3)]">
                      {alreadyMember ? (
                        <span className="text-xs text-[#D0A242] font-medium">Joined</span>
                      ) : user ? (
                        <button onClick={() => handleJoinLeague(league._id)} className="btn-primary text-xs w-full">Join League</button>
                      ) : (
                        <Link to="/login" className="text-xs text-[#D0A242] hover:text-[#C4963A]">Sign in to join</Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
