import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
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

function SeriesBadge({ series }) {
  const display = OTHER_SERIES_MAP[series] || series
  const style = SERIES_STYLES[display] || SERIES_STYLES['Other']
  return <span className="text-xs px-2.5 py-0.5 rounded font-medium whitespace-nowrap" style={style}>{display}</span>
}

function useCountdown(target) {
  const [state, setState] = useState({ text: '', urgent: false, started: false })

  useEffect(() => {
    function update() {
      const diff = new Date(target) - new Date()
      if (diff <= 0) { setState({ text: 'Started', urgent: false, started: true }); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const urgent = diff < 86400000
      if (d > 0) setState({ text: `${d}d ${h}h`, urgent, started: false })
      else if (h > 0) setState({ text: `${h}h ${m}m`, urgent, started: false })
      else setState({ text: `${m}m`, urgent: true, started: false })
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [target])

  return state
}

function formatLockDate(lockTime) {
  return new Date(lockTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function groupByEvent(raceList) {
  const map = {}
  for (const r of raceList) {
    const slug = r.eventSlug || r.name.replace(/\s*(Men|Women|Male|Female|M|F)\s*$/i, '').trim() + '|' +(r.date || r.lockTime)
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
      }
    }
    map[slug].races.push(r)
    if (!map[slug].genders.includes(r.gender)) map[slug].genders.push(r.gender)
    if (r.status === 'Open') map[slug].status = 'Open'
  }
  return Object.values(map)
}

function UpcomingEventCard({ event, user, userPicks }) {
  const countdown = useCountdown(event.lockTime)
  const anyHasStartList = event.races.some(r => r.startList && r.startList.length > 0)
  const isLocked = event.status === 'Closed'
  // Determine pick status for each race in the event
  const racePickStatuses = event.races.map(r => {
    const pick = userPicks.find(p => (p.race?._id || p.race) === r._id)
    if (!pick) return 'none'
    return pick.status === 'submitted' ? 'made' : 'draft'
  })
  const hasPick = user && racePickStatuses.some(s => s !== 'none')
  const allSubmitted = racePickStatuses.length > 0 && racePickStatuses.every(s => s === 'made')
  const pickStatus = !hasPick ? 'none' : allSubmitted ? 'made' : 'draft'
  const primaryId = (event.races.find(r => r.gender === 'M') || event.races[0])._id
  const totalAthletes = event.races.reduce((sum, r) => sum + (r.startList?.length || 0), 0)

  return (
    <Link
      to={anyHasStartList ? `/races/${primaryId}` : '#'}
      className={`flex-shrink-0 w-72 card transition-colors ${
        anyHasStartList
          ? countdown.urgent
            ? 'border-[#BE123C]/30 hover:border-[#E11D48]/40'
            : 'hover:border-[#D0A242]/30'
          : 'opacity-50 cursor-default pointer-events-none'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="font-semibold text-lg leading-tight pr-2">{event.eventName}</p>
        <span className={`text-sm px-2 py-0.5 rounded whitespace-nowrap ${
          event.status === 'Open' ? 'bg-[rgba(208,162,66,0.08)] text-[#D0A242]' : 'bg-[#E8E3DA] text-[#6B7280]'
        }`}>
          {event.status}
        </span>
      </div>

      <div className="mb-2">
        <SeriesBadge series={event.series} />
        <div className="text-sm text-[#9CA3AF] mt-1">
          {event.genders.length === 2 ? 'Men & Women' : event.genders[0] === 'M' ? 'Men' : 'Women'}
        </div>
      </div>

      <p className="text-sm text-[#9CA3AF] mb-2">{event.location}</p>

      {!anyHasStartList && (
        <span className="text-xs text-[#9CA3AF]">Start list pending</span>
      )}

      <div className={`text-center py-2 rounded-lg mb-2 mt-auto ${countdown.urgent ? 'bg-[rgba(251,113,133,0.1)] border border-[#BE123C]/20' : 'bg-[rgba(245,243,238,0.6)]'}`}>
        <div className={`text-2xl font-bold ${countdown.urgent ? 'text-[#E11D48]' : 'text-[#D0A242]'}`}>
          {countdown.text}
        </div>
        <div className="text-xs text-[#9CA3AF] mt-0.5 flex items-center justify-center gap-1">
          {isLocked ? 'Closed' : `Picks lock ${formatLockDate(event.lockTime)}`}
        </div>
      </div>

      {user && anyHasStartList && (
        <div className="text-center">
          {pickStatus === 'made' ? (
            <span className="text-xs px-3 py-1 rounded-full bg-[rgba(21, 114, 19, 0.5)] text-[#A5B4FC] border border-[#A5B4FC]/20 font-medium">Picks Submitted</span>
          ) : pickStatus === 'draft' ? (
            <span className="text-xs px-3 py-1 rounded-full bg-[rgba(114, 71, 19, 0.5)] text-[#B45309] border border-[#D97706]/20 font-medium">Picks Saved</span>
          ) : isLocked ? (
            <span className="text-xs px-3 py-1 rounded-full bg-[rgba(245,243,238,0.6)] text-[#9CA3AF] inline-flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              No Pick
            </span>
          ) : event.status === 'Open' ? (
            <span className="text-xs px-3 py-1 rounded-full bg-[rgba(245,243,238,0.6)] text-[#9CA3AF]">No Picks</span>
          ) : (
            <span className="text-xs px-3 py-1 rounded-full bg-[rgba(245,243,238,0.6)] text-[#9CA3AF]">No Picks</span>
          )}
        </div>
      )}
    </Link>
  )
}

function FinishedEventCard({ event, userScore, userRank }) {
  const primaryId = (event.races.find(r => r.gender === 'M') || event.races[0])._id
  return (
    <Link
      to={`/races/${primaryId}`}
      className="flex-shrink-0 w-60 rounded-lg bg-[rgba(216,221,223,0.45)] border border-[rgba(180,190,200,0.3)] hover:border-[#D0A242]/20 transition-colors p-4 flex flex-col"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[rgba(251,113,133,0.1)] text-[#E11D48] border border-[#E11D48]/20">Results</span>
      </div>
      <p className="font-semibold text-sm mb-1">{event.eventName}</p>
      <div className="mb-1">
        <SeriesBadge series={event.series} />
        <div className="text-sm text-[#9CA3AF] mt-1">
          {event.genders.length === 2 ? 'Men & Women' : event.genders[0] === 'M' ? 'Men' : 'Women'}
        </div>
      </div>
      <p className="text-sm text-[#9CA3AF] mb-2">{event.location}</p>
      {userScore != null && userScore > 0 && (
        <div className="mt-auto pt-2 border-t border-[rgba(180,190,200,0.3)]">
          <div className="flex items-center justify-between">
            <span className="text-[#D0A242] font-bold text-sm">{userScore} pts</span>
            {userRank && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                userRank <= 3 ? 'bg-[rgba(208,162,66,0.08)] text-[#D0A242]' : 'bg-[rgba(245,243,238,0.6)] text-[#6B7280]'
              }`}>
                #{userRank}
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  )
}

function HorizontalScroll({ children }) {
  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4">
      <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
        {children}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const navigate = useNavigate()
  const [upcomingRaces, setUpcomingRaces] = useState([])
  const [finishedRaces, setFinishedRaces] = useState([])
  const [myLeagues, setMyLeagues] = useState([])
  const [leagueStandings, setLeagueStandings] = useState({})
  const [leagueFullStandings, setLeagueFullStandings] = useState({})
  const [favoriteLeagues, setFavoriteLeagues] = useState([])
  const [globalLeaderboard, setGlobalLeaderboard] = useState([])
  const [menAthletes, setMenAthletes] = useState([])
  const [womenAthletes, setWomenAthletes] = useState([])
  const [userPicks, setUserPicks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const requests = [
          api.get('/races/upcoming'),
          api.get('/races/finished'),
          api.get('/leaderboard/global'),
          api.get('/leaderboard/athletes?gender=M'),
          api.get('/leaderboard/athletes?gender=F'),
        ]

        if (user) {
          requests.push(api.get(`/leagues/my/${user._id}`))
          requests.push(api.get(`/users/${user._id}/favoriteLeagues`))
          requests.push(api.get(`/picks/user/${user._id}`))
        }

        const results = await Promise.allSettled(requests)

        if (results[0].status === 'fulfilled') setUpcomingRaces(results[0].value.data)
        if (results[1].status === 'fulfilled') setFinishedRaces(results[1].value.data)
        if (results[2].status === 'fulfilled') setGlobalLeaderboard(results[2].value.data?.leaderboard || [])
        if (results[3].status === 'fulfilled') setMenAthletes(results[3].value.data?.leaderboard || [])
        if (results[4].status === 'fulfilled') setWomenAthletes(results[4].value.data?.leaderboard || [])

        if (user) {
          if (results[5]?.status === 'fulfilled') setMyLeagues(results[5].value.data || [])
          if (results[6]?.status === 'fulfilled') setFavoriteLeagues(results[6].value.data || [])
          if (results[7]?.status === 'fulfilled') setUserPicks(results[7].value.data || [])
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

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
          const full = r.value.data?.leaderboard || r.value.data?.standings || []
          fullMap[myLeagues[i]._id] = full
          standingsMap[myLeagues[i]._id] = full.slice(0, 5)
        }
      })
      setLeagueFullStandings(fullMap)
      setLeagueStandings(standingsMap)
    }
    fetchStandings()
  }, [myLeagues])

  async function toggleFavorite(leagueId) {
    if (!user) return
    try {
      const { data } = await api.post(`/users/${user._id}/favoriteLeague/${leagueId}`)
      setFavoriteLeagues(data.favoriteLeagues)
    } catch (err) {
      console.error('Toggle favorite error:', err)
    }
  }

  const isFavorite = (id) => favoriteLeagues.some(fav => fav === id || fav._id === id)

  const sortedLeagues = [...myLeagues].sort((a, b) => {
    const aFav = isFavorite(a._id)
    const bFav = isFavorite(b._id)
    if (aFav && !bFav) return -1
    if (!aFav && bFav) return 1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  const upcomingEvents = useMemo(() =>
    groupByEvent(upcomingRaces).sort((a, b) => new Date(a.date) - new Date(b.date)),
    [upcomingRaces]
  )

  const finishedEvents = useMemo(() =>
    groupByEvent(finishedRaces).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [finishedRaces]
  )

  // Compute user's score per finished event from picks
  const eventScores = useMemo(() => {
    if (!user || userPicks.length === 0) return {}
    const raceToEvent = {}
    for (const r of finishedRaces) {
      raceToEvent[r._id] = r.eventSlug || r._id
    }
    const scores = {}
    for (const p of userPicks) {
      const raceId = p.race?._id || p.race
      const slug = raceToEvent[raceId]
      if (!slug || !p.fantasyScoreTotal) continue
      scores[slug] = (scores[slug] || 0) + p.fantasyScoreTotal
    }
    return scores
  }, [user, userPicks, finishedRaces])

  // Compute user's rank per event from global leaderboard data
  const eventRanks = useMemo(() => {
    if (!user || globalLeaderboard.length === 0) return {}
    const eventUserScores = {}
    for (const entry of globalLeaderboard) {
      const allRaces = [...(entry.qualifyingRaces || []), ...(entry.extraRaces || [])]
      for (const r of allRaces) {
        const slug = r.eventSlug
        if (!eventUserScores[slug]) eventUserScores[slug] = []
        eventUserScores[slug].push({ userId: entry.userId, points: r.points })
      }
    }
    const ranks = {}
    for (const [slug, entries] of Object.entries(eventUserScores)) {
      entries.sort((a, b) => b.points - a.points)
      const idx = entries.findIndex(e => e.userId === user._id)
      if (idx !== -1) ranks[slug] = idx + 1
    }
    return ranks
  }, [user, globalLeaderboard])

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D0A242]"></div></div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      <PageMeta title="Dashboard" description="Your triathlon fantasy dashboard" />
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          {user ? `Welcome back, ${user.name}!` : 'Welcome to Fantasy Endurance'}
        </h1>
        {user ? (
          <p className="text-[#9CA3AF] mt-1">Here's your triathlon fantasy overview</p>
        ) : (
          <p className="text-[#9CA3AF] mt-1">
            Browse races, leagues, and leaderboards —{' '}
            <Link to="/login" className="text-[#D0A242] hover:text-[#C4963A] font-medium">Sign in</Link>
            {' '}or{' '}
            <Link to="/register" className="text-[#D0A242] hover:text-[#C4963A] font-medium">create an account</Link>
            {' '}to make picks and compete.
          </p>
        )}
      </div>

      {/* ── CREATE YOUR OWN RACE CTA ── */}
      {user && (
        <Link
          to="/races/create-private"
          className="block rounded-xl p-5 transition-all duration-300 hover:scale-[1.005] group"
          style={{
            background: dark
              ? 'linear-gradient(135deg, rgba(21,167,128,0.06) 0%, rgba(21,167,128,0.12) 100%)'
              : 'linear-gradient(135deg, rgba(208,162,66,0.06) 0%, rgba(208,162,66,0.12) 100%)',
            border: dark ? '1px solid rgba(21,167,128,0.15)' : '1px solid rgba(208,162,66,0.12)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110" style={{ background: dark ? 'rgba(21,167,128,0.12)' : 'rgba(208,162,66,0.12)', border: dark ? '1px solid rgba(21,167,128,0.25)' : '1px solid rgba(208,162,66,0.25)' }}>
              <svg className="w-6 h-6 text-[#D0A242]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <div className="flex-1">
              <p className="text-[#D0A242] font-semibold text-lg tracking-wide">Create Your Own Race</p>
              <p className="text-[#9CA3AF] text-sm mt-0.5">Set up a private race with custom athletes, invite friends, and compete</p>
            </div>
            <svg className="w-5 h-5 text-[#D0A242] opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </div>
        </Link>
      )}

      {/* ── UPCOMING RACES (grouped by event, horizontal scroll) ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Upcoming Races</h2>
          <Link to="/races" className="text-sm text-[#D0A242] hover:text-[#C4963A]">View all</Link>
        </div>

        {upcomingEvents.length === 0 ? (
          <p className="text-[#9CA3AF]">No upcoming races</p>
        ) : (
          <HorizontalScroll>
            {upcomingEvents.map(event => (
              <UpcomingEventCard key={event.eventSlug} event={event} user={user} userPicks={userPicks} />
            ))}
            {user && (
              <Link
                to="/races/create-private"
                className="flex-shrink-0 w-72 rounded-xl flex flex-col items-center justify-center gap-3 text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                style={{
                  background: dark ? '#0E1421' : 'rgba(255, 255, 255, 0.95)',
                  border: dark ? '1px dashed rgba(21, 167, 128, 0.25)' : '1px dashed rgba(208, 162, 66, 0.25)',
                  backdropFilter: 'blur(12px)',
                  minHeight: '220px',
                }}
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110" style={{ background: dark ? 'rgba(21, 167, 128, 0.12)' : 'rgba(208, 162, 66, 0.12)', border: dark ? '1px solid rgba(21, 167, 128, 0.15)' : '1px solid rgba(208, 162, 66, 0.15)' }}>
                  <svg className="w-7 h-7 text-[#D0A242]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
                <div>
                  <p className="text-[#D0A242] font-semibold text-base">Create Your Own Race</p>
                  <p className="text-[#9CA3AF] text-xs mt-1">Set up a private race with custom athletes</p>
                </div>
              </Link>
            )}
          </HorizontalScroll>
        )}
      </section>

      {/* ── RECENTLY ENDED RACES (grouped, horizontal scroll) ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recently Ended</h2>
          <Link to="/races?tab=finished" className="text-sm text-[#D0A242] hover:text-[#C4963A]">View all</Link>
        </div>
        {finishedEvents.length === 0 ? (
          <p className="text-[#9CA3AF]">No recently ended races</p>
        ) : (
          <HorizontalScroll>
            {finishedEvents.map(event => (
              <FinishedEventCard key={event.eventSlug} event={event} userScore={eventScores[event.eventSlug]} userRank={eventRanks[event.eventSlug]} />
            ))}
          </HorizontalScroll>
        )}
      </section>

      {/* ── MY LEAGUES (horizontal scroll) ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{user ? 'My Leagues' : 'Leagues'}</h2>
          <Link to="/leagues" className="text-sm text-[#D0A242] hover:text-[#C4963A]">View all</Link>
        </div>

        {!user ? (
          <div className="card text-center py-8">
            <p className="text-[#9CA3AF] mb-3">Sign in to join leagues and compete with friends</p>
            <Link to="/login" className="btn-primary text-sm">Sign In</Link>
          </div>
        ) : myLeagues.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-[#9CA3AF] mb-3">You haven't joined any leagues yet</p>
            <div className="flex gap-3 justify-center">
              <Link to="/leagues" className="btn-primary text-sm">Find Leagues</Link>
              <Link to="/leagues" className="btn-secondary text-sm">Create League</Link>
            </div>
          </div>
        ) : (
          <HorizontalScroll>
            {sortedLeagues.map(league => {
              const isAdmin = league.admin === user._id || league.admin?._id === user._id
              const standings = leagueStandings[league._id] || []
              const fullStandings = leagueFullStandings[league._id] || []
              const myRank = fullStandings.findIndex(e => e.userId === user._id) + 1

              return (
                <Link key={league._id} to={`/leagues/${league._id}`} className="flex-shrink-0 w-72 card hover:border-[#D0A242]/30 transition-colors relative">
                  {/* Favorite star */}
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={(e) => { e.preventDefault(); toggleFavorite(league._id) }}
                      className="hover:scale-110 transition-transform"
                      title={isFavorite(league._id) ? 'Unfavorite' : 'Favorite'}
                    >
                      {isFavorite(league._id) ? (
                        <svg className="w-5 h-5 text-[#D0A242] fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      ) : (
                        <svg className="w-5 h-5 text-[#9CA3AF] hover:text-[#D0A242]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pr-10 mb-1">
                    <p className="font-semibold text-lg truncate">{league.name}</p>
                    {isAdmin && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[rgba(245,158,11,0.12)] text-[#B45309] border border-[#D97706]/20 font-medium whitespace-nowrap">Admin</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-[#9CA3AF]">{league.members?.length || 0} members</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${league.isPrivate ? 'bg-[rgba(251,113,133,0.1)] text-[#E11D48]' : 'bg-[rgba(16,185,129,0.1)] text-[#059669] border border-[#10B981]/20'}`}>
                      {league.isPrivate ? 'Private' : 'Public'}
                    </span>
                  </div>

                  {myRank > 0 && (
                    <div className="text-xs text-[#9CA3AF] mb-2">Your rank: <span className="text-[#D0A242] font-semibold">#{myRank}</span></div>
                  )}

                  {standings.length > 0 ? (
                    <div className="space-y-1">
                      {standings.slice(0, 3).map((entry, i) => (
                        <div key={entry.userId || i} className={`flex items-center justify-between text-sm px-2 py-1 rounded ${
                          user && entry.userId === user._id ? 'bg-[rgba(208,162,66,0.08)] text-[#1F2937]' : ''
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className={i < 3 ? 'text-[#1F2937] font-bold' : 'text-[#9CA3AF]'}>{i + 1}</span>
                            <span className="truncate max-w-[140px]">{entry.name || entry.user}</span>
                          </div>
                          <span className="text-[#1F2937] font-medium">{entry.totalPoints || entry.total || 0}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#9CA3AF]">No standings yet</p>
                  )}
                </Link>
              )
            })}

            {/* Find Public Leagues card */}
            <Link
              to="/leagues"
              className="flex-shrink-0 w-64 card flex flex-col items-center justify-center text-center hover:border-[#D0A242]/30 transition-colors"
            >
              <svg className="w-10 h-10 text-[#D0A242] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="font-semibold text-[#D0A242]">Find Public Leagues</p>
              <p className="text-sm text-[#9CA3AF] mt-1">Browse and join leagues</p>
            </Link>
          </HorizontalScroll>
        )}
      </section>

      {/* ── GLOBAL USER LEADERBOARD ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Season Leaderboard</h2>
          <Link to="/leaderboard" className="text-sm text-[#D0A242] hover:text-[#C4963A]">Full leaderboard</Link>
        </div>

        {globalLeaderboard.length === 0 ? (
          <p className="text-[#9CA3AF]">No rankings yet for this season</p>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#9CA3AF] border-b border-[rgba(180,190,200,0.3)]">
                  <th className="pb-2 pr-4 w-12">#</th>
                  <th className="pb-2 pr-4">Player</th>
                  <th className="pb-2 pr-4 text-right">Picks</th>
                  <th className="pb-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {globalLeaderboard.slice(0, 10).map((entry, i) => (
                  <tr
                    key={entry.userId || i}
                    className={`border-b border-[rgba(180,190,200,0.3)] cursor-pointer hover:bg-[rgba(245,243,238,0.6)] transition-colors ${
                      user && entry.userId === user._id ? 'bg-[rgba(208,162,66,0.08)]' : ''
                    }`}
                    onClick={() => navigate(`/leaderboard?expand=${entry.userId}`)}
                  >
                    <td className="py-2 pr-4">
                      <span className={i < 3 ? 'text-[#1F2937] font-bold' : 'text-[#9CA3AF]'}>{i + 1}</span>
                    </td>
                    <td className="py-2 pr-4 font-medium">
                      {entry.name}
                      {user && entry.userId === user._id && <span className="text-xs text-[#D0A242] ml-2">(You)</span>}
                    </td>
                    <td className="py-2 pr-4 text-right text-[#9CA3AF]">{entry.picksCount}</td>
                    <td className="py-2 text-right text-[#D0A242] font-semibold">{entry.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── ATHLETE LEADERBOARDS (Men + Women) ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Athlete Rankings</h2>
          <Link to="/leaderboard?tab=athletes" className="text-sm text-[#D0A242] hover:text-[#C4963A]">View all athletes →</Link>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-[#22D3EE]">Men's</span> Leaderboard
            </h3>
            {menAthletes.length === 0 ? (
              <p className="text-[#9CA3AF] text-sm">No rankings yet</p>
            ) : (
              <div className="space-y-2">
                {menAthletes.slice(0, 10).map((athlete, i) => (
                  <div
                    key={athlete._id || i}
                    className="flex items-center justify-between text-sm cursor-pointer hover:bg-[rgba(245,243,238,0.6)] rounded-lg px-1 py-0.5 -mx-1 transition-colors"
                    onClick={() => navigate(`/leaderboard?tab=athletes&expand=${athlete._id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 text-center ${i < 3 ? 'text-[#1F2937] font-bold' : 'text-[#9CA3AF]'}`}>{i + 1}</span>
                      <div>
                        <p className="font-medium">{athlete.name}</p>
                        <p className="text-xs text-[#9CA3AF]">{athlete.country} • {athlete.racesCount} races</p>
                      </div>
                    </div>
                    <span className="text-[#D0A242] font-semibold">{athlete.totalPoints}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-[#E11D48]">Women's</span> Leaderboard
            </h3>
            {womenAthletes.length === 0 ? (
              <p className="text-[#9CA3AF] text-sm">No rankings yet</p>
            ) : (
              <div className="space-y-2">
                {womenAthletes.slice(0, 10).map((athlete, i) => (
                  <div
                    key={athlete._id || i}
                    className="flex items-center justify-between text-sm cursor-pointer hover:bg-[rgba(245,243,238,0.6)] rounded-lg px-1 py-0.5 -mx-1 transition-colors"
                    onClick={() => navigate(`/leaderboard?tab=athletes&expand=${athlete._id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 text-center ${i < 3 ? 'text-[#1F2937] font-bold' : 'text-[#9CA3AF]'}`}>{i + 1}</span>
                      <div>
                        <p className="font-medium">{athlete.name}</p>
                        <p className="text-xs text-[#9CA3AF]">{athlete.country} • {athlete.racesCount} races</p>
                      </div>
                    </div>
                    <span className="text-[#D0A242] font-semibold">{athlete.totalPoints}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
