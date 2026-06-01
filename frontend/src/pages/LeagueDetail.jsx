import { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
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

const SERIES_SHORT = {
  'T100': 'T100',
  'Ironman Pro Series': 'IM Pro',
  'Ironman 70.3 Pro Series': '70.3 Pro',
  'WTCS': 'WTCS',
  'Other': 'Other',
}

function SeriesBadge({ series }) {
  const s = SERIES_STYLES[series] || SERIES_STYLES['Other']
  return <span className="text-xs px-2.5 py-0.5 rounded font-medium whitespace-nowrap" style={s}>{series}</span>
}

function ExpandCollapseButtons({ allIds, expandedSet, onExpandAll, onCollapseAll }) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  return (
    <div className="flex gap-2 mb-3">
      <button onClick={onExpandAll} disabled={expandedSet.size === allIds.length}
        className={`text-xs px-3 py-1 rounded disabled:opacity-40 ${dark ? 'bg-[#101726] text-[#9CA3AF] hover:bg-[#161E30]' : 'bg-[#E8E3DA] hover:bg-[#E8E3DA] text-[#6B7280]'}`}>Expand All</button>
      <button onClick={onCollapseAll} disabled={expandedSet.size === 0}
        className={`text-xs px-3 py-1 rounded disabled:opacity-40 ${dark ? 'bg-[#101726] text-[#9CA3AF] hover:bg-[#161E30]' : 'bg-[#E8E3DA] hover:bg-[#E8E3DA] text-[#6B7280]'}`}>Collapse All</button>
    </div>
  )
}

