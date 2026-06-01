import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import api from '../utils/api'
import { useTheme } from '../context/ThemeContext'
import PageMeta from '../components/PageMeta'

const SERIES_STYLES = {
  'T100': { background: 'rgba(236,72,153,0.12)', color: '#DB2777', backdropFilter: 'blur(8px)', border: '1px solid rgba(236,72,153,0.35)' },
  'Ironman Pro Series': { background: 'rgba(245,158,11,0.1)', color: '#B45309', backdropFilter: 'blur(8px)' },
  'Ironman 70.3 Pro Series': { background: 'rgba(245,158,11,0.08)', color: '#B45309', backdropFilter: 'blur(8px)' },
  'WTCS': { background: 'rgba(34,211,238,0.1)', color: '#0891B2', backdropFilter: 'blur(8px)' },
  'Other': { background: 'rgba(139,92,246,0.1)', color: '#7C3AED', backdropFilter: 'blur(8px)', border: '1px solid rgba(139,92,246,0.25)' },
}

const OTHER_SERIES_MAP = { 'Ironman': 'Other', 'Ironman 70.3': 'Other', 'Challenge': 'Other' }

const PAGE_SIZE = 20

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-lg text-sm bg-[#E8E3DA] text-[#6B7280] hover:bg-[#E8E3DA] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Prev
      </button>
      <span className="text-sm text-[#9CA3AF]">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-lg text-sm bg-[#E8E3DA] text-[#6B7280] hover:bg-[#E8E3DA] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  )
}

function SeriesBadge({ series }) {
  const display = OTHER_SERIES_MAP[series] || series
  const s = SERIES_STYLES[display] || SERIES_STYLES['Other']
  return <span className="text-xs px-2.5 py-0.5 rounded font-medium whitespace-nowrap" style={s}>{display}</span>
}

function formatTime(seconds) {
  if (!seconds) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`
}

function ScoringBlurb({ scoringStructure, context }) {
  const [open, setOpen] = useState(false)
  if (!scoringStructure) return null
  const entries = Object.entries(scoringStructure).filter(([, c]) => c > 0)
  const totalRaces = entries.reduce((a, [, c]) => a + c, 0)

  const CATEGORY_LABELS = {
    'T100': '2 best T100 scores',
    'Ironman Pro Series': '3 best Ironman Pro Series scores',
    'Ironman 70.3 Pro Series': '3 best 70.3 Pro Series scores',
    'WTCS': '1 best WTCS score',
    'Other': '2 best races in the Other category (Ironman non-pro series, Ironman 70.3 non-pro series, and Challenge)',
  }

  const parts = entries.map(([cat, count]) => CATEGORY_LABELS[cat] || `${count} best ${cat} score${count > 1 ? 's' : ''}`)

  return (
    <div className="bg-[rgba(216,221,223,0.45)] border border-[rgba(180,190,200,0.3)] rounded-lg mb-6">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 text-left">
        <svg className="w-5 h-5 text-[#D0A242] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm text-[#6B7280] flex-1">
          {context === 'league' ? 'League' : 'Global'} standings are based on your <span className="text-[#D0A242] font-semibold">{totalRaces} best race scores</span>
        </span>
        <svg className={`w-4 h-4 text-[#9CA3AF] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 ml-8">
          <p className="text-sm text-[#6B7280] leading-relaxed">
            Your {parts.slice(0, -1).join(', ')}{parts.length > 1 ? ', and ' : ''}{parts[parts.length - 1]}.
            {' '}Your highest scores from each category will be counted — others are still visible but greyed out.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {entries.map(([cat, count]) => (
              <span key={cat} className="text-xs px-2.5 py-0.5 rounded font-medium" style={SERIES_STYLES[cat] || SERIES_STYLES['Other']}>
                {count}× {cat}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ExpandCollapseButtons({ allIds, expandedSet, onExpandAll, onCollapseAll }) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const allExpanded = allIds.length > 0 && allIds.every(id => expandedSet.has(id))
  return (
    <div className="flex gap-2 mb-3">
      <button onClick={onExpandAll} className={`text-xs px-3 py-1 rounded transition-colors ${allExpanded ? (dark ? 'bg-[#0B101C] text-[#9CA3AF]' : 'bg-[#E8E3DA] text-[#9CA3AF]') : (dark ? 'bg-[#101726] text-[#9CA3AF] hover:bg-[#161E30]' : 'bg-[#E8E3DA] text-[#6B7280] hover:bg-[#F0EDE8]')}`}>
        Expand All
      </button>
      <button onClick={onCollapseAll} className={`text-xs px-3 py-1 rounded transition-colors ${expandedSet.size === 0 ? (dark ? 'bg-[#0B101C] text-[#9CA3AF]' : 'bg-[#E8E3DA] text-[#9CA3AF]') : (dark ? 'bg-[#101726] text-[#9CA3AF] hover:bg-[#161E30]' : 'bg-[#E8E3DA] text-[#6B7280] hover:bg-[#F0EDE8]')}`}>
        Collapse All
      </button>
    </div>
  )
}

// ── INLINE USER BREAKDOWN ──
function UserInlineBreakdown({ userId }) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [data, setData] = useState(null)
  const [expandedPicks, setExpandedPicks] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/leaderboard/user/${userId}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D0A242]" /></div>
  if (!data) return <p className="text-[#9CA3AF] text-sm p-4">Could not load breakdown</p>

  const { raceDetails } = data
  const OTHER_SERIES_LIST = ['Ironman', 'Ironman 70.3', 'Challenge']
  const qualifying = raceDetails.filter(r => r.qualifying).sort((a, b) => b.fantasyScoreTotal - a.fantasyScoreTotal)
  const extra = raceDetails.filter(r => !r.qualifying).sort((a, b) => b.fantasyScoreTotal - a.fantasyScoreTotal)

  const seriesOrder = ['T100', 'Ironman Pro Series', 'Ironman 70.3 Pro Series', 'WTCS', 'Other']
  const qualifyingBySeries = {}
  for (const rd of qualifying) {
    const cat = OTHER_SERIES_LIST.includes(rd.series) ? 'Other' : (rd.series || 'Other')
    if (!qualifyingBySeries[cat]) qualifyingBySeries[cat] = []
    qualifyingBySeries[cat].push(rd)
  }
  const sortedSeriesKeys = seriesOrder.filter(k => qualifyingBySeries[k])

  const togglePick = (slug) => {
    setExpandedPicks(prev => {
      const next = new Set(prev)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return next
    })
  }

  return (
    <div className={`mx-4 mt-1 p-4 rounded-b-lg border border-t-0 ${dark ? 'bg-[#0A0F1A] border-[rgba(255,255,255,0.1)]' : 'bg-[rgba(216,221,223,0.45)]/40 border-[rgba(180,190,200,0.3)]/30'}`}>
      {sortedSeriesKeys.map(series => (
        <div key={series} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <SeriesBadge series={series} />
            <span className="text-xs text-[#9CA3AF]">
              {qualifyingBySeries[series].length} event{qualifyingBySeries[series].length > 1 ? 's' : ''} · {qualifyingBySeries[series].reduce((s, rd) => s + rd.fantasyScoreTotal, 0)} pts
            </span>
          </div>
          <div className="space-y-1.5">
            {qualifyingBySeries[series].map((rd) => (
              <EventPickCard key={rd.eventSlug} rd={rd} expanded={expandedPicks.has(rd.eventSlug)} onToggle={() => togglePick(rd.eventSlug)} />
            ))}
          </div>
        </div>
      ))}

      {extra.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[rgba(180,190,200,0.3)]">
          <p className="text-xs text-[#9CA3AF] font-semibold mb-2">Not Counting Toward Season Score ({extra.length})</p>
          <div className="space-y-1.5 opacity-50">
            {extra.map((rd) => (
              <EventPickCard key={rd.eventSlug} rd={rd} expanded={expandedPicks.has(rd.eventSlug)} onToggle={() => togglePick(rd.eventSlug)} grayed />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EventPickCard({ rd, expanded, onToggle, grayed }) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const subPicks = rd.subPicks || []
  const primaryRaceId = subPicks.find(sp => sp.gender === 'M')?.raceId || subPicks[0]?.raceId
  const [expandedAthletes, setExpandedAthletes] = useState(new Set())

  const toggleAthlete = (key) => {
    setExpandedAthletes(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div>
      <button onClick={onToggle} className={`w-full text-left p-4 rounded-lg border transition-colors ${grayed ? (dark ? 'bg-[#080C15] border-[rgba(255,255,255,0.08)]' : 'bg-[rgba(216,221,223,0.45)]/40 border-[rgba(180,190,200,0.3)]/30') : (dark ? 'bg-[#0E1421] border-[rgba(255,255,255,0.12)] hover:border-[#15A780]/30' : 'bg-[rgba(216,221,223,0.45)] border-[rgba(180,190,200,0.3)] hover:border-[#D0A242]/20')}`}>
        <div className="flex items-center justify-between">
          <div>
            {primaryRaceId ? (
              <Link to={`/races/${primaryRaceId}`} onClick={e => e.stopPropagation()} className="font-medium hover:text-[#D0A242] transition-colors">{rd.eventName}</Link>
            ) : (
              <p className="font-medium">{rd.eventName}</p>
            )}
            <p className="text-xs text-[#9CA3AF] mt-1">{rd.location}{rd.date ? `   ${new Date(rd.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`font-bold text-lg ${grayed ? 'text-[#9CA3AF]' : dark ? 'text-white' : 'text-[#D0A242]'}`}>{rd.fantasyScoreTotal}</span>
            <svg className={`w-4 h-4 text-[#9CA3AF] transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </button>

      {expanded && (
        <div className={`mx-4 mt-1 p-4 rounded-b-lg border border-t-0 ${dark ? 'bg-[#0A0F1A] border-[rgba(255,255,255,0.1)]' : 'bg-[rgba(216,221,223,0.45)]/40 border-[rgba(180,190,200,0.3)]/30'}`}>
          {subPicks.map((sp, si) => {
            const athletePicks = sp.fantasyBreakdown?.athletePicks || []
            const fastest = sp.fantasyBreakdown?.fastest || {}
            return (
              <div key={si} className="mb-4 last:mb-0">
                <h4 className="text-sm font-semibold text-[#9CA3AF] mb-2 flex items-center gap-2">
                  <span className={sp.gender === 'M' ? 'text-[#22D3EE]' : 'text-[#E11D48]'}>{sp.gender === 'M' ? "Men's" : "Women's"}</span>
                  <span className="text-[#9CA3AF]">·</span>
                  <span className={dark ? 'text-white' : 'text-[#D0A242]'}>{sp.fantasyScoreTotal} pts</span>
                </h4>
                <div className="space-y-1.5 mb-2">
                  {athletePicks.map((ap, i) => {
                    const athleteKey = `${rd.eventSlug}-${sp.gender}-${i}`
                    const isExpanded = expandedAthletes.has(athleteKey)
                    const bd = ap.athleteBreakdown || {}
                    return (
                    <div key={i}>
                      <div
                        onClick={() => toggleAthlete(athleteKey)}
                        className={`flex items-center justify-between text-sm p-2 rounded cursor-pointer transition-colors ${dark ? 'bg-[#0E1421] hover:bg-[#131A2B]' : 'bg-[rgba(245,243,238,0.6)] hover:bg-[#F0EDE8]'}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#9CA3AF] w-5">#{i + 1}</span>
                          {ap.athlete ? (
                            <Link to={`/leaderboard?tab=athletes&expand=${ap.athlete}`} onClick={e => e.stopPropagation()} className="font-medium hover:text-[#D0A242] transition-colors">{ap.athleteName}</Link>
                          ) : (
                            <span className="font-medium">{ap.athleteName}</span>
                          )}
                          <span className="text-xs text-[#9CA3AF] hidden sm:inline">Predicted: {ap.predictedPlace} → Actual: {ap.actualPlace || '?'}</span>
                          {ap.isUnderdog && <span className="text-xs px-1.5 py-0.5 rounded-full bg-[rgba(208,162,66,0.08)] text-[#D0A242] border border-[#D0A242]/20">Underdog</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${dark ? 'text-white' : 'text-[#D0A242]'}`}>{ap.points}</span>
                          <svg className={`w-3 h-3 text-[#9CA3AF] transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className={`sm:ml-4 mt-1 mb-1 p-2 sm:p-3 rounded-lg border ${dark ? 'bg-[#0A0F1A] border-[rgba(255,255,255,0.1)]' : 'bg-[rgba(216,221,223,0.45)] border-[rgba(180,190,200,0.3)]/30'}`}>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <div className={`rounded-lg p-3 text-center ${dark ? 'bg-[#0B101C]' : 'bg-[#E8E3DA]/40'}`}>
                              <p className="text-xs text-[#9CA3AF] mb-1">Placement</p>
                              <p className={`text-lg font-bold ${dark ? 'text-white' : 'text-[#1F2937]'}`}>{bd.placementPoints || 0}</p>
                              <p className="text-xs text-[#9CA3AF] mt-0.5">{bd.rawPlacement != null && bd.multiplier != null ? `${bd.rawPlacement} \u00d7 ${bd.multiplier}` : 'Points based on finishing position'}</p>
                            </div>
                            <div className={`rounded-lg p-3 text-center ${dark ? 'bg-[#0B101C]' : 'bg-[#E8E3DA]/40'}`}>
                              <p className="text-xs text-[#9CA3AF] mb-1">Time Bonus</p>
                              <p className={`text-lg font-bold ${dark ? 'text-white' : 'text-[#1F2937]'}`}>{bd.timeBonus || 0}</p>
                              <p className="text-xs text-[#9CA3AF] mt-0.5">{bd.rawTimeBonus != null && bd.multiplier != null ? `${bd.rawTimeBonus} \u00d7 ${bd.multiplier}` : 'Bonus based on time gap to winner'}</p>
                            </div>
                            <div className={`rounded-lg p-3 text-center ${dark ? 'bg-[#0B101C]' : 'bg-[#E8E3DA]/40'}`}>
                              <p className="text-xs text-[#9CA3AF] mb-1">Split Bonus</p>
                              <p className={`text-lg font-bold ${dark ? 'text-white' : 'text-[#1F2937]'}`}>{bd.splitBonus || 0}</p>
                              {bd.splitBreakdown && <p className="text-xs text-[#9CA3AF]">Swim:{bd.splitBreakdown.swim || 0} Bike:{bd.splitBreakdown.bike || 0} Run:{bd.splitBreakdown.run || 0}</p>}
                            </div>
                            <div className={`rounded-lg p-3 text-center ${dark ? 'bg-[#0B101C]' : 'bg-[#E8E3DA]/40'}`}>
                              <p className="text-xs text-[#9CA3AF] mb-1">Underdog Bonus</p>
                              <p className={`text-lg font-bold ${dark ? 'text-white' : 'text-[#1F2937]'}`}>{bd.underdogBonus || 0}</p>
                              <p className="text-xs text-[#9CA3AF] mt-0.5">{bd.underdogBonus > 0 ? `Outperformed seed by ${bd.gain || '?'} spots` : 'No seed upset'}</p>
                            </div>
                            <div className={`rounded-lg p-3 text-center ${dark ? 'bg-[#0B101C]' : 'bg-[#E8E3DA]/40'}`}>
                              <p className="text-xs text-[#9CA3AF] mb-1">Course Record</p>
                              <p className={`text-lg font-bold ${dark ? 'text-white' : 'text-[#1F2937]'}`}>{bd.recordBonus || 0}</p>
                              <p className="text-xs text-[#9CA3AF] mt-0.5">{bd.recordBonus > 0 ? `Record: ${[bd.recordBonus >= 3 ? 'Overall' : null, bd.recordSwim ? 'Swim' : null, bd.recordBike ? 'Bike' : null, bd.recordRun ? 'Run' : null].filter(Boolean).join(', ') || 'Overall'}` : 'No record broken'}</p>
                            </div>
                            <div className={`border-l-2 rounded-lg p-3 text-center ${dark ? 'bg-[rgba(21,167,128,0.15)] border-[#15A780]' : 'bg-[rgba(245,243,238,0.35)] border-[#D0A242]'}`}>
                              <p className={`text-xs mb-1 ${dark ? 'text-[#15A780]' : 'text-[#D0A242]'}`}>Total</p>
                              <p className={`text-lg font-bold ${dark ? 'text-[#15A780]' : 'text-[#D0A242]'}`}>{bd.totalScore || ap.points || 0}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )})}</div>
                {(fastest.swimPick || fastest.bikePick || fastest.runPick || fastest.swim > 0 || fastest.bike > 0 || fastest.run > 0) && (
                  <div className="mb-2">
                    <div className="space-y-1">
                      <div className={`flex items-center justify-between p-1.5 rounded ${dark ? 'bg-[#0B101C]' : 'bg-[rgba(245,243,238,0.35)]'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[#9CA3AF] w-10">Swim</span>
                          {fastest.swimPick?.athlete ? (
                            <Link to={`/leaderboard?tab=athletes&expand=${fastest.swimPick.athlete}`} className="text-xs font-medium hover:text-[#D0A242] transition-colors">{fastest.swimPick.athleteName}</Link>
                          ) : (
                            <span className="text-xs text-[#9CA3AF]">{fastest.swimPick?.athleteName || '—'}</span>
                          )}
                        </div>
                        <span className={`text-xs font-semibold ${(fastest.swim || 0) > 0 ? 'text-[#D0A242]' : 'text-[#9CA3AF]'}`}>{(fastest.swim || 0) > 0 ? `+${fastest.swim}` : '0'}</span>
                      </div>
                      <div className={`flex items-center justify-between p-1.5 rounded ${dark ? 'bg-[#0B101C]' : 'bg-[rgba(245,243,238,0.35)]'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[#9CA3AF] w-10">Bike</span>
                          {fastest.bikePick?.athlete ? (
                            <Link to={`/leaderboard?tab=athletes&expand=${fastest.bikePick.athlete}`} className="text-xs font-medium hover:text-[#D0A242] transition-colors">{fastest.bikePick.athleteName}</Link>
                          ) : (
                            <span className="text-xs text-[#9CA3AF]">{fastest.bikePick?.athleteName || '—'}</span>
                          )}
                        </div>
                        <span className={`text-xs font-semibold ${(fastest.bike || 0) > 0 ? 'text-[#D0A242]' : 'text-[#9CA3AF]'}`}>{(fastest.bike || 0) > 0 ? `+${fastest.bike}` : '0'}</span>
                      </div>
                      <div className={`flex items-center justify-between p-1.5 rounded ${dark ? 'bg-[#0B101C]' : 'bg-[rgba(245,243,238,0.35)]'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[#9CA3AF] w-10">Run</span>
                          {fastest.runPick?.athlete ? (
                            <Link to={`/leaderboard?tab=athletes&expand=${fastest.runPick.athlete}`} className="text-xs font-medium hover:text-[#D0A242] transition-colors">{fastest.runPick.athleteName}</Link>
                          ) : (
                            <span className="text-xs text-[#9CA3AF]">{fastest.runPick?.athleteName || '—'}</span>
                          )}
                        </div>
                        <span className={`text-xs font-semibold ${(fastest.run || 0) > 0 ? 'text-[#D0A242]' : 'text-[#9CA3AF]'}`}>{(fastest.run || 0) > 0 ? `+${fastest.run}` : '0'}</span>
                      </div>
                    </div>
                  </div>
                )}
                {sp.fantasyBreakdown?.sideBets && (sp.fantasyBreakdown.sideBets.totalPoints > 0 || (sp.fantasyBreakdown.sideBets.bets && sp.fantasyBreakdown.sideBets.bets.length > 0)) && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-[#9CA3AF] mb-1">Side Bets <span className="text-[#D0A242]">+{sp.fantasyBreakdown.sideBets.totalPoints || 0} pts</span></p>
                    <div className="space-y-1">
                      {(sp.fantasyBreakdown.sideBets.bets || []).map((bet, bi) => (
                        <div key={bi} className={`flex items-center justify-between text-xs p-1.5 rounded ${dark ? 'bg-[#0B101C]' : 'bg-[rgba(245,243,238,0.6)]'}`}>
                          <div>
                            <p className="text-[#6B7280] text-xs">{bet.name}</p>
                            <p className="text-xs text-[#9CA3AF] mt-0.5">Picked: {bet.pick} · Result: {bet.result}</p>
                          </div>
                          <span className={`font-semibold ${bet.correct ? 'text-[#D0A242]' : 'text-[#E11D48]'}`}>
                            {bet.correct ? `+${bet.points}` : '+0'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          <div className="text-right text-sm border-t border-[rgba(180,190,200,0.3)] pt-2">
            <span className="text-[#9CA3AF]">Event Total: </span>
            <span className="text-[#D0A242] font-bold">{rd.fantasyScoreTotal}</span>
            {rd.isSingleGender && <span className="text-xs text-[#E11D48] ml-2">(×2 applied)</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── MAIN LEADERBOARD ──
export default function Leaderboard() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'global')
  const [genderFilter, setGenderFilter] = useState('')
  const [data, setData] = useState([])
  const [scoringStructure, setScoringStructure] = useState(null)
  const [loading, setLoading] = useState(true)
  const expandId = searchParams.get('expand') || null

  useEffect(() => {
    const paramTab = searchParams.get('tab') || 'global'
    if (paramTab !== tab) setTab(paramTab)
  }, [searchParams])

  useEffect(() => {
    fetchLeaderboard()
  }, [tab, genderFilter])

  async function fetchLeaderboard() {
    setLoading(true)
    try {
      let endpoint = '/leaderboard/global'
      if (tab === 'athletes') {
        endpoint = genderFilter ? `/leaderboard/gender/${genderFilter}` : '/leaderboard/athletes'
      }
      const { data: res } = await api.get(endpoint)
      setData(res.leaderboard || [])
      if (res.scoringStructure) setScoringStructure(res.scoringStructure)
    } catch (err) {
      console.error(err)
      setData([])
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageMeta title="Leaderboard" description="Season standings and athlete rankings" />
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-[#9CA3AF] hover:text-[#1F2937] transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('global')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'global' ? 'bg-[#D0A242] text-[#1F2937]' : 'bg-[#E8E3DA] text-[#6B7280]'}`}
        >
          Global Users
        </button>
        <button
          onClick={() => setTab('athletes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'athletes' ? 'bg-[#D0A242] text-[#1F2937]' : 'bg-[#E8E3DA] text-[#6B7280]'}`}
        >
          Athletes
        </button>
      </div>

      {/* Gender Filter (athletes only) */}
      {tab === 'athletes' && (
        <div className="flex gap-2 mb-4">
          {[{ val: '', label: 'All' }, { val: 'M', label: 'Men' }, { val: 'F', label: 'Women' }].map(opt => (
            <button
              key={opt.val}
              onClick={() => setGenderFilter(opt.val)}
              className={`px-3 py-1 rounded text-sm ${genderFilter === opt.val ? 'bg-[#D0A242] text-slate-900' : 'bg-[#E8E3DA] text-[#6B7280]'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Scoring blurb for global */}
      {tab === 'global' && scoringStructure && (
        <ScoringBlurb scoringStructure={scoringStructure} context="global" />
      )}

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D0A242]" /></div>
      ) : data.length === 0 ? (
        <div className="card text-center py-12"><p className="text-[#9CA3AF]">No data available yet</p></div>
      ) : tab === 'global' ? (
        <GlobalUserTable data={data} expandId={expandId} />
      ) : (
        <AthleteTable data={data} expandId={expandId} />
      )}
    </div>
  )
}

function GlobalUserTable({ data, expandId }) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [expandedUsers, setExpandedUsers] = useState(new Set())
  const [highlightId, setHighlightId] = useState(expandId)
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(data.length / PAGE_SIZE)

  useEffect(() => {
    if (expandId && data.length > 0) {
      setExpandedUsers(new Set([expandId]))
      setHighlightId(expandId)
      setTimeout(() => {
        document.getElementById(`user-${expandId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      const timer = setTimeout(() => setHighlightId(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [expandId, data])

  const toggleUser = (userId) => {
    setExpandedUsers(prev => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }
  const pagedData = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const allUserIds = pagedData.map(e => e.userId)

  return (
    <div>
      <ExpandCollapseButtons
        allIds={allUserIds}
        expandedSet={expandedUsers}
        onExpandAll={() => setExpandedUsers(new Set(allUserIds))}
        onCollapseAll={() => setExpandedUsers(new Set())}
      />
      <div className="space-y-2">
        {pagedData.map((entry, idx) => {
          const i = (page - 1) * PAGE_SIZE + idx
          const recent = entry.recentRace
          const isExpanded = expandedUsers.has(entry.userId)
          return (
            <div key={entry.userId || i} id={`user-${entry.userId}`}>
              <button
                onClick={() => toggleUser(entry.userId)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${dark ? 'bg-[#0E1421]' : 'bg-[rgba(216,221,223,0.45)]'} ${
                  highlightId === entry.userId ? 'border-amber-500/60 ring-1 ring-amber-500/30' : (dark ? 'border-[rgba(255,255,255,0.12)] hover:border-[#15A780]/30' : 'border-[rgba(180,190,200,0.3)] hover:border-[#D0A242]/20')
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${dark ? 'text-white' : i < 3 ? 'text-[#1F2937]' : 'text-[#9CA3AF]'}`}>
                      {i + 1}
                    </span>
                    <div>
                      <span className="font-semibold">{entry.name}</span>
                      <span className="text-sm text-[#9CA3AF] ml-2">{entry.picksCount} event{entry.picksCount !== 1 ? 's' : ''}</span>
                      {recent && (
                        <div className="hidden sm:flex items-center gap-3 mt-1">
                          <SeriesBadge series={recent.series} />
                          <span className="text-sm text-[#6B7280]">{(recent.eventName || recent.raceName)?.replace(/\s*2026\s*/, '')}</span>
                          <span className="text-xs text-[#9CA3AF]">;</span>
                          <span className="text-sm text-[#D0A242] font-semibold">{recent.points} pts</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-lg ${dark ? 'text-white' : 'text-[#D0A242]'}`}>{entry.totalPoints}</span>
                    <svg className={`w-4 h-4 text-[#9CA3AF] transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </button>
              {isExpanded && <UserInlineBreakdown userId={entry.userId} />}
            </div>
          )
        })}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}

function AthleteTable({ data, expandId }) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [expandedAthletes, setExpandedAthletes] = useState(new Set())
  const [search, setSearch] = useState('')
  const [highlightId, setHighlightId] = useState(expandId)

  useEffect(() => {
    if (expandId && data.length > 0) {
      setExpandedAthletes(new Set([expandId]))
      setHighlightId(expandId)
      setTimeout(() => {
        document.getElementById(`athlete-${expandId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      const timer = setTimeout(() => setHighlightId(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [expandId, data])

  const toggleAthlete = (athleteId) => {
    setExpandedAthletes(prev => {
      const next = new Set(prev)
      next.has(athleteId) ? next.delete(athleteId) : next.add(athleteId)
      return next
    })
  }

  const [page, setPage] = useState(1)

  const filtered = search.trim()
    ? data.filter(a => (a.name || '').toLowerCase().includes(search.toLowerCase()) || (a.country || '').toLowerCase().includes(search.toLowerCase()))
    : data
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pagedFiltered = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const allAthleteIds = pagedFiltered.map(a => a._id)

  return (
    <div>
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          type="text"
          placeholder="Search athletes by name or country..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className={`w-full border rounded-lg pl-10 pr-10 py-2.5 text-sm placeholder-[#94A3B8] focus:outline-none ${dark ? 'bg-[#0E1421] border-[rgba(255,255,255,0.12)] text-white focus:border-[#15A780]/30' : 'bg-[rgba(216,221,223,0.45)] border-[rgba(180,190,200,0.3)] text-[#1F2937] focus:border-[#D0A242]/30'}`}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1F2937]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
      <ExpandCollapseButtons
        allIds={allAthleteIds}
        expandedSet={expandedAthletes}
        onExpandAll={() => setExpandedAthletes(new Set(allAthleteIds))}
        onCollapseAll={() => setExpandedAthletes(new Set())}
      />
      <div className="space-y-2">
        {pagedFiltered.map((athlete, idx) => {
          const i = (page - 1) * PAGE_SIZE + idx
          const recentScores = (athlete.raceScores || []).slice(-2).reverse()
          const isExpanded = expandedAthletes.has(athlete._id)
          return (
            <div key={athlete._id || i} id={`athlete-${athlete._id}`}>
              <button
                onClick={() => toggleAthlete(athlete._id)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${dark ? 'bg-[#0E1421]' : 'bg-[rgba(216,221,223,0.45)]'} ${
                  highlightId === athlete._id ? 'border-amber-500/60 ring-1 ring-amber-500/30' : (dark ? 'border-[rgba(255,255,255,0.12)] hover:border-[#15A780]/30' : 'border-[rgba(180,190,200,0.3)] hover:border-[#D0A242]/20')
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${dark ? 'text-white' : i < 3 ? 'text-[#1F2937]' : 'text-[#9CA3AF]'}`}>
                      {i + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{athlete.name}</span>
                        <span className="text-xs text-[#9CA3AF]">{athlete.country}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-xs">
                        {athlete.ptoRanking && <span className="text-[#B45309]">PTO: {athlete.ptoRanking}</span>}
                        <span className="text-[#22D3EE]">Swim: {athlete.swimRanking || '-'}</span>
                        <span className="text-[#D0A242]">Bike: {athlete.bikeRanking || '-'}</span>
                        <span className="text-[#E11D48]">Run: {athlete.runRanking || '-'}</span>
                        {athlete.wtsRanking && <span className="text-[#A5B4FC]">WTCS: {athlete.wtsRanking}</span>}
                        {athlete.podiumPct && athlete.podiumPct !== '0' && athlete.podiumPct !== '0.0' && (
                          <span className="text-[#B45309]">WTCS Podium: {athlete.podiumPct}%</span>
                        )}
                        {athlete.winPct && athlete.winPct !== '0' && athlete.winPct !== '0.0' && (
                          <span className="text-[#B45309]">WTCS Win: {athlete.winPct}%</span>
                        )}
                      </div>
                      {recentScores.length > 0 && (
                        <div className="hidden sm:flex flex-col gap-1 mt-1.5">
                          {recentScores.map((rs, j) => (
                            <div key={j} className="flex items-center gap-1.5">
                              <SeriesBadge series={rs.series} />
                              <span className="text-sm text-[#6B7280]">{rs.race?.replace(/\s*2026\s*/, '')}</span>
                              <span className="text-xs text-[#9CA3AF]">;</span>
                              <span className="text-sm text-[#D0A242] font-semibold">{rs.score} pts</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-lg ${dark ? 'text-white' : 'text-[#D0A242]'}`}>{athlete.totalPoints}</span>
                    <svg className={`w-4 h-4 text-[#9CA3AF] transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </button>
              {isExpanded && <AthleteInlineBreakdown athleteId={athlete._id} />}
            </div>
          )
        })}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={p => { setPage(p); setExpandedAthletes(new Set()) }} />
    </div>
  )
}

function AthleteInlineBreakdown({ athleteId }) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [data, setData] = useState(null)
  const [expandedRaces, setExpandedRaces] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/leaderboard/athlete/${athleteId}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [athleteId])

  if (loading) return <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D0A242]" /></div>
  if (!data) return <p className="text-[#9CA3AF] text-sm p-4">Could not load breakdown</p>

  const { athlete, raceScores, totalPoints } = data

  const toggleRace = (i) => {
    setExpandedRaces(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }
  return (
    <div className={`mx-4 mt-1 p-4 rounded-b-lg border border-t-0 ${dark ? 'bg-[#0A0F1A] border-[rgba(255,255,255,0.1)]' : 'bg-[rgba(216,221,223,0.45)]/40 border-[rgba(180,190,200,0.3)]/30'}`}>
      <div className="space-y-2">
        {raceScores.map((rs, i) => (
          <div key={i}>
            <button
              onClick={() => toggleRace(i)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${dark ? 'bg-[#0E1421] border-[rgba(255,255,255,0.12)] hover:border-[#15A780]/30' : 'bg-[rgba(216,221,223,0.45)] border-[rgba(180,190,200,0.3)] hover:border-[#D0A242]/20'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    rs.place === 1 ? (dark ? 'bg-[rgba(21,167,128,0.15)] text-[#15A780]' : 'bg-[rgba(208,162,66,0.08)] text-[#D0A242]') : rs.place === 2 ? (dark ? 'bg-[#0E1421] text-[#9CA3AF]' : 'bg-slate-400/20 text-[#6B7280]') : rs.place === 3 ? (dark ? 'bg-[rgba(225,29,72,0.15)] text-[#E11D48]' : 'bg-[rgba(208,162,66,0.08)] text-[#E11D48]') : (dark ? 'bg-[#0E1421] text-[#9CA3AF]' : 'bg-[#E8E3DA] text-[#9CA3AF]')
                  }`}>
                    {rs.place || '-'}
                  </span>
                  <div>
                    {rs.raceId ? (
                      <Link to={`/races/${rs.raceId}`} onClick={e => e.stopPropagation()} className="font-medium hover:text-[#D0A242] transition-colors">{rs.race}</Link>
                    ) : (
                      <p className="font-medium">{rs.race}</p>
                    )}
                    <p className="text-xs text-[#9CA3AF] mt-1">{rs.location}{rs.date ? `   ${new Date(rs.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-lg ${dark ? 'text-white' : 'text-[#D0A242]'}`}>{rs.score}</span>
                  <svg className={`w-4 h-4 text-[#9CA3AF] transition-transform ${expandedRaces.has(i) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </button>

            {expandedRaces.has(i) && rs.breakdown && (
              <div className={`mx-3 mt-1 p-3 rounded-b-lg border border-t-0 space-y-3 ${dark ? 'bg-[#0A0F1A] border-[rgba(255,255,255,0.1)]' : 'bg-[rgba(216,221,223,0.45)]/30 border-[rgba(180,190,200,0.3)]/20'}`}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  <div className={`rounded-lg p-2 text-center ${dark ? 'bg-[#0B101C]' : 'bg-[rgba(245,243,238,0.6)]'}`}>
                    <div className="text-xs text-[#9CA3AF] mb-1">Placement</div>
                    <div className={`text-lg font-bold ${dark ? 'text-white' : 'text-[#1F2937]'}`}>{Math.round((rs.breakdown.placementPoints || 0) * 0.8)}</div>
                    <div className="text-xs text-[#9CA3AF] mt-0.5">{rs.breakdown.placementPoints || 0} × 0.8</div>
                  </div>
                  <div className={`rounded-lg p-2 text-center ${dark ? 'bg-[#0B101C]' : 'bg-[rgba(245,243,238,0.6)]'}`}>
                    <div className="text-xs text-[#9CA3AF] mb-1">Time Bonus</div>
                    <div className={`text-lg font-bold ${dark ? 'text-white' : 'text-[#1F2937]'}`}>{Math.round((rs.breakdown.timeBonus || 0) * 0.2)}</div>
                    <div className="text-xs text-[#9CA3AF] mt-0.5">{rs.breakdown.timeBonus || 0} × 0.2</div>
                  </div>
                  <div className={`rounded-lg p-2 text-center ${dark ? 'bg-[#0B101C]' : 'bg-[rgba(245,243,238,0.6)]'}`}>
                    <div className="text-xs text-[#9CA3AF] mb-1">Split Bonus</div>
                    <div className={`text-lg font-bold ${dark ? 'text-white' : 'text-[#1F2937]'}`}>{rs.breakdown.splitBonus || 0}</div>
                    <div className="text-xs text-[#9CA3AF] mt-0.5">
                      Swim:{rs.breakdown.splitBreakdown?.swim || 0} Bike:{rs.breakdown.splitBreakdown?.bike || 0} Run:{rs.breakdown.splitBreakdown?.run || 0}
                    </div>
                  </div>
                  <div className={`rounded-lg p-2 text-center ${dark ? 'bg-[#0B101C]' : 'bg-[rgba(245,243,238,0.6)]'}`}>
                    <div className="text-xs text-[#9CA3AF] mb-1">Underdog Bonus</div>
                    <div className={`text-lg font-bold ${dark ? 'text-white' : 'text-[#1F2937]'}`}>{rs.breakdown.underdogBonus || 0}</div>
                    <div className="text-xs text-[#9CA3AF] mt-0.5">{rs.breakdown.underdogBonus > 0 ? `Outperformed seed by ${rs.breakdown.gain || '?'} spots` : 'No seed upset'}</div>
                  </div>
                  <div className={`rounded-lg p-2 text-center ${dark ? 'bg-[#0B101C]' : 'bg-[rgba(245,243,238,0.6)]'}`}>
                    <div className="text-xs text-[#9CA3AF] mb-1">Course Record</div>
                    <div className={`text-lg font-bold ${dark ? 'text-white' : 'text-[#1F2937]'}`}>{rs.breakdown.recordBonus || 0}</div>
                    <div className="text-xs text-[#9CA3AF] mt-0.5">{rs.breakdown.recordBonus > 0 ? `Record: ${[rs.breakdown.recordBonus >= 3 ? 'Overall' : null, rs.breakdown.recordSwim ? 'Swim' : null, rs.breakdown.recordBike ? 'Bike' : null, rs.breakdown.recordRun ? 'Run' : null].filter(Boolean).join(', ') || 'Overall'}` : 'No record broken'}</div>
                  </div>
                  <div className={`rounded-lg p-2 text-center border ${dark ? 'bg-[rgba(21,167,128,0.15)] border-[#15A780]/15' : 'bg-[rgba(208,162,66,0.08)] border-[#D0A242]/15'}`}>
                    <div className={`text-xs mb-1 ${dark ? 'text-[#15A780]' : 'text-[#D0A242]'}`}>Total</div>
                    <div className={`text-lg font-bold ${dark ? 'text-[#15A780]' : 'text-[#D0A242]'}`}>{rs.breakdown.totalScore || 0}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
