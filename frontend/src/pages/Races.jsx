import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import PageMeta from '../components/PageMeta'

const SERIES_STYLES = {
  'T100': { background: 'rgba(236,72,153,0.12)', color: '#DB2777', backdropFilter: 'blur(8px)', border: '1px solid rgba(236,72,153,0.35)' },
  'Ironman Pro Series': { background: 'rgba(245,158,11,0.1)', color: '#B45309', backdropFilter: 'blur(8px)' },
  'Ironman 70.3 Pro Series': { background: 'rgba(245,158,11,0.08)', color: '#B45309', backdropFilter: 'blur(8px)' },
  'WTCS': { background: 'rgba(34,211,238,0.1)', color: '#0891B2', backdropFilter: 'blur(8px)' },
  'Other': { background: 'rgba(139,92,246,0.1)', color: '#7C3AED', backdropFilter: 'blur(8px)', border: '1px solid rgba(139,92,246,0.25)' },
}

const OTHER_SERIES_MAP = { 'Ironman': 'Other', 'Ironman 70.3': 'Other', 'Challenge': 'Other' }
function mapSeries(s) { return OTHER_SERIES_MAP[s] || s }

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCountdown(target) {
  const diff = new Date(target) - new Date()
  if (diff <= 0) return null
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  if (d > 0) return `${d}d ${h}h`
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function groupByEvent(raceList) {
  const map = {}
  for (const r of raceList) {
    const slug = r.eventSlug || r.name.replace(/\s*(Men|Women|Male|Female|M|F)\s*$/i, '').trim() + '|' +(r.date)
    if (!map[slug]) {
      map[slug] = {
        eventSlug: slug,
        eventName: r.eventName || r.name,
        location: r.location,
        series: r.series,
        date: r.date || r.lockTime,
        lockTime: r.lockTime,
        status: r.status,
        genders: [],
        races: [],
        isPrivate: r.isPrivate || false,
      }
    }
    map[slug].races.push(r)
    if (!map[slug].genders.includes(r.gender)) map[slug].genders.push(r.gender)
    if (r.status === 'Open') map[slug].status = 'Open'
  }
  return Object.values(map)
}

function GenderBadges({ genders }) {
  if (genders.length === 2) {
    return <span className="text-sm px-2 py-0.5 rounded bg-[rgba(245,243,238,0.6)] text-[#6B7280]">Men & Women</span>
  }
  return <span className="text-sm px-2 py-0.5 rounded bg-[rgba(245,243,238,0.6)] text-[#6B7280]">{genders[0] === 'M' ? 'Men' : 'Women'} only</span>
}

function PickStatusBadge({ status }) {
  if (!status || status === 'none') {
    return <span className="text-xs px-2 py-0.5 rounded-full border border-[rgba(180,190,200,0.3)] text-[#9CA3AF] whitespace-nowrap">No Picks</span>
  }
  if (status === 'draft') {
    return <span className="text-xs px-2 py-0.5 rounded-full border border-[#D97706]/30 bg-[rgba(35, 134, 10, 0.31)] text-[#B45309] whitespace-nowrap">Picks Saved</span>
  }
  return <span className="text-xs px-2 py-0.5 rounded-full border border-[#A5B4FC]/30 bg-[rgba(99,102,241,0.12)] text-[#A5B4FC] whitespace-nowrap">Picks Submitted</span>
}

export default function Races() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [races, setRaces] = useState([])
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'all'
  const [filter, setFilter] = useState(initialTab)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showJoinCode, setShowJoinCode] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)

  const handleJoinWithCode = async () => {
    const trimmed = joinCode.trim()
    if (!trimmed) return
    setJoining(true)
    setJoinError('')
    try {
      const { data } = await api.post(`/races/join/${trimmed}`)
      setShowJoinCode(false)
      setJoinCode('')
      navigate(`/races/${data.race._id}`)
    } catch {
      try {
        await api.post(`/leagues/join/${trimmed}`, { userId: user._id })
        setShowJoinCode(false)
        setJoinCode('')
        navigate('/leagues')
      } catch (err) {
        setJoinError('Invalid invite code. Please check and try again.')
      }
    } finally {
      setJoining(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    async function fetchRaces() {
  try {
    const { data } = await api.get('/races')
    let raceList = Array.isArray(data) ? data : (data?.data || [])
    
    // Merge pick status if user is logged in
    if (user) {
      try {
        const { data: picks } = await api.get(`/picks/user/${user._id}`)
        const pickMap = new Map(picks.map(p => [p.race?._id || p.race, p]))
        raceList = raceList.map(r => {
          const pick = pickMap.get(r._id)
          return { ...r, pickStatus: pick ? (pick.status === 'submitted' ? 'made' : 'draft') : 'none' }
        })
      } catch {}
    }
    
    if (!cancelled) setRaces(raceList)
  } catch (err) {
    console.error('Fetch races error:', err)
  } finally {
    if (!cancelled) setLoading(false)
  }
}
    fetchRaces()
    return () => { cancelled = true }
  }, [authLoading, user, location.key])

  const filtered = useMemo(() => {
    let list = races
    if (filter === 'upcoming') list = list.filter(r => ['Open', 'Upcoming'].includes(r.status))
    else if (filter === 'finished') list = list.filter(r => r.status === 'Finished and Scored')
    else if (filter === 'current') list = list.filter(r => r.status === 'Closed')
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.eventName || '').toLowerCase().includes(q) ||
        (r.location || '').toLowerCase().includes(q) ||
        (r.series || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [races, filter, search])

  const events = useMemo(() => groupByEvent(filtered), [filtered])

  const upcomingEvents = events
    .filter(e => ['Open', 'Upcoming'].includes(e.status))
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  const lockedEvents = events
    .filter(e => e.status === 'Closed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const finishedEvents = events
    .filter(e => e.status === 'Finished and Scored')
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const sortedEvents = [...upcomingEvents, ...lockedEvents, ...finishedEvents]

  // Primary race ID for linking (prefer M, fallback to first)
  function primaryRaceId(event) {
    const m = event.races.find(r => r.gender === 'M')
    return (m || event.races[0])._id || (m || event.races[0]).id
  }

  function anyHasStartList(event) {
    return event.races.some(r => r.hasStartList)
  }

  function getPickStatus(event) {
    if (event.status === 'Finished and Scored') return null
    const statuses = event.races.map(r => r.pickStatus).filter(Boolean)
    if (statuses.length === 0) return null
    if (statuses.every(s => s === 'none')) return 'none'
    if (statuses.every(s => s === 'made')) return 'made'
    return 'draft'
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageMeta title="Races" description="Browse upcoming and finished triathlon races" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h1 className="text-3xl font-bold">Races</h1>
        <div className="flex gap-2 flex-wrap">
          {['all', 'upcoming', 'current', 'finished'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === f ? 'bg-[#D0A242] text-[#FAFAFA] font-bold' : 'bg-[#E8E3DA] text-[#6B7280] hover:bg-[#F0EDE8]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {user && (
        <div className="flex flex-wrap gap-3 mb-4">
          <Link to="/races/create-private" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(208,162,66,0.08)] text-[#D0A242] border border-[#D0A242]/20 hover:bg-[#D0A242]/30 transition-colors text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Create Private Race
          </Link>
          <button
            onClick={() => { setShowJoinCode(v => !v); setJoinError(''); setJoinCode('') }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(208,162,66,0.08)] text-[#D0A242] border border-[#D0A242]/20 hover:bg-[#D0A242]/30 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            Join with Code
          </button>
        </div>
      )}

      {showJoinCode && (
        <div className="mb-4 p-4 rounded-lg bg-[rgba(216,221,223,0.45)] border border-[rgba(180,190,200,0.3)]">
          <p className="text-sm text-[#6B7280] mb-2">Enter a race or league invite code:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError('') }}
              onKeyDown={e => e.key === 'Enter' && handleJoinWithCode()}
              placeholder="e.g. TRILEG26"
              autoFocus
              className="flex-1 bg-[#ECF2F5] border border-[rgba(180,190,200,0.3)] rounded-lg px-3 py-2 text-sm text-[#1F2937] placeholder-[#94A3B8] focus:border-[#D0A242] focus:outline-none font-mono tracking-wider"
            />
            <button
              onClick={handleJoinWithCode}
              disabled={joining || !joinCode.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#D0A242] text-[#1F2937] hover:bg-[#D0A242] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {joining ? 'Joining...' : 'Join'}
            </button>
            <button
              onClick={() => setShowJoinCode(false)}
              className="px-3 py-2 rounded-lg text-sm text-[#9CA3AF] hover:text-[#1F2937] hover:bg-[#E8E3DA] transition-colors"
            >
              Cancel
            </button>
          </div>
          {joinError && <p className="text-[#E11D48] text-xs mt-2">{joinError}</p>}
        </div>
      )}

      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Search races by name, location, or series..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[rgba(216,221,223,0.45)] border border-[rgba(180,190,200,0.3)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#1F2937] placeholder-[#94A3B8] focus:border-[#D0A242] focus:outline-none transition-colors"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] text-sm">&times;</button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D0A242]"></div></div>
      ) : sortedEvents.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-[#9CA3AF]">No races found</p>
        </div>
      ) : (
        <div>
          {upcomingEvents.length > 0 && (filter === 'all' || filter === 'upcoming') && (
            <>
              <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Upcoming</h2>
              <div className="space-y-2 mb-8">
                {(showAllUpcoming ? upcomingEvents : upcomingEvents.slice(0,4)).map(event => {
                  const countdown = formatCountdown(event.lockTime)
                  const isUrgent = countdown && (new Date(event.lockTime) - new Date()) < 86400000
                  const displaySeries = mapSeries(event.series)
                  const seriesStyle = SERIES_STYLES[displaySeries] || SERIES_STYLES['Other']

                  return (
                    <Link
                      key={event.eventSlug}
                      to={`/races/${primaryRaceId(event)}`}
                      className={`block p-4 rounded-lg border transition-colors hover:border-[#D0A242]/20 ${
                        isUrgent ? 'bg-[#BE123C]/5 border-[#BE123C]/20' : 'bg-[rgba(216,221,223,0.45)] border-[rgba(180,190,200,0.3)]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                              <span className="font-semibold">{event.eventName}</span>
                              <span className="text-xs px-2.5 py-0.5 rounded font-medium whitespace-nowrap" style={seriesStyle}>{displaySeries}</span>
                              <GenderBadges genders={event.genders} />
                              {event.isPrivate && <span className="text-xs px-2 py-0.5 rounded-full border border-[#D0A242]/20 bg-[rgba(208,162,66,0.08)] text-[#D0A242] whitespace-nowrap font-medium">Private</span>}
                              {getPickStatus(event) !== null && <PickStatusBadge status={getPickStatus(event)} />}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-[#9CA3AF]">
                              <span>{event.location}</span>
                              <span className="text-[#9CA3AF]">{formatDate(event.date)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-sm px-2.5 py-1 rounded-lg whitespace-nowrap ${
                            event.status === 'Open' ? 'bg-[rgba(208,162,66,0.08)] text-[#D0A242]' : 'bg-[rgba(245,243,238,0.6)] text-[#9CA3AF]'
                          }`}>
                            {event.status}
                          </span>
                          {countdown && (
                            <span className={`text-sm font-mono font-bold whitespace-nowrap px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
                              isUrgent ? 'bg-[rgba(251,113,133,0.1)] text-[#E11D48] border border-[#BE123C]/20 animate-pulse' : 'bg-[rgba(208,162,66,0.08)] text-[#D0A242] border border-[#D0A242]/20'
                            }`}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {countdown}
                            </span>
                          )}
                          <svg className="w-4 h-4 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </div>
                    </Link>
                  )
                })}
                {upcomingEvents.length > 4 && (
                    <button
                      onClick={(e) => {e.preventDefault(); setShowAllUpcoming(!showAllUpcoming)}}
                      className="w-full py-2.5 rounded-lg text-sm font-medium text-[#D0A242] bg-[rgba(216,221,223,0.45)] border border-[#D0A242]/15 hover:bg-[rgba(208,162,66,0.12)] transition-colors mt-2">
                        {showAllUpcoming ? 'Show Less' : `Show All ${upcomingEvents.length} Upcoming`}
                        </button>
                )}
              </div>
            </>
          )}

          {lockedEvents.length > 0 && (filter === 'all' || filter === 'current') && (
            <>
              <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">In Progress — Awaiting Results</h2>
              <div className="space-y-2 mb-8">
                {lockedEvents.map(event => {
                  const displaySeriesL = mapSeries(event.series)
                  const seriesStyle = SERIES_STYLES[displaySeriesL] || SERIES_STYLES['Other']
                  return (
                    <Link
                      key={event.eventSlug}
                      to={`/races/${primaryRaceId(event)}`}
                      className="block p-4 rounded-lg bg-[rgba(216,221,223,0.45)] border border-[rgba(180,190,200,0.3)] hover:border-[#D0A242]/20 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                            <span className="font-semibold">{event.eventName}</span>
                            <span className="text-xs px-2.5 py-0.5 rounded font-medium whitespace-nowrap" style={seriesStyle}>{displaySeriesL}</span>
                            <GenderBadges genders={event.genders} />
                          </div>
                          <div className="flex items-center gap-3 text-sm text-[#9CA3AF]">
                            <span>{event.location}</span>
                            <span className="text-[#9CA3AF]">{formatDate(event.date)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm px-3 py-1.5 rounded-lg bg-[rgba(245,243,238,0.6)] text-[#9CA3AF] font-medium whitespace-nowrap">
                            Awaiting Results
                          </span>
                          <svg className="w-4 h-4 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}

          {finishedEvents.length > 0 && (filter === 'all' || filter === 'finished') && (
            <>
              <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Finished</h2>
              <div className="space-y-2">
                {finishedEvents.map(event => {
                  const displaySeries2 = mapSeries(event.series)
                  const seriesStyle = SERIES_STYLES[displaySeries2] || SERIES_STYLES['Other']
                  return (
                    <Link
                      key={event.eventSlug}
                      to={`/races/${primaryRaceId(event)}`}
                      className="block p-4 rounded-lg bg-[rgba(216,221,223,0.45)] border border-[rgba(180,190,200,0.3)] hover:border-[#D0A242]/20 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                            <span className="font-semibold">{event.eventName}</span>
                            <span className="text-xs px-2.5 py-0.5 rounded font-medium whitespace-nowrap" style={seriesStyle}>{displaySeries2}</span>
                            <GenderBadges genders={event.genders} />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#9CA3AF]">
                            <span>{event.location}</span>
                            <span>{formatDate(event.date)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {user && event.races.every(r => r.pickStatus === 'none') && (
                            <span className="text-xs text-[#9CA3AF] italic">No picks submitted</span>
                          )}
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-[rgba(251,113,133,0.1)] text-[#E11D48] border border-[#E11D48]/20 whitespace-nowrap">
                            View Results
                          </span>
                          <svg className="w-4 h-4 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