function SettingsModal({ league, onClose, onSave }) {
  const [name, setName] = useState(league.name || '')
  const [isPrivate, setIsPrivate] = useState(league.isPrivate || false)
  const [password, setPassword] = useState('')
  const [scoring, setScoring] = useState(league.scoringStructure || {})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const payload = { name, isPrivate, scoringStructure: scoring }
      if (password) payload.password = password
      await api.put(`/leagues/${league._id}/settings`, payload)
      onSave({ ...league, name, isPrivate, scoringStructure: scoring })
    } catch (err) {
      console.error('Save settings error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/leagues/${league._id}`)
      window.location.href = '/leagues'
    } catch (err) {
      console.error('Delete league error:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="modal-panel w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[rgba(180,190,200,0.3)]">
          <h2 className="text-xl font-bold">League Settings</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#1F2937] text-xl">&times;</button>
        </div>

        <div className="p-5 space-y-5">
          {/* League Name */}
          <div>
            <label className="block text-sm font-medium text-[#6B7280] mb-1">League Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" />
          </div>

          {/* Privacy Toggle */}
          <div>
            <p className="font-medium mb-2">League Visibility</p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPrivate(false)}
                className={`flex-1 p-3 rounded-lg border-2 text-center transition-colors ${
                  !isPrivate
                    ? 'border-[#D0A242]/30 bg-[rgba(208,162,66,0.08)]'
                    : 'border-[rgba(180,190,200,0.3)] bg-[rgba(245,243,238,0.6)] hover:border-[#D0A242]/20'
                }`}
              >
                <div className={`text-sm font-semibold ${!isPrivate ? 'text-[#059669]' : 'text-[#9CA3AF]'}`}>Public</div>
                <div className="text-xs text-[#9CA3AF] mt-0.5">Anyone can find & join</div>
              </button>
              <button
                onClick={() => setIsPrivate(true)}
                className={`flex-1 p-3 rounded-lg border-2 text-center transition-colors ${
                  isPrivate
                    ? 'border-[#E11D48]/30 bg-[rgba(251,113,133,0.1)]'
                    : 'border-[rgba(180,190,200,0.3)] bg-[rgba(245,243,238,0.6)] hover:border-[#D0A242]/20'
                }`}
              >
                <div className={`text-sm font-semibold ${isPrivate ? 'text-[#E11D48]' : 'text-[#9CA3AF]'}`}>Private</div>
                <div className="text-xs text-[#9CA3AF] mt-0.5">Invite only</div>
              </button>
            </div>
            <p className="text-xs text-[#9CA3AF] mt-2">Currently: <span className={isPrivate ? 'text-[#E11D48]' : 'text-[#059669]'}>{isPrivate ? 'Private' : 'Public'}</span></p>
          </div>

          {/* Password Reset */}
          <div>
            <label className="block text-sm font-medium text-[#6B7280] mb-1">League Password (optional)</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Set new password" className="w-full bg-[#E8E3DA] border border-[rgba(180,190,200,0.3)] rounded-lg px-3 py-2 text-[#1F2937]" />
          </div>

          {/* Scoring Structure Sliders */}
          <div>
            <label className="block text-sm font-medium text-[#6B7280] mb-1">Scoring Structure (best races per category)</label>
            <p className="text-xs text-[#9CA3AF] mb-3">"Other" includes Ironman, Ironman 70.3, and Challenge series races.</p>
            <div className="space-y-3">
              {Object.entries(scoring).map(([series, count]) => (
                <div key={series} className="flex items-center gap-3">
                  <span className="text-xs px-2.5 py-0.5 rounded whitespace-nowrap min-w-[80px] text-center font-medium" style={SERIES_STYLES[series] || SERIES_STYLES['Other']}>
                    {SERIES_SHORT[series] || series}
                  </span>
                  <input
                    type="range" min="0" max="10" value={count}
                    onChange={e => setScoring(prev => ({ ...prev, [series]: parseInt(e.target.value) }))}
                    className="flex-1 accent-[#15A780]"
                  />
                  <span className="text-sm font-mono w-6 text-center text-[#D0A242]">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transfer Admin - placeholder */}
          <div className="border-t border-[rgba(180,190,200,0.3)] pt-4">
            <p className="text-sm font-medium text-[#6B7280] mb-2">Transfer Admin</p>
            <p className="text-xs text-[#9CA3AF]">Transfer league ownership to another member.</p>
            <button className="mt-2 text-sm px-4 py-1.5 rounded bg-[#E8E3DA] hover:bg-[#E8E3DA] text-[#6B7280]">Transfer Ownership</button>
          </div>

          {/* Delete League */}
          <div className="border-t border-[rgba(180,190,200,0.3)] pt-4">
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <p className="text-sm text-[#E11D48]">Are you sure? This cannot be undone.</p>
                <button onClick={handleDelete} className="text-sm px-4 py-1.5 rounded bg-[#BE123C] hover:bg-[#9C3D3D] text-[#1F2937]">Delete</button>
                <button onClick={() => setConfirmDelete(false)} className="text-sm px-4 py-1.5 rounded bg-[#E8E3DA] hover:bg-[#E8E3DA] text-[#6B7280]">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-sm px-4 py-1.5 rounded bg-[rgba(251,113,133,0.1)] text-[#E11D48] hover:bg-[rgba(251,113,133,0.1)] border border-[#BE123C]/20">
                Delete League
              </button>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-[rgba(180,190,200,0.3)] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#E8E3DA] hover:bg-[#E8E3DA] text-[#6B7280]">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-[#D0A242] hover:bg-[#4CD9A5] text-[#1F2937] disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── INLINE USER BREAKDOWN (same pattern as global leaderboard) ──
function UserInlineBreakdown({ userId, leagueId, selectedSeason }) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [data, setData] = useState(null)
  const [expandedPicks, setExpandedPicks] = useState(new Set())
  const [expandedAthletes, setExpandedAthletes] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const toggleAthlete = (key) => {
    setExpandedAthletes(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  useEffect(() => {
    let cancelled = false
    async function fetchDetail() {
      try {
        const { data: d } = await api.get(`/leaderboard/user/${userId}`)
        if (!cancelled) setData(d)
      } catch (err) {
        console.error('Fetch user detail error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchDetail()
    return () => { cancelled = true }
  }, [userId])

  if (loading) return <div className={`mx-4 mt-1 p-4 rounded-b-lg border border-t-0 ${dark ? 'bg-[#0A0F1A] border-[rgba(255,255,255,0.1)]' : 'bg-[rgba(216,221,223,0.45)]/40 border-[rgba(180,190,200,0.3)]/30'}`}><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D0A242] mx-auto" /></div>
  if (!data) return null

  const { raceDetails = [], bestOfTotal } = data
  const SERIES_ORDER = ['T100', 'Ironman Pro Series', 'Ironman 70.3 Pro Series', 'WTCS', 'Other']
  const OTHER_SERIES_LIST = ['Ironman', 'Ironman 70.3', 'Challenge']
  const grouped = {}
  for (const rd of raceDetails) {
    const cat = OTHER_SERIES_LIST.includes(rd.series) ? 'Other' : rd.series
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(rd)
  }
  const sortedSeriesKeys = SERIES_ORDER.filter(k => grouped[k])

  const togglePick = slug => {
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
              {grouped[series].filter(r => r.qualifying).length} counting
            </span>
          </div>
          {grouped[series].filter(r => r.qualifying).map(rd => {
            const primaryRaceId = (rd.subPicks || []).find(sp => sp.gender === 'M')?.raceId || rd.subPicks?.[0]?.raceId
            return (
            <div key={rd.eventSlug} className="mb-1">
              <button onClick={() => togglePick(rd.eventSlug)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${dark ? 'bg-[#0E1421] border-[rgba(255,255,255,0.12)] hover:border-[#15A780]/30' : 'bg-[rgba(216,221,223,0.45)] border-[rgba(180,190,200,0.3)] hover:border-[#D0A242]/20'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    {primaryRaceId ? (
                      <Link to={`/races/${primaryRaceId}`} onClick={e => e.stopPropagation()} className="font-medium text-sm hover:text-[#D0A242] transition-colors">{rd.eventName}</Link>
                    ) : (
                      <p className="font-medium text-sm">{rd.eventName}</p>
                    )}
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{rd.location}{rd.date ? `   ${new Date(rd.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${dark ? 'text-white' : 'text-[#D0A242]'}`}>{rd.fantasyScoreTotal}</span>
                    <svg className={`w-4 h-4 text-[#9CA3AF] transition-transform ${expandedPicks.has(rd.eventSlug) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </button>
              {expandedPicks.has(rd.eventSlug) && rd.subPicks && (
                <div className={`mx-2 mt-1 p-3 rounded-b-lg border border-t-0 mb-2 ${dark ? 'bg-[#0A0F1A] border-[rgba(255,255,255,0.1)]' : 'bg-[rgba(216,221,223,0.45)]/40 border-[rgba(180,190,200,0.3)]/30'}`}>
                  {rd.subPicks.map((sp, j) => {
                    const athletePicks = sp.fantasyBreakdown?.athletePicks || []
                    const fastest = sp.fantasyBreakdown?.fastest || {}
                    return (
                      <div key={j} className="mb-4 last:mb-0">
                        <h4 className="text-sm font-semibold text-[#9CA3AF] mb-2 flex items-center gap-2">
                          <span className={sp.gender === 'M' ? 'text-[#22D3EE]' : 'text-[#E11D48]'}>{sp.gender === 'M' ? "Men's" : "Women's"}</span>
                          <span className="text-[#9CA3AF]">·</span>
                          <span className={dark ? 'text-white' : 'text-[#D0A242]'}>{sp.fantasyScoreTotal} pts</span>
                        </h4>
                        <div className="space-y-1.5 mb-2">
                          {athletePicks.map((ap, k) => {
                            const athleteKey = `${rd.eventSlug}-${sp.gender}-${k}`
                            const isExpanded = expandedAthletes.has(athleteKey)
                            const bd = ap.athleteBreakdown || {}
                            return (
                            <div key={k}>
                              <div
                                onClick={() => toggleAthlete(athleteKey)}
                                className={`flex items-center justify-between text-sm p-2 rounded cursor-pointer transition-colors ${dark ? 'bg-[#0E1421] hover:bg-[#131A2B]' : 'bg-[rgba(245,243,238,0.6)] hover:bg-[#F0EDE8]'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-[#9CA3AF] w-5">#{k + 1}</span>
                                  <span className="font-medium">{ap.athleteName}</span>
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
                                    <div className={`border-l-2 rounded-lg p-3 text-center ${dark ? 'bg-[rgba(21,167,128,0.15)] border-[#15A780]' : 'bg-[rgba(245,243,238,0.35)] border-[#22D3EE]'}`}>
                                      <p className={`text-xs mb-1 ${dark ? 'text-[#15A780]' : 'text-[#D0A242]'}`}>Total</p>
                                      <p className={`text-lg font-bold ${dark ? 'text-[#15A780]' : 'text-[#D0A242]'}`}>{bd.totalScore || ap.points || 0}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )})}
                        </div>
                        {(fastest.swimPick || fastest.bikePick || fastest.runPick || fastest.swim > 0 || fastest.bike > 0 || fastest.run > 0) && (
                          <div className="mb-2">
                            <div className="space-y-1">
                              <div className={`flex items-center justify-between p-1.5 rounded border-l-2 border-[#22D3EE] ${dark ? 'bg-[#0B101C]' : 'bg-[rgba(245,243,238,0.35)]'}`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-[#22D3EE] w-10">Swim</span>
                                  {fastest.swimPick?.athlete ? (
                                    <Link to={`/leaderboard?tab=athletes&expand=${fastest.swimPick.athlete}`} onClick={e => e.stopPropagation()} className="text-xs font-medium hover:text-[#D0A242] transition-colors">{fastest.swimPick.athleteName}</Link>
                                  ) : (
                                    <span className="text-xs text-[#9CA3AF]">{fastest.swimPick?.athleteName || '—'}</span>
                                  )}
                                </div>
                                <span className={`text-xs font-semibold ${(fastest.swim || 0) > 0 ? 'text-[#D0A242]' : 'text-[#9CA3AF]'}`}>{(fastest.swim || 0) > 0 ? `+${fastest.swim}` : '0'}</span>
                              </div>
                              <div className={`flex items-center justify-between p-1.5 rounded border-l-2 border-[#D0A242] ${dark ? 'bg-[#0B101C]' : 'bg-[rgba(245,243,238,0.35)]'}`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-[#D0A242] w-10">Bike</span>
                                  {fastest.bikePick?.athlete ? (
                                    <Link to={`/leaderboard?tab=athletes&expand=${fastest.bikePick.athlete}`} onClick={e => e.stopPropagation()} className="text-xs font-medium hover:text-[#D0A242] transition-colors">{fastest.bikePick.athleteName}</Link>
                                  ) : (
                                    <span className="text-xs text-[#9CA3AF]">{fastest.bikePick?.athleteName || '—'}</span>
                                  )}
                                </div>
                                <span className={`text-xs font-semibold ${(fastest.bike || 0) > 0 ? 'text-[#D0A242]' : 'text-[#9CA3AF]'}`}>{(fastest.bike || 0) > 0 ? `+${fastest.bike}` : '0'}</span>
                              </div>
                              <div className={`flex items-center justify-between p-1.5 rounded border-l-2 border-[#BE123C] ${dark ? 'bg-[#0B101C]' : 'bg-[rgba(245,243,238,0.35)]'}`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-[#E11D48] w-10">Run</span>
                                  {fastest.runPick?.athlete ? (
                                    <Link to={`/leaderboard?tab=athletes&expand=${fastest.runPick.athlete}`} onClick={e => e.stopPropagation()} className="text-xs font-medium hover:text-[#D0A242] transition-colors">{fastest.runPick.athleteName}</Link>
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
                    <span className={`font-bold ${dark ? 'text-white' : 'text-[#D0A242]'}`}>{rd.fantasyScoreTotal}</span>
                    {rd.isSingleGender && <span className="text-xs text-[#E11D48] ml-2">(×2 applied)</span>}
                  </div>
                </div>
              )}
            </div>
          )})}
          {grouped[series].filter(r => !r.qualifying).length > 0 && (
            <div className="mt-1 opacity-40">
              {grouped[series].filter(r => !r.qualifying).map(rd => (
                <div key={rd.eventSlug} className="mb-1">
                  <button onClick={() => togglePick(rd.eventSlug)}
                    className={`w-full flex items-center justify-between text-left text-sm px-3 py-1.5 rounded transition-colors ${dark ? 'bg-[#0A0F1A] hover:bg-[#0E1421]' : 'bg-[rgba(216,221,223,0.45)]/30 hover:bg-[rgba(245,243,238,0.6)]'}`}>
                    <span className="text-[#9CA3AF] line-through">{rd.eventName}</span>
                    <span className="text-[#9CA3AF]">{rd.fantasyScoreTotal} pts</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {raceDetails.length === 0 && <p className="text-sm text-[#9CA3AF]">No scored events yet.</p>}
    </div>
  )
}

export default function LeagueDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [league, setLeague] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [scoringStructure, setScoringStructure] = useState({})
  const [availableSeasons, setAvailableSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(2026)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(searchParams.get('settings') === '1')
  const [copied, setCopied] = useState(false)
  const [expandedUsers, setExpandedUsers] = useState(new Set())

  const isAdmin = user && league && (league.admin === user._id || league.admin?._id === user._id)
  const isMember = user && league && (league.members || []).some(m => m._id === user?._id || m === user?._id)

  const toggleUser = userId => {
    setExpandedUsers(prev => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  useEffect(() => {
    async function fetchLeague() {
      try {
        const [leagueRes, standingsRes] = await Promise.allSettled([
          api.get(`/leagues/${id}`),
          api.get(`/leagues/${id}/standings?season=${selectedSeason}`)
        ])
        if (leagueRes.status === 'fulfilled') {
          setLeague(leagueRes.value.data)
        }
        if (standingsRes.status === 'fulfilled') {
          const data = standingsRes.value.data
          setLeaderboard(data.leaderboard || [])
          setScoringStructure(data.scoringStructure || {})
          setAvailableSeasons(data.availableSeasons || [2026])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchLeague()
  }, [id, selectedSeason])

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [blurbOpen, setBlurbOpen] = useState(false)

  function handleCopyInvite() {
    const link = `${window.location.origin}/leagues/${id}`
    const code = league?.inviteCode || ''
    navigator.clipboard.writeText(code ? `Join my league! Code: ${code} — or use this link: ${link}` : link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSettingsSave(updatedLeague) {
    setLeague(updatedLeague)
    setShowSettings(false)
  }

  async function handleJoinLeague() {
    if (!user) { navigate('/login'); return }
    try {
      await api.post(`/leagues/${id}/join`, { userId: user._id })
      window.location.reload()
    } catch (err) {
      console.error('Join failed:', err)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D0A242]"></div></div>

  const totalRaces = Object.values(scoringStructure).reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageMeta title={league?.name || 'League'} description={`${league?.name || 'League'} standings and details`} />
      <button onClick={() => navigate(-1)} className="text-sm text-[#D0A242] hover:text-[#C4963A] mb-4 inline-block">&larr; Back</button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1">{league?.name || 'League'}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#9CA3AF]">{league?.members?.length || leaderboard.length} members</span>
            {league?.isPrivate ? (
              <span className="text-xs px-2 py-0.5 rounded bg-[rgba(251,113,133,0.1)] text-[#E11D48] border border-[#BE123C]/20">Private</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded bg-[rgba(16,185,129,0.1)] text-[#059669] border border-[#10B981]/20">Public</span>
            )}
            {isAdmin && (
              <span className="text-xs px-2 py-0.5 rounded bg-[rgba(245,158,11,0.12)] text-[#B45309] border border-[#D97706]/20 font-medium">Admin</span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {!isMember && user && (
            <button
              onClick={handleJoinLeague}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#D0A242] hover:bg-[#D0A242] text-[#1F2937] text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              Join League
            </button>
          )}
          {isMember && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[rgba(208,162,66,0.08)] hover:bg-[#D0A242]/30 text-[#D0A242] text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              Invite
            </button>
          )}
          {showInviteModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowInviteModal(false)}>
              <div className="modal-panel p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-[#D0A242] mb-4">Invite to {league?.name}</h3>
                {league?.inviteCode && (
                  <div className="mb-4">
                    <label className="text-sm text-[#9CA3AF] mb-1 block">Invite Code</label>
                    <div className="flex items-center gap-2 bg-[#ECF2F5]/60 rounded-lg p-3">
                      <span className="text-xl font-mono font-bold text-[#D0A242] tracking-widest flex-1">{league.inviteCode}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(league.inviteCode); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                        className="text-[#9CA3AF] hover:text-[#1F2937] transition-colors px-2 py-1 rounded bg-[#E8E3DA] text-xs"
                      >
                        {copied ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>
                  </div>
                )}
                <div className="mb-4">
                  <label className="text-sm text-[#9CA3AF] mb-1 block">Invite Link</label>
                  <div className="flex items-center gap-2 bg-[#ECF2F5]/60 rounded-lg p-3">
                    <span className="text-sm text-[#D0A242] truncate flex-1">{window.location.origin}/leagues/{id}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/leagues/${id}`); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                      className="text-[#9CA3AF] hover:text-[#1F2937] transition-colors px-2 py-1 rounded bg-[#E8E3DA] text-xs"
                    >
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleCopyInvite}
                  className="btn-primary w-full text-sm"
                >
                  {copied ? 'Copied to Clipboard!' : 'Copy Code + Link'}
                </button>
                <button onClick={() => setShowInviteModal(false)} className="w-full text-center text-sm text-[#9CA3AF] hover:text-[#6B7280] mt-3">Close</button>
              </div>
            </div>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#E8E3DA] hover:bg-[#E8E3DA] text-[#6B7280] text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Settings
            </button>
          )}
        </div>
      </div>

      {/* Scoring Blurb — Collapsible */}
      {Object.keys(scoringStructure).length > 0 && (() => {
        const entries = Object.entries(scoringStructure).filter(([, c]) => c > 0)
        const totalRaces = entries.reduce((a, [, c]) => a + c, 0)
        const parts = entries.map(([series, count]) => `${count} best ${SERIES_SHORT[series] || series} score${count > 1 ? 's' : ''}`)
        return (
          <div className={`border rounded-lg mb-6 ${dark ? 'bg-[#0E1421] border-[rgba(255,255,255,0.12)]' : 'bg-[rgba(216,221,223,0.45)] border-[rgba(180,190,200,0.3)]'}`}>
            <button onClick={() => setBlurbOpen(!blurbOpen)} className="w-full flex items-center gap-3 p-4 text-left">
              <svg className="w-5 h-5 text-[#D0A242] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-[#6B7280] flex-1">
                League standings are based on your <span className="text-[#D0A242] font-semibold">{totalRaces} best race scores</span>
              </span>
              <svg className={`w-4 h-4 text-[#9CA3AF] transition-transform ${blurbOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {blurbOpen && (
              <div className="px-4 pb-4 pt-0 ml-8 text-sm text-[#6B7280] leading-relaxed">
                <p>
                  Your {parts.slice(0, -1).join(', ')}{parts.length > 1 ? ', and ' : ''}{parts[parts.length - 1]}.
                  {' '}Your highest scores from each category will be counted — others are still visible but greyed out.
                  League admins can adjust this structure in settings.
                </p>
                <p className="mt-2">
                  <span className="font-medium">Other</span> includes Ironman non-pro series, Ironman 70.3 non-pro series, and Challenge series races.
                </p>
              </div>
            )}
          </div>
        )
      })()}

      {/* Season Selector */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">Standings</h2>
        <div className={`flex items-center gap-1 rounded-lg p-0.5 ${dark ? 'bg-[#0E1421]' : 'bg-[rgba(216,221,223,0.45)]'}`}>
          {(() => {
            const currentYear = new Date().getFullYear()
            const currentYearSeason = availableSeasons.find(s => s === currentYear)
            const olderSeasons = availableSeasons.filter(s => s !== currentYear)
            return (
              <>
                {currentYearSeason && (
                  <button
                    onClick={() => setSelectedSeason(currentYearSeason)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${selectedSeason === currentYearSeason ? 'bg-[#D0A242] text-[#1F2937]' : 'text-[#9CA3AF] hover:text-[#1F2937]'}`}
                  >
                    {currentYearSeason}
                  </button>
                )}
                {olderSeasons.length > 0 && (
                  <select
                    value={olderSeasons.includes(selectedSeason) ? selectedSeason : ''}
                    onChange={e => { if (e.target.value) setSelectedSeason(Number(e.target.value)) }}
                    className={`px-2 py-1 text-sm rounded-md transition-colors bg-transparent border-none outline-none cursor-pointer ${
                      olderSeasons.includes(selectedSeason) ? 'text-[#1F2937] bg-[#D0A242]' : 'text-[#9CA3AF] hover:text-[#1F2937]'
                    }`}
                    style={olderSeasons.includes(selectedSeason) ? { background: '#D0A242' } : {}}
                  >
                    <option value="" disabled className="bg-[rgba(216,221,223,0.45)] text-[#9CA3AF]">Past Seasons</option>
                    {olderSeasons.map(season => (
                      <option key={season} value={season} className="bg-[rgba(216,221,223,0.45)] text-[#1F2937]">{season}</option>
                    ))}
                  </select>
                )}
              </>
            )
          })()}
          <button
            onClick={() => setSelectedSeason('all')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${selectedSeason === 'all' ? 'bg-[#D0A242] text-[#1F2937]' : 'text-[#9CA3AF] hover:text-[#1F2937]'}`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Standings — same layout as global leaderboard */}
      {leaderboard.length === 0 ? (
        <div className="card"><p className="text-[#9CA3AF]">No standings yet. Members need to make picks first.</p></div>
      ) : (
        <div>
          <ExpandCollapseButtons
            allIds={leaderboard.map(e => e.userId)}
            expandedSet={expandedUsers}
            onExpandAll={() => setExpandedUsers(new Set(leaderboard.map(e => e.userId)))}
            onCollapseAll={() => setExpandedUsers(new Set())}
          />
          <div className="space-y-2">
            {leaderboard.map((entry, i) => {
              const isYou = user && entry.userId === user._id
              const isExpanded = expandedUsers.has(entry.userId)
              return (
                <div key={entry.userId || i}>
                  <button
                    onClick={() => toggleUser(entry.userId)}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-left transition-colors ${
                      isYou ? (dark ? 'bg-[rgba(21,167,128,0.1)] hover:bg-[rgba(21,167,128,0.15)] border-l-2 border-[#15A780]/30' : 'bg-[rgba(208,162,66,0.06)] hover:bg-[rgba(245,243,238,0.35)] border-l-2 border-white/30') : (dark ? 'bg-[#0E1421] hover:bg-[#131A2B] border border-[rgba(255,255,255,0.12)]' : 'bg-[rgba(216,221,223,0.45)] hover:bg-[#E8E3DA]/60 border border-[rgba(180,190,200,0.3)]/30')
                    }`}
                  >
                    <span className={`w-8 text-center font-bold ${dark ? 'text-white' : i < 3 ? 'text-[#1F2937]' : 'text-[#9CA3AF]'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{entry.name}</span>
                        {isYou && <span className="text-xs text-[#D0A242]">(You)</span>}
                      </div>
                      {entry.recentRace && (
                        <div className="text-sm text-[#9CA3AF] mt-0.5">
                          Latest: {entry.recentRace.eventName || entry.recentRace.raceName}; {entry.recentRace.points} pts
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`font-semibold text-lg ${dark ? 'text-white' : 'text-[#1F2937]'}`}>{entry.totalPoints}</div>
                      <div className="text-xs text-[#9CA3AF]">{entry.picksCount} event{entry.picksCount !== 1 ? 's' : ''}</div>
                    </div>
                    <svg className={`w-4 h-4 text-[#9CA3AF] transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isExpanded && <UserInlineBreakdown userId={entry.userId} leagueId={id} selectedSeason={selectedSeason} />}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && league && (
        <SettingsModal
          league={league}
          onClose={() => setShowSettings(false)}
          onSave={handleSettingsSave}
        />
      )}
    </div>
  )
}
