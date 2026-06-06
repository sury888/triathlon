import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../utils/api'
import PageMeta from '../components/PageMeta'

function GenderTabs({ activeGender, setActiveGender, genders }) {
  if (genders.length < 2) return null
  return (
    <div className="flex gap-2 mb-6">
      {genders.map(g => (
        <button
          key={g}
          onClick={() => setActiveGender(g)}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeGender === g
              ? 'bg-[#D0A242] text-[#FAFAFA] font-bold'
              : 'bg-[#E8E3DA] text-[#6B7280] hover:bg-[#F0EDE8]'
          }`}
        >
          {g === 'M' ? "Men's" : "Women's"}
        </button>
      ))}
    </div>
  )
}

function ScoringRulesBlurb() {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="card mb-6 py-3 px-4">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between text-left">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[#D0A242]">How Scoring Works</h2>
        </div>
        <span className="text-[#9CA3AF] text-sm">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="mt-2 text-sm text-[#9CA3AF] space-y-1.5 leading-relaxed">
          <p>
            <strong className="text-[#1F2937]">Placements (1st–5th):</strong> Pick 5 athletes per gender and predict their finishing order.
            Exact match = <span className="text-[#D0A242]">1.5x</span>, off by 1 = <span className="text-[#D0A242]">1.25x</span>,
            off by 2 = <span className="text-[#D0A242]">1.1x</span>, off by 3–5 = <span className="text-[#D0A242]">1.0x</span>,
            off by 6+ = <span className="text-[#D0A242]">0.5x</span>.
          </p>
          <p>
            <strong className="text-[#1F2937]">Underdog (required):</strong> One pick must be from the
            <span className="text-[#D0A242]"> bottom half</span> of the start list. Underdog finishes top half =
            <span className="text-[#D0A242]"> 2x</span>. Bottom quarter =
            <span className="text-[#E11D48]"> 0.5x</span>.
          </p>
          <p>
            <strong className="text-[#1F2937]">Time Bonus (0–10 pts):</strong> Athletes earn bonus points based on how close their finish time is to the winner.
            Closer to the winner = more points, scaling from <span className="text-[#D0A242]">10</span> (winner) down to <span className="text-[#D0A242]">0</span>.
          </p>
          <p>
            <strong className="text-[#1F2937]">Fastest Splits:</strong> Predict fastest swim, bike, run.
            1st = <span className="text-[#D0A242]">5 pts</span>, 2nd = <span className="text-[#C4963A]">3 pts</span>, 3rd = <span className="text-[#E11D48]">1 pt</span>.
            <span className="text-[#D0A242]"> Only counts if the athlete finishes</span> — DNF = no credit.
          </p>
          <p>
            <strong className="text-[#1F2937]">Side Bets:</strong> Bonus predictions —
            Easy = <span className="text-[#D0A242]">+1 pt</span>,
            Medium = <span className="text-[#C4963A]">+3 pts</span>,
            Hard = <span className="text-[#E11D48]">+5 pts</span>.
          </p>
        </div>
      )}
    </div>
  )
}

function formatTime(seconds) {
  if (!seconds) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

function PointsBreakdownRow({ label, value, color }) {
  if (!value) return null
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-[#9CA3AF]">{label}</span>
      <span className={color || 'text-[#1F2937]'}>{typeof value === 'number' ? (value > 0 ? `+${value}` : value) : value}</span>
    </div>
  )
}

function ResultRow({ result, isExpanded, onToggle, splitRanks }) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const bd = result.breakdown
  const sr = splitRanks || {}
  return (
    <>
      <tr
        className="border-b border-[rgba(180,190,200,0.3)] cursor-pointer hover:bg-[rgba(245,243,238,0.6)] transition-colors"
        onClick={onToggle}
      >
        <td className="py-3 pr-3">
          <span className={`text-base font-bold ${dark ? 'text-white' : result.place <= 3 ? 'text-[#D0A242]' : 'text-[#1F2937]'}`}>
            {result.place || '-'}
          </span>
        </td>
        <td className="py-3 pr-3">
          <div className="text-base font-medium">
            {result.athlete ? (
              <Link to={`/leaderboard?tab=athletes&expand=${result.athlete}`} onClick={e => e.stopPropagation()} className="hover:text-[#D0A242] transition-colors">{result.athleteName || 'Unknown'}</Link>
            ) : (
              result.athleteName || 'Unknown'
            )}
          </div>
          <div className="text-sm text-[#9CA3AF]">{formatTime(result.totalTimeSeconds)}</div>
        </td>
        <td className="py-3 pr-3 text-center hidden sm:table-cell">
          <div className="flex gap-1.5 text-sm justify-center">
            <span className="text-[#22D3EE]">{formatTime(result.swimTimeSeconds)}{sr.swim ? ` (${sr.swim})` : ''}</span>
            <span className="text-[#9CA3AF]">|</span>
            <span className="text-[#D0A242]">{formatTime(result.bikeTimeSeconds)}{sr.bike ? ` (${sr.bike})` : ''}</span>
            <span className="text-[#9CA3AF]">|</span>
            <span className="text-[#E11D48]">{formatTime(result.runTimeSeconds)}{sr.run ? ` (${sr.run})` : ''}</span>
          </div>
        </td>
        <td className={`py-3 pr-3 font-semibold text-right text-base ${dark ? 'text-white' : 'text-[#D0A242]'}`}>{result.score || 0}</td>
        <td className="py-3 text-center hidden sm:table-cell w-16">
          {result.status === 'Finished' ? (
            <span className="inline-block w-2 h-2 rounded-full bg-[#D0A242]" title="Finished" />
          ) : result.status === 'DNF' ? (
            <span className="text-xs px-2 py-0.5 rounded bg-[rgba(251,113,133,0.1)] text-[#E11D48] font-medium">DNF</span>
          ) : result.status === 'DNS' ? (
            <span className="text-xs px-2 py-0.5 rounded bg-[#E8E3DA] text-[#9CA3AF] font-medium">DNS</span>
          ) : result.status === 'LAP' || result.status === 'Lapped' ? (
            <span className="text-xs px-2 py-0.5 rounded bg-[rgba(208,162,66,0.08)] text-[#D0A242] font-medium">LAP</span>
          ) : (
            <span className="inline-block w-2 h-2 rounded-full bg-[#94A3B8]" title={result.status} />
          )}
        </td>
        <td className="py-2.5 pl-2 text-[#9CA3AF] text-xs">
          <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </td>
      </tr>
      {isExpanded && bd && (
        <tr className="border-b border-[rgba(180,190,200,0.3)]/30">
          <td colSpan={6} className="py-3 px-4">
            <div className="bg-[rgba(216,221,223,0.45)] rounded-lg p-3">
              {/* Splits — visible only on mobile where the Splits column is hidden */}
              <div className="sm:hidden mb-3">
                <p className="text-sm font-semibold text-[#6B7280] mb-1.5">Splits</p>
                <div className="flex gap-4 text-sm justify-around">
                  <div className="text-center">
                    <div className="text-[#22D3EE] font-medium">{formatTime(result.swimTimeSeconds)}</div>
                    <div className="text-xs text-[#9CA3AF]">Swim{sr.swim ? ` (${sr.swim})` : ''}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#D0A242] font-medium">{formatTime(result.bikeTimeSeconds)}</div>
                    <div className="text-xs text-[#9CA3AF]">Bike{sr.bike ? ` (${sr.bike})` : ''}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#E11D48] font-medium">{formatTime(result.runTimeSeconds)}</div>
                    <div className="text-xs text-[#9CA3AF]">Run{sr.run ? ` (${sr.run})` : ''}</div>
                  </div>
                </div>
              </div>
              <p className="text-sm font-semibold text-[#6B7280] mb-2">Points Breakdown</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-base">
                <div className="bg-[rgba(245,243,238,0.6)] rounded-lg p-2 text-center">
                  <div className="text-xs text-[#9CA3AF] mb-1">Placement</div>
                  <div className="text-lg font-bold text-[#1F2937]">{Math.round((bd.placementPoints || 0) * 0.8)}</div>
                  <div className="text-xs text-[#9CA3AF] mt-0.5">{bd.placementPoints || 0} × 0.8</div>
                </div>
                <div className="bg-[rgba(245,243,238,0.6)] rounded-lg p-2 text-center">
                  <div className="text-xs text-[#9CA3AF] mb-1">Time Bonus</div>
                  <div className="text-lg font-bold text-[#1F2937]">{Math.round((bd.timeBonus || 0) * 0.2)}</div>
                  <div className="text-xs text-[#9CA3AF] mt-0.5">{bd.timeBonus || 0} × 0.2</div>
                </div>
                <div className="bg-[rgba(245,243,238,0.6)] rounded-lg p-2 text-center">
                  <div className="text-xs text-[#9CA3AF] mb-1">Split Bonus</div>
                  <div className="text-lg font-bold text-[#1F2937]">{bd.splitBonus || 0}</div>
                  <div className="text-xs text-[#9CA3AF] mt-0.5">
                    Swim: {bd.splitBreakdown?.swim || 0} Bike: {bd.splitBreakdown?.bike || 0} Run: {bd.splitBreakdown?.run || 0}
                  </div>
                </div>
                <div className="bg-[rgba(245,243,238,0.6)] rounded-lg p-2 text-center">
                  <div className="text-xs text-[#9CA3AF] mb-1">Underdog Bonus</div>
                  <div className="text-lg font-bold text-[#1F2937]">{bd.underdogBonus || 0}</div>
                  <div className="text-xs text-[#9CA3AF] mt-0.5">{bd.underdogBonus > 0 ? `Outperformed seed by ${bd.gain || '?'} spots` : 'No seed upset'}</div>
                </div>
                <div className="bg-[rgba(245,243,238,0.6)] rounded-lg p-2 text-center">
                  <div className="text-xs text-[#9CA3AF] mb-1">Course Record</div>
                  <div className="text-lg font-bold text-[#1F2937]">{bd.recordBonus || 0}</div>
                  <div className="text-xs text-[#9CA3AF] mt-0.5">{bd.recordBonus > 0 ? `Record: ${[bd.recordBonus >= 3 ? 'Overall' : null, bd.recordSwim ? 'Swim' : null, bd.recordBike ? 'Bike' : null, bd.recordRun ? 'Run' : null].filter(Boolean).join(', ') || 'Overall'}` : 'No record broken'}</div>
                </div>
                <div className="bg-[rgba(208,162,66,0.08)] rounded-lg p-2 text-center border border-[#D0A242]/15">
                  <div className="text-xs text-[#D0A242] mb-1">Total</div>
                  <div className="text-lg font-bold text-[#D0A242]">{bd.totalScore || 0}</div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function UserPicksScored({ picks, raceId }) {
  const [expanded, setExpanded] = useState(true)
  const [expandedAthletes, setExpandedAthletes] = useState(new Set())
  const pick = picks.find(p => (p.race?._id || p.race) === raceId)
  if (!pick || !pick.fantasyBreakdown) return null

  const fb = pick.fantasyBreakdown
  const athletePicks = fb.athletePicks || []
  const fastest = fb.fastest || {}
  const fastestTotal = (fastest.swim || 0) + (fastest.bike || 0) + (fastest.run || 0)

  const toggleAthlete = (idx) => {
    setExpandedAthletes(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <div className="card mb-8">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          Your Picks
          <span className="text-[#D0A242] text-lg">{pick.fantasyScoreTotal} pts</span>
        </h2>
        <svg className={`w-5 h-5 text-[#9CA3AF] transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {athletePicks.length > 0 && (
            <div>
              <p className="text-sm font-medium text-[#6B7280] mb-2">Placement Picks</p>
              <div className="space-y-1.5">
                {athletePicks.map((ap, i) => {
                  const diff = ap.actualPlace ? Math.abs(ap.actualPlace - ap.predictedPlace) : null
                  const accuracy = diff === 0 ? 'Exact!' : diff === 1 ? '1 off' : diff === 2 ? '2 off' : diff !== null ? `${diff} off` : 'DNF'
                  const accColor = diff === 0 ? 'text-[#D0A242]' : diff === 1 ? 'text-[#C4963A]' : diff === 2 ? 'text-[#E11D48]' : 'text-[#E11D48]'
                  const bd = ap.athleteBreakdown
                  const isAthleteExpanded = expandedAthletes.has(i)
                  return (
                    <div key={i}>
                      <div
                        className="flex items-center justify-between p-2 bg-[rgba(245,243,238,0.6)] rounded-lg text-sm cursor-pointer hover:bg-[#F0EDE8] transition-colors"
                        onClick={() => toggleAthlete(i)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[#9CA3AF] font-mono w-6 text-center">#{ap.predictedPlace}</span>
                          {ap.athlete ? (
                            <Link to={`/leaderboard?tab=athletes&expand=${ap.athlete}`} onClick={e => e.stopPropagation()} className="font-medium hover:text-[#D0A242] transition-colors">{ap.athleteName}</Link>
                          ) : (
                            <span className="font-medium">{ap.athleteName}</span>
                          )}
                          {ap.isUnderdog && <span className="text-xs px-1.5 py-0.5 rounded bg-[rgba(208,162,66,0.08)] text-[#C4963A] border border-[#D0A242]/20">UD</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs ${accColor}`}>
                            {ap.actualPlace ? `Finished ${ap.actualPlace}${ordSuffix(ap.actualPlace)}` : 'DNF'} ({accuracy})
                          </span>
                          <span className="text-[#D0A242] font-semibold">{ap.points} pts</span>
                          <svg className={`w-3.5 h-3.5 text-[#9CA3AF] transition-transform ${isAthleteExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {isAthleteExpanded && bd && (
                        <div className="ml-9 mr-2 mt-1 mb-1 bg-[rgba(216,221,223,0.45)] rounded-lg p-3">
                          <p className="text-xs font-semibold text-[#9CA3AF] mb-2">Points Breakdown</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                            <div className="bg-[rgba(245,243,238,0.6)] rounded-lg p-2 text-center">
                              <div className="text-xs text-[#9CA3AF] mb-1">Placement</div>
                              <div className="text-lg font-bold text-[#1F2937]">{Math.round((bd.placementPoints || 0) * 0.8)}</div>
                              <div className="text-xs text-[#9CA3AF] mt-0.5">{bd.placementPoints || 0} × 0.8</div>
                            </div>
                            <div className="bg-[rgba(245,243,238,0.6)] rounded-lg p-2 text-center">
                              <div className="text-xs text-[#9CA3AF] mb-1">Time Bonus</div>
                              <div className="text-lg font-bold text-[#1F2937]">{Math.round((bd.timeBonus || 0) * 0.2)}</div>
                              <div className="text-xs text-[#9CA3AF] mt-0.5">{bd.timeBonus || 0} × 0.2</div>
                            </div>
                            <div className="bg-[rgba(245,243,238,0.6)] rounded-lg p-2 text-center">
                              <div className="text-xs text-[#9CA3AF] mb-1">Split Bonus</div>
                              <div className="text-lg font-bold text-[#1F2937]">{bd.splitBonus || 0}</div>
                              <div className="text-xs text-[#9CA3AF] mt-0.5">
                                Swim: {bd.splitBreakdown?.swim || 0} Bike: {bd.splitBreakdown?.bike || 0} Run: {bd.splitBreakdown?.run || 0}
                              </div>
                            </div>
                            <div className="bg-[rgba(245,243,238,0.6)] rounded-lg p-2 text-center">
                              <div className="text-xs text-[#9CA3AF] mb-1">Underdog Bonus</div>
                              <div className="text-lg font-bold text-[#1F2937]">{bd.underdogBonus || 0}</div>
                              <div className="text-xs text-[#9CA3AF] mt-0.5">{bd.underdogBonus > 0 ? `Outperformed seed by ${bd.gain || '?'} spots` : 'No seed upset'}</div>
                            </div>
                            <div className="bg-[rgba(245,243,238,0.6)] rounded-lg p-2 text-center">
                              <div className="text-xs text-[#9CA3AF] mb-1">Course Record</div>
                              <div className="text-lg font-bold text-[#1F2937]">{bd.recordBonus || 0}</div>
                              <div className="text-xs text-[#9CA3AF] mt-0.5">{bd.recordBonus > 0 ? `Record: ${[bd.recordBonus >= 3 ? 'Overall' : null, bd.recordSwim ? 'Swim' : null, bd.recordBike ? 'Bike' : null, bd.recordRun ? 'Run' : null].filter(Boolean).join(', ') || 'Overall'}` : 'No record broken'}</div>
                            </div>
                            <div className="bg-[rgba(208,162,66,0.08)] rounded-lg p-2 text-center border border-[#D0A242]/15">
                              <div className="text-xs text-[#D0A242] mb-1">Athlete Score</div>
                              <div className="text-lg font-bold text-[#D0A242]">{bd.totalScore || 0}</div>
                            </div>
                          </div>
                          {diff !== null && (
                            <div className="mt-2 flex items-center justify-between text-xs bg-[#E8E3DA]/20 rounded-lg p-2">
                              <span className="text-[#9CA3AF]">Multiplier ({accuracy})</span>
                              <span className="text-[#1F2937] font-semibold">×{diff === 0 ? '1.5' : diff === 1 ? '1.25' : diff === 2 ? '1.1' : diff <= 5 ? '1.0' : '0.5'}</span>
                            </div>
                          )}
                          <div className="mt-1 flex items-center justify-between text-sm font-bold bg-[rgba(208,162,66,0.08)] rounded-lg p-2 border border-[#D0A242]/15">
                            <span className="text-[#D0A242]">Pick Points</span>
                            <span className="text-[#D0A242]">{ap.points}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {(fastest.swimPick || fastest.bikePick || fastest.runPick || fastestTotal > 0) && (
            <div>
              <p className="text-sm font-medium text-[#6B7280] mb-2">Fastest Split Picks</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(245,243,238,0.35)]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#9CA3AF] w-10">Swim:</span>
                    {fastest.swimPick?.athlete ? (
                      <Link to={`/leaderboard?tab=athletes&expand=${fastest.swimPick.athlete}`} className="text-sm font-medium hover:text-[#D0A242] transition-colors">{fastest.swimPick.athleteName}</Link>
                    ) : (
                      <span className="text-sm text-[#9CA3AF]">{fastest.swimPick?.athleteName || '—'}</span>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${(fastest.swim || 0) > 0 ? 'text-[#D0A242]' : 'text-[#9CA3AF]'}`}>{(fastest.swim || 0) > 0 ? `+${fastest.swim} pts` : '+0'}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(245,243,238,0.35)]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#9CA3AF] w-10">Bike:</span>
                    {fastest.bikePick?.athlete ? (
                      <Link to={`/leaderboard?tab=athletes&expand=${fastest.bikePick.athlete}`} className="text-sm font-medium hover:text-[#D0A242] transition-colors">{fastest.bikePick.athleteName}</Link>
                    ) : (
                      <span className="text-sm text-[#9CA3AF]">{fastest.bikePick?.athleteName || '—'}</span>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${(fastest.bike || 0) > 0 ? 'text-[#D0A242]' : 'text-[#9CA3AF]'}`}>{(fastest.bike || 0) > 0 ? `+${fastest.bike} pts` : '+0'}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(245,243,238,0.35)]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#9CA3AF] w-10">Run:</span>
                    {fastest.runPick?.athlete ? (
                      <Link to={`/leaderboard?tab=athletes&expand=${fastest.runPick.athlete}`} className="text-sm font-medium hover:text-[#D0A242] transition-colors">{fastest.runPick.athleteName}</Link>
                    ) : (
                      <span className="text-sm text-[#9CA3AF]">{fastest.runPick?.athleteName || '—'}</span>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${(fastest.run || 0) > 0 ? 'text-[#D0A242]' : 'text-[#9CA3AF]'}`}>{(fastest.run || 0) > 0 ? `+${fastest.run} pts` : '+0'}</span>
                </div>
              </div>
            </div>
          )}

          {fb.sideBets && (fb.sideBets.totalPoints > 0 || (fb.sideBets.bets && fb.sideBets.bets.length > 0)) && (
            <div>
              <p className="text-sm font-medium text-[#6B7280] mb-2">Side Bets <span className="text-[#D0A242]">+{fb.sideBets.totalPoints || 0} pts</span></p>
              <div className="space-y-1.5">
                {(fb.sideBets.bets || []).map((bet, bi) => (
                  <div key={bi} className="flex items-center justify-between text-sm p-2 bg-[rgba(245,243,238,0.6)] rounded-lg">
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

          <div className="border-t border-[rgba(180,190,200,0.3)] pt-3 flex justify-between items-center">
            <span className="text-sm text-[#9CA3AF]">Total Fantasy Score</span>
            <span className="text-xl font-bold text-[#D0A242]">{pick.fantasyScoreTotal} pts</span>
          </div>
        </div>
      )}
    </div>
  )
}

function RaceLeaderboard({ raceId, userId }) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [leaderboard, setLeaderboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedUsers, setExpandedUsers] = useState(new Set())
  const [expandedLbAthletes, setExpandedLbAthletes] = useState(new Set())
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  useEffect(() => {
    async function fetch() {
      try {
        const { data } = await api.get(`/leaderboard/race/${raceId}`)
        setLeaderboard(data)
      } catch (err) {
        console.error('Leaderboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [raceId])

  if (loading) return <div className="card mb-8"><div className="animate-pulse h-32 bg-[rgba(245,243,238,0.6)] rounded"></div></div>
  if (!leaderboard || leaderboard.leaderboard.length === 0) return null

  const all = leaderboard.leaderboard
  const userEntry = userId ? all.find(u => u.userId === userId) : null
  const totalPages = Math.ceil(all.length / PER_PAGE)
  const paged = all.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const toggleUser = (uid) => {
    setExpandedUsers(prev => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  const toggleLbAthlete = (key) => {
    setExpandedLbAthletes(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Race Leaderboard</h2>
        {userEntry && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#9CA3AF]">Your Place:</span>
            <span className={`text-lg font-bold ${dark ? 'text-white' : userEntry.rank <= 3 ? 'text-[#D0A242]' : 'text-[#1F2937]'}`}>
              {userEntry.rank}{ordSuffix(userEntry.rank)}
            </span>
            <span className={`text-sm font-medium ${dark ? 'text-white' : 'text-[#D0A242]'}`}>({userEntry.totalScore} pts)</span>
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        {paged.map((entry) => {
          const isUser = userId && entry.userId === userId
          const isExpanded = expandedUsers.has(entry.userId)
          return (
            <div key={entry.userId}>
              <button
                onClick={() => toggleUser(entry.userId)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm transition-colors ${
                  isUser ? 'bg-[rgba(208,162,66,0.08)] border border-[#D0A242]/20' : 'bg-[#E8E3DA]/40 hover:bg-[#E8E3DA]/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-bold w-8 text-center ${dark ? 'text-white' : entry.rank <= 3 ? 'text-[#D0A242]' : 'text-[#9CA3AF]'}`}>
                    {entry.rank}
                  </span>
                  <span className={`font-medium ${isUser ? 'text-[#D0A242]' : 'text-[#1F2937]'}`}>
                    {entry.name} {isUser && <span className="text-xs text-[#D0A242] ml-1">(You)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${dark ? 'text-white' : 'text-[#D0A242]'}`}>{entry.totalScore} pts</span>
                  <svg className={`w-4 h-4 text-[#9CA3AF] transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {isExpanded && entry.breakdowns && (
                <div className="ml-4 mr-1 mt-1 mb-2 p-3 rounded-lg bg-[rgba(216,221,223,0.45)] border border-[rgba(180,190,200,0.3)]/30">
                  {entry.breakdowns.map((bd, bi) => {
                    const picks = bd.breakdown?.athletePicks || []
                    const fastest = bd.breakdown?.fastest || {}
                    const sideBets = bd.breakdown?.sideBets || {}
                    const fastestTotal = (fastest.swim || 0) + (fastest.bike || 0) + (fastest.run || 0)
                    return (
                      <div key={bi} className="mb-4 last:mb-0">
                        <h4 className="text-sm font-semibold text-[#9CA3AF] mb-2 flex items-center gap-2">
                          <span className={bd.gender === 'M' ? 'text-[#22D3EE]' : 'text-[#E11D48]'}>{bd.gender === 'M' ? "Men's" : "Women's"}</span>
                          <span className="text-[#9CA3AF]">·</span>
                          <span className={dark ? 'text-white' : 'text-[#D0A242]'}>{bd.score} pts</span>
                        </h4>
                        {picks.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-[#9CA3AF] mb-1.5">Placement Picks</p>
                            <div className="space-y-1.5 mb-2">
                              {picks.map((ap, k) => {
                                const diff = ap.actualPlace ? Math.abs(ap.actualPlace - ap.predictedPlace) : null
                                const accuracy = diff === 0 ? 'Exact!' : diff === 1 ? '1 off' : diff === 2 ? '2 off' : diff !== null ? `${diff} off` : 'DNF'
                                const accColor = diff === 0 ? 'text-[#D0A242]' : diff === 1 ? 'text-[#C4963A]' : diff === 2 ? 'text-[#E11D48]' : 'text-[#E11D48]'
                                const abd = ap.athleteBreakdown
                                const athleteKey = `${entry.userId}-${bi}-${k}`
                                const isAthExpanded = expandedLbAthletes.has(athleteKey)
                                return (
                                  <div key={k}>
                                    <div
                                      className="flex items-center justify-between text-sm p-2 rounded bg-[rgba(245,243,238,0.6)] cursor-pointer hover:bg-[#F0EDE8] transition-colors"
                                      onClick={() => toggleLbAthlete(athleteKey)}
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-[#9CA3AF] w-5">#{k + 1}</span>
                                        {ap.athlete ? (
                                          <Link to={`/leaderboard?tab=athletes&expand=${ap.athlete}`} onClick={e => e.stopPropagation()} className="font-medium hover:text-[#D0A242] transition-colors">{ap.athleteName}</Link>
                                        ) : (
                                          <span className="font-medium">{ap.athleteName}</span>
                                        )}
                                        {ap.isUnderdog && <span className="text-xs px-1.5 py-0.5 rounded bg-[rgba(208,162,66,0.08)] text-[#C4963A] border border-[#D0A242]/20">UD</span>}
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className={`text-xs ${accColor}`}>
                                          {ap.actualPlace ? `Finished ${ap.actualPlace}${ordSuffix(ap.actualPlace)}` : 'DNF'} ({accuracy})
                                        </span>
                                        <span className={`font-semibold ${dark ? 'text-white' : 'text-[#D0A242]'}`}>{ap.points} pts</span>
                                        <svg className={`w-3.5 h-3.5 text-[#9CA3AF] transition-transform ${isAthExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </div>
                                    </div>
                                    {isAthExpanded && abd && (
                                      <div className="ml-8 mr-1 mt-1 mb-1 bg-[rgba(216,221,223,0.45)] rounded-lg p-3">
                                        <p className="text-xs font-semibold text-[#9CA3AF] mb-2">Points Breakdown</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                                          <div className="bg-[rgba(245,243,238,0.6)] rounded-lg p-2 text-center">
                                            <div className="text-xs text-[#9CA3AF] mb-1">Placement</div>
                                            <div className="text-lg font-bold text-[#1F2937]">{Math.round((abd.placementPoints || 0) * 0.8)}</div>
                                            <div className="text-xs text-[#9CA3AF] mt-0.5">{abd.placementPoints || 0} × 0.8</div>
                                          </div>
                                          <div className="bg-[rgba(245,243,238,0.6)] rounded-lg p-2 text-center">
                                            <div className="text-xs text-[#9CA3AF] mb-1">Time Bonus</div>
                                            <div className="text-lg font-bold text-[#1F2937]">{Math.round((abd.timeBonus || 0) * 0.2)}</div>
                                            <div className="text-xs text-[#9CA3AF] mt-0.5">{abd.timeBonus || 0} × 0.2</div>
                                          </div>
                                          <div className="bg-[rgba(245,243,238,0.6)] rounded-lg p-2 text-center">
                                            <div className="text-xs text-[#9CA3AF] mb-1">Split Bonus</div>
                                            <div className="text-lg font-bold text-[#1F2937]">{abd.splitBonus || 0}</div>
                                            <div className="text-xs text-[#9CA3AF] mt-0.5">
                                              Swim: {abd.splitBreakdown?.swim || 0} Bike: {abd.splitBreakdown?.bike || 0} Run: {abd.splitBreakdown?.run || 0}
                                            </div>
                                          </div>
                                          <div className="bg-[rgba(245,243,238,0.6)] rounded-lg p-2 text-center">
                                            <div className="text-xs text-[#9CA3AF] mb-1">Underdog Bonus</div>
                                            <div className="text-lg font-bold text-[#1F2937]">{abd.underdogBonus || 0}</div>
                                            <div className="text-xs text-[#9CA3AF] mt-0.5">{abd.underdogBonus > 0 ? `Outperformed seed by ${abd.gain || '?'} spots` : 'No seed upset'}</div>
                                          </div>
                                          <div className="bg-[rgba(245,243,238,0.6)] rounded-lg p-2 text-center">
                                            <div className="text-xs text-[#9CA3AF] mb-1">Course Record</div>
                                            <div className="text-lg font-bold text-[#1F2937]">{abd.recordBonus || 0}</div>
                                            <div className="text-xs text-[#9CA3AF] mt-0.5">{abd.recordBonus > 0 ? `Record: ${[bd.recordBonus >= 3 ? 'Overall' : null, bd.recordSwim ? 'Swim' : null, bd.recordBike ? 'Bike' : null, bd.recordRun ? 'Run' : null].filter(Boolean).join(', ') || 'Overall'}` : 'No record broken'}</div>
                                          </div>
                                          <div className="bg-[rgba(208,162,66,0.08)] rounded-lg p-2 text-center border border-[#D0A242]/15">
                                            <div className="text-xs text-[#D0A242] mb-1">Athlete Score</div>
                                            <div className="text-lg font-bold text-[#D0A242]">{abd.totalScore || 0}</div>
                                          </div>
                                        </div>
                                        {diff !== null && (
                                          <div className="mt-2 flex items-center justify-between text-xs bg-[#E8E3DA]/20 rounded-lg p-2">
                                            <span className="text-[#9CA3AF]">Multiplier ({accuracy})</span>
                                            <span className="text-[#1F2937] font-semibold">×{diff === 0 ? '1.5' : diff === 1 ? '1.25' : diff === 2 ? '1.1' : diff <= 5 ? '1.0' : '0.5'}</span>
                                          </div>
                                        )}
                                        <div className="mt-1 flex items-center justify-between text-sm font-bold bg-[rgba(208,162,66,0.08)] rounded-lg p-2 border border-[#D0A242]/15">
                                          <span className="text-[#D0A242]">Pick Points</span>
                                          <span className="text-[#D0A242]">{ap.points}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        {(fastest.swimPick || fastest.bikePick || fastest.runPick || fastestTotal > 0) && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-[#9CA3AF] mb-1.5">Fastest Split Picks</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between p-1.5 rounded bg-[rgba(245,243,238,0.35)] border-l-2 border-[#22D3EE]">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-[#22D3EE] w-8">Swim:</span>
                                  {fastest.swimPick?.athlete ? (
                                    <Link to={`/leaderboard?tab=athletes&expand=${fastest.swimPick.athlete}`} onClick={e => e.stopPropagation()} className="text-xs font-medium hover:text-[#D0A242] transition-colors">{fastest.swimPick.athleteName}</Link>
                                  ) : (
                                    <span className="text-xs text-[#9CA3AF]">{fastest.swimPick?.athleteName || '—'}</span>
                                  )}
                                </div>
                                <span className={`text-xs font-semibold ${(fastest.swim || 0) > 0 ? 'text-[#D0A242]' : 'text-[#9CA3AF]'}`}>{(fastest.swim || 0) > 0 ? `+${fastest.swim}` : '+0'}</span>
                              </div>
                              <div className="flex items-center justify-between p-1.5 rounded bg-[rgba(245,243,238,0.35)] border-l-2 border-[#D0A242]">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-[#D0A242] w-8">Bike:</span>
                                  {fastest.bikePick?.athlete ? (
                                    <Link to={`/leaderboard?tab=athletes&expand=${fastest.bikePick.athlete}`} onClick={e => e.stopPropagation()} className="text-xs font-medium hover:text-[#D0A242] transition-colors">{fastest.bikePick.athleteName}</Link>
                                  ) : (
                                    <span className="text-xs text-[#9CA3AF]">{fastest.bikePick?.athleteName || '—'}</span>
                                  )}
                                </div>
                                <span className={`text-xs font-semibold ${(fastest.bike || 0) > 0 ? 'text-[#D0A242]' : 'text-[#9CA3AF]'}`}>{(fastest.bike || 0) > 0 ? `+${fastest.bike}` : '+0'}</span>
                              </div>
                              <div className="flex items-center justify-between p-1.5 rounded bg-[rgba(245,243,238,0.35)] border-l-2 border-[#BE123C]">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-[#E11D48] w-8">Run:</span>
                                  {fastest.runPick?.athlete ? (
                                    <Link to={`/leaderboard?tab=athletes&expand=${fastest.runPick.athlete}`} onClick={e => e.stopPropagation()} className="text-xs font-medium hover:text-[#D0A242] transition-colors">{fastest.runPick.athleteName}</Link>
                                  ) : (
                                    <span className="text-xs text-[#9CA3AF]">{fastest.runPick?.athleteName || '—'}</span>
                                  )}
                                </div>
                                <span className={`text-xs font-semibold ${(fastest.run || 0) > 0 ? 'text-[#D0A242]' : 'text-[#9CA3AF]'}`}>{(fastest.run || 0) > 0 ? `+${fastest.run}` : '+0'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        {sideBets && (sideBets.totalPoints > 0 || (sideBets.bets && sideBets.bets.length > 0)) && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-[#9CA3AF] mb-1.5">Side Bets <span className="text-[#D0A242]">+{sideBets.totalPoints || 0}</span></p>
                            <div className="space-y-1">
                              {(sideBets.bets || []).map((bet, sbi) => (
                                <div key={sbi} className="flex items-center justify-between text-xs p-1.5 rounded bg-[rgba(245,243,238,0.6)]">
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
                    <span className="text-[#9CA3AF]">Total: </span>
                    <span className={`font-bold ${dark ? 'text-white' : 'text-[#D0A242]'}`}>{entry.totalScore} pts</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-[rgba(180,190,200,0.3)]">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1 rounded text-sm bg-[#E8E3DA] text-[#6B7280] hover:bg-[#E8E3DA] disabled:opacity-40 disabled:cursor-not-allowed">
            Prev
          </button>
          <span className="text-sm text-[#9CA3AF]">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1 rounded text-sm bg-[#E8E3DA] text-[#6B7280] hover:bg-[#E8E3DA] disabled:opacity-40 disabled:cursor-not-allowed">
            Next
          </button>
        </div>
      )}
    </div>
  )
}

function ordSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

export default function RaceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [race, setRace] = useState(null)
  const [siblingRace, setSiblingRace] = useState(null)
  const [activeGender, setActiveGender] = useState(null)
  const [userPicks, setUserPicks] = useState([])
  const [expandedResults, setExpandedResults] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRace() {
      try {
        const requests = [api.get(`/races/${id}`)]
        if (user) requests.push(api.get(`/picks/user/${user._id}`))

        const results = await Promise.allSettled(requests)

        if (results[0].status === 'fulfilled') {
          const data = results[0].value.data
          const isOpen = data.status === 'Open' && new Date() < new Date(data.lockTime)

        const userIsCreator = user && String(user._id) === String(data.createdBy)
const userHasPicks = results[1]?.status === 'fulfilled' &&
  results[1].value.data.some(p => p.race?._id === id)

if (isOpen && !userIsCreator && !userHasPicks) {
  navigate(`/races/${id}/pick`, { replace: true })
  return
}

          setRace(data)
          setActiveGender(data.gender)

          if (data.eventSiblings && data.eventSiblings.length > 0) {
            const sibId = data.eventSiblings[0]._id
            const { data: sibData } = await api.get(`/races/${sibId}`)
            setSiblingRace(sibData)
          }
        }

        if (results[1]?.status === 'fulfilled') {
          setUserPicks(results[1].value.data)
        }
      } catch (err) {
        console.error('Fetch race error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchRace()
  }, [id, user, navigate])

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D0A242]"></div></div>
  if (!race) return <div className="max-w-4xl mx-auto px-4 py-8"><p className="text-[#9CA3AF]">Race not found</p></div>

  const genders = siblingRace
    ? [race.gender, siblingRace.gender].sort((a, b) => (a === 'M' ? -1 : 1))
    : [race.gender]

  const activeRace = siblingRace && activeGender !== race.gender ? siblingRace : race
  const isOpen = activeRace.status === 'Open' && new Date() < new Date(activeRace.lockTime)
  const hasResults = activeRace.results && activeRace.results.length > 0

  const toggleResult = (idx) => {
    setExpandedResults(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const lockDiff = activeRace.lockTime ? new Date(activeRace.lockTime) - new Date() : 0
  const lockD = Math.max(0, Math.floor(lockDiff / 86400000))
  const lockH = Math.max(0, Math.floor((lockDiff % 86400000) / 3600000))
  const lockM = Math.max(0, Math.floor((lockDiff % 3600000) / 60000))
  const lockLabel = lockDiff <= 0 ? 'Closed' : lockD > 0 ? `${lockD}d ${lockH}h` : lockH > 0 ? `${lockH}h ${lockM}m` : `${lockM}m`
  const lockUrgent = lockDiff > 0 && lockDiff < 86400000

  const resultsBlock = hasResults && (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Results</h2>
        <button
          onClick={() => {
            if (expandedResults.size > 0) setExpandedResults(new Set())
            else setExpandedResults(new Set(activeRace.results.map((_, i) => i)))
          }}
          className="text-xs text-[#D0A242] hover:text-[#C4963A]"
        >
          {expandedResults.size > 0 ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#9CA3AF] border-b border-[rgba(180,190,200,0.3)]">
              <th className="pb-2 pr-3">Place</th>
              <th className="pb-2 pr-3">Athlete</th>
              <th className="pb-2 pr-3 text-center hidden sm:table-cell">Splits</th>
              <th className="pb-2 pr-3 text-right">Score</th>
              <th className="pb-2 text-center hidden sm:table-cell w-16">Status</th>
              <th className="pb-2 pl-2 w-6"></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const sorted = [...activeRace.results].sort((a, b) => (a.place || 999) - (b.place || 999))
              const finishedSwim = sorted.filter(r => r.swimTimeSeconds && r.status === 'Finished').sort((a, b) => a.swimTimeSeconds - b.swimTimeSeconds)
              const finishedBike = sorted.filter(r => r.bikeTimeSeconds && r.status === 'Finished').sort((a, b) => a.bikeTimeSeconds - b.bikeTimeSeconds)
              const finishedRun = sorted.filter(r => r.runTimeSeconds && r.status === 'Finished').sort((a, b) => a.runTimeSeconds - b.runTimeSeconds)
              const swimRanks = Object.fromEntries(finishedSwim.map((r, i) => [r.athleteId || r.athlete || r.athleteName, i + 1]))
              const bikeRanks = Object.fromEntries(finishedBike.map((r, i) => [r.athleteId || r.athlete || r.athleteName, i + 1]))
              const runRanks = Object.fromEntries(finishedRun.map((r, i) => [r.athleteId || r.athlete || r.athleteName, i + 1]))
              return sorted.map((result, i) => {
                const key = result.athleteId || result.athlete || result.athleteName
                return (
                  <ResultRow
                    key={i}
                    result={result}
                    isExpanded={expandedResults.has(i)}
                    onToggle={() => toggleResult(i)}
                    splitRanks={{ swim: swimRanks[key], bike: bikeRanks[key], run: runRanks[key] }}
                  />
                )
              })
            })()}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className={`mx-auto px-4 sm:px-6 py-8 ${hasResults ? 'max-w-7xl' : 'max-w-5xl'}`}>
      <PageMeta title={race?.name || 'Race Details'} description={`View details for ${race?.name || 'this race'}`} />
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="text-sm text-[#D0A242] hover:text-[#C4963A] mb-2 inline-block">&larr; Back</button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{race.eventName || race.name}</h1>
              {race.isPrivate && <span className="text-xs px-2 py-0.5 rounded-full border border-[#D0A242]/20 bg-[rgba(208,162,66,0.08)] text-[#D0A242] font-medium">Private</span>}
            </div>
            <p className="text-[#9CA3AF]">
              {race.location} • {race.series || 'Private Race'}
              {hasResults && ` • ${new Date(activeRace.date || activeRace.lockTime).toLocaleDateString()}`}
              {genders.length === 1 ? ` • ${race.gender === 'M' ? 'Men' : 'Women'}` : ''}
            </p>
          </div>
          {isOpen && user && (
            <Link to={`/races/${activeRace._id}/pick`} className="btn-accent">
              Make Your Picks
            </Link>
          )}
          {isOpen && !user && (
            <Link to="/login" className="btn-secondary">
              Sign In to Pick
            </Link>
          )}
                    {race.isPrivate && user && (race.createdBy) === String(user._id) && !hasResults && (
            <div className="flex gap-2">
              <Link to={`/races/${race._id}/edit`} className="px-4 py-2 rounded-lg bg-[#E8E3DA] hover:bg-[#F0EDE8] text-[#1F2937] text-sm font-semibold transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Race
              </Link>
              <Link to={`/races/${race._id}/results/enter`} className="px-4 py-2 rounded-lg bg-[#D0A242] hover:bg-[#4CD9A5] text-[#1F2937] text-sm font-semibold transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Enter Results
              </Link>
            </div>
          )}
        </div>
      </div>

     

      {/* Invite Code — always visible to race creator for private races */}
      {race.isPrivate && activeRace.inviteCode && (

        <div className="card mb-6 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">Invite Code</p>
              <p className="text-lg font-mono font-bold text-[#D0A242] select-all">{activeRace.inviteCode}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(race.inviteCode)
                  alert('Invite code copied!')
                }}
                className="px-3 py-1.5 rounded-lg bg-[rgba(208,162,66,0.08)] border border-[#D0A242]/20 text-[#D0A242] text-sm font-medium hover:bg-[rgba(208,162,66,0.15)] transition-colors"
              >
                Copy Code
              </button>
              <button
                type="button"
                onClick={() => {
                  const link = `${window.location.origin}/races/join/${race.inviteCode}`
                  navigator.clipboard.writeText(link)
                  alert('Invite link copied!')
                }}
                className="px-3 py-1.5 rounded-lg bg-[#D0A242] text-[#1F2937] text-sm font-medium hover:bg-[#C4963A] transition-colors"
              >
                Copy Invite Link
              </button>
            </div>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-2">Share this code or link so friends can join your race.</p>
        </div>
      )}


      <GenderTabs activeGender={activeGender} setActiveGender={setActiveGender} genders={genders} />
      {race.notes && (
        <div className ="card mb-6 p-4">
          <h2 className="text-sm font-bold text-[#D0A242] mb-2"> Race Notes</h2>
          <p className="text-sm text-[#6B7280] whitespace-pre-wrap">{race.notes}</p>
        </div>
      )}


      {/* Race Info - card countdown style for non-finished races */}
      {!hasResults && (
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className={`card flex items-center justify-between p-4 ${lockUrgent ? 'border-[#BE123C]/30' : ''}`}>
            <div>
              <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">Picks Lock</p>
              <p className="text-sm text-[#6B7280]">{new Date(activeRace.lockTime).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${lockUrgent ? 'text-[#E11D48]' : lockDiff <= 0 ? 'text-[#9CA3AF]' : 'text-[#D0A242]'}`}>{lockLabel}</p>
            </div>
          </div>
          <div className="card flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">Field Size</p>
              <p className="text-sm text-[#6B7280]">{activeRace.gender === 'M' ? "Men's" : "Women's"} Field</p>
            </div>
            <p className="text-2xl font-bold text-[#1F2937]">{activeRace.startList?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Scoring Rules Blurb (only for finished races) */}
      {hasResults && <ScoringRulesBlurb />}

      {/* Mobile: My Picks → Race Leaderboard → Results. Desktop XL: side-by-side */}
      {hasResults && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
          <div className="order-1">
            {user && <UserPicksScored picks={userPicks} raceId={activeRace._id} />}
            <RaceLeaderboard raceId={activeRace._id} userId={user?._id} />
          </div>
          <div className="order-2">
            {resultsBlock}
            {activeRace.sideBetsConfig && activeRace.sideBetsConfig.length > 0 && (
              <div className="card mb-6">
                <h2 className="text-lg font-semibold mb-3">Side Bets {activeRace.sideBetsConfig.some(b => b.resolved) ? '— Results' : ''}</h2>
                <div className="space-y-2">
                  {activeRace.sideBetsConfig.map((bet, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[rgba(245,243,238,0.6)] rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{bet.prompt}</p>
                        <p className="text-xs text-[#9CA3AF]">
                          {bet.resolved ? (
                            <span>Result: <span className="text-[#1F2937] font-medium">{bet.result}</span></span>
                          ) : (
                            <span>Type: {bet.type} • Difficulty: {bet.difficulty}</span>
                          )}
                        </p>
                      </div>
                      <span className="text-[#D0A242] font-bold">{bet.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side Bets Config for non-finished races */}
      {!hasResults && activeRace.sideBetsConfig && activeRace.sideBetsConfig.length > 0 && (
        <div className="card mb-8 mt-6">
          <h2 className="text-xl font-semibold mb-4">Side Bets</h2>
          <div className="space-y-2">
            {activeRace.sideBetsConfig.map((bet, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-[rgba(245,243,238,0.6)] rounded-lg">
                <div>
                  <p className="font-medium">{bet.prompt}</p>
                  <p className="text-xs text-[#9CA3AF]">Type: {bet.type} • Difficulty: {bet.difficulty}</p>
                </div>
                <span className="text-[#D0A242] font-bold">{bet.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start List */}
      {activeRace.startList && activeRace.startList.length > 0 && !hasResults && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Start List</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#9CA3AF] border-b border-[rgba(180,190,200,0.3)]">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Athlete</th>
                  <th className="pb-2 pr-4">Country</th>
                  <th className="pb-2 pr-4 text-[#67E8F9]">PTO</th>
                  <th className="pb-2 pr-4 text-center text-[#22D3EE]">Swim</th>
                  <th className="pb-2 pr-4 text-center text-[#D0A242]">Bike</th>
                  <th className="pb-2 text-center text-[#E11D48]">Run</th>
                </tr>
              </thead>
              <tbody>
                {activeRace.startList.map((entry, i) => (
                  <tr key={i} className="border-b border-[rgba(180,190,200,0.3)]">
                    <td className="py-2 pr-4 text-[#9CA3AF]">{entry.startRank || i + 1}</td>
                    <td className="py-2 pr-4 font-medium">
                      {(entry.athlete && typeof entry.athlete === 'string') ? (
                        <Link to={`/leaderboard?tab=athletes&expand=${entry.athlete}`} className="hover:text-[#D0A242] transition-colors">{entry.athleteName || 'Unknown'}</Link>
                      ) : (
                        entry.athleteName || entry.athlete?.name || 'Unknown'
                      )}
                    </td>
                    <td className="py-2 pr-4 text-[#9CA3AF]">{entry.country || entry.athlete?.country || ''}</td>
                    <td className="py-2 pr-4 text-[#B45309]">{entry.ptoRanking || entry.athlete?.ptoRanking || '-'}</td>
                    <td className="py-2 pr-4 text-center text-[#22D3EE] text-xs font-medium">#{entry.swimRanking || '-'}</td>
                    <td className="py-2 pr-4 text-center text-[#D0A242] text-xs font-medium">#{entry.bikeRanking || '-'}</td>
                    <td className="py-2 text-center text-[#E11D48] text-xs font-medium">#{entry.runRanking || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
