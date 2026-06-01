import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import PageMeta from '../components/PageMeta'
import ErrorAlert from '../components/ErrorAlert'

function formatTime(totalSeconds) {
  if (!totalSeconds) return ''
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function parseTimeToSeconds(str) {
  if (!str || !str.trim()) return 0
  const parts = str.split(':').map(Number)
  if (parts.some(isNaN)) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0]
}

const DIFFICULTY_COLORS = {
  easy: 'text-[#D0A242] bg-[rgba(208,162,66,0.08)] border-[#D0A242]/20',
  medium: 'text-[#D0A242] bg-[rgba(208,162,66,0.08)] border-[#D0A242]/20',
  hard: 'text-[#E11D48] bg-[rgba(251,113,133,0.1)] border-[#BE123C]/20',
}

export default function PrivateRaceResults() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [race, setRace] = useState(null)
  const [results, setResults] = useState([])
  const [sideBetAnswers, setSideBetAnswers] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    async function fetchRace() {
      try {
        const { data } = await api.get(`/races/${id}`)
        setRace(data)

        if (data.results && data.results.length > 0) {
          setResults(data.results.map(r => ({
            athlete: r.athlete || r.name,
            totalTime: r.totalTimeSeconds ? formatTime(r.totalTimeSeconds) : '',
            swimTime: r.swimTimeSeconds ? formatTime(r.swimTimeSeconds) : '',
            bikeTime: r.bikeTimeSeconds ? formatTime(r.bikeTimeSeconds) : '',
            runTime: r.runTimeSeconds ? formatTime(r.runTimeSeconds) : '',
            dnf: r.dnf || false
          })))
        } else if (data.startList && data.startList.length > 0) {
          setResults(data.startList.map(a => ({
            athlete: a.athleteName || a.name || a.athlete,
            totalTime: '',
            swimTime: '',
            bikeTime: '',
            runTime: '',
            dnf: false
          })))
        }

        // Initialize side bet answers from existing resolved bets
        if (data.sideBetsConfig && data.sideBetsConfig.length > 0) {
          const answers = {}
          data.sideBetsConfig.forEach(bet => {
            if (bet.resolved && bet.result !== null) {
              answers[bet.key] = bet.result
            }
          })
          setSideBetAnswers(answers)
        }
      } catch (err) {
        setError('Failed to load race')
      } finally {
        setLoading(false)
      }
    }
    fetchRace()
  }, [id])

  const moveAthlete = (index, direction) => {
    const newResults = [...results]
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= newResults.length) return
    const temp = newResults[index]
    newResults[index] = newResults[targetIndex]
    newResults[targetIndex] = temp
    setResults(newResults)
  }

  const updateResult = (index, field, value) => {
    const updated = [...results]
    updated[index] = { ...updated[index], [field]: value }
    setResults(updated)
  }

  const updateSideBet = (key, value) => {
    setSideBetAnswers(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const nonDnf = results.filter(r => !r.dnf)
    if (nonDnf.length === 0) return setError('At least one athlete must have a result (not DNF)')

    // Validate side bets are answered
    const sideBets = race.sideBetsConfig || []
    const unanswered = sideBets.filter(b => sideBetAnswers[b.key] === undefined || sideBetAnswers[b.key] === '')
    if (unanswered.length > 0) {
      return setError(`Please resolve all side bets before submitting (${unanswered.length} remaining)`)
    }

    setSubmitting(true)
    try {
      const payload = results.map(r => ({
        athlete: r.athlete,
        totalTimeSeconds: r.dnf ? 0 : parseTimeToSeconds(r.totalTime),
        swimTimeSeconds: r.dnf ? 0 : parseTimeToSeconds(r.swimTime),
        bikeTimeSeconds: r.dnf ? 0 : parseTimeToSeconds(r.bikeTime),
        runTimeSeconds: r.dnf ? 0 : parseTimeToSeconds(r.runTime),
        dnf: r.dnf
      }))

      const sideBetResults = sideBets.map(bet => ({
        key: bet.key,
        result: sideBetAnswers[bet.key]
      }))

      await api.post(`/races/${id}/results`, { results: payload, sideBetResults })
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit results')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D0A242]"></div></div>

  if (!race) return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <p className="text-[#9CA3AF]">Race not found</p>
    </div>
  )

  // Only the race creator can enter results
  if (race.isPrivate && user && race.createdBy !== user._id) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <PageMeta title="Access Denied" />
        <div className="card text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(251,113,133,0.1)] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#E11D48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#D0A242] mb-2">Access Denied</h2>
          <p className="text-[#9CA3AF] mb-6">Only the race creator can enter results for this private race.</p>
          <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <PageMeta title="Results Submitted" />
        <div className="card text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(208,162,66,0.08)] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#D0A242]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#D0A242] mb-2">Results Submitted!</h2>
          <p className="text-[#9CA3AF] mb-6">Scores have been calculated for {race.name}.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate(`/races/${id}`)} className="btn-primary">View Race Results</button>
            <button onClick={() => navigate('/races')} className="btn-secondary">All Races</button>
          </div>
        </div>
      </div>
    )
  }

  const sideBets = race.sideBetsConfig || []

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <PageMeta title={`Enter Results — ${race.name}`} />

      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="text-sm text-[#D0A242] hover:text-[#C4963A] mb-2 inline-block">&larr; Back</button>
        <h1 className="text-2xl font-bold text-[#D0A242]">Enter Results</h1>
        <p className="text-[#9CA3AF] mt-1">{race.name}</p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      <div className="card mb-4">
        <p className="text-sm text-[#9CA3AF]">
          Drag athletes into finishing order (1st place at top). Optionally add split times in <strong className="text-[#6B7280]">h:mm:ss</strong> format.
          Mark any athlete who did not finish as <strong className="text-[#E11D48]">DNF</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Athlete Results */}
        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={r.athlete}
              className={`card p-3 ${r.dnf ? 'opacity-50 border-[#BE123C]/20' : ''}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveAthlete(i, -1)}
                    disabled={i === 0}
                    className="text-[#9CA3AF] hover:text-[#1F2937] disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveAthlete(i, 1)}
                    disabled={i === results.length - 1}
                    className="text-[#9CA3AF] hover:text-[#1F2937] disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                <span className={`text-lg font-bold w-8 text-center ${r.dnf ? 'text-[#E11D48]' : i === 0 ? 'text-[#D0A242]' : i === 1 ? 'text-[#6B7280]' : i === 2 ? 'text-[#E11D48]' : 'text-[#9CA3AF]'}`}>
                  {r.dnf ? 'DNF' : `${i + 1}.`}
                </span>

                <span className="font-semibold text-[#1F2937] flex-1">{r.athlete}</span>

                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={r.dnf}
                    onChange={(e) => updateResult(i, 'dnf', e.target.checked)}
                    className="rounded border-[rgba(180,190,200,0.3)] bg-[#E8E3DA] text-[#E11D48] focus:ring-[#FB7185]"
                  />
                  <span className="text-[#E11D48]">DNF</span>
                </label>
              </div>

              {!r.dnf && (
                <div className="grid grid-cols-4 gap-2 ml-11">
                  <div>
                    <label className="block text-xs text-[#9CA3AF] uppercase mb-0.5">Total</label>
                    <input
                      type="text"
                      value={r.totalTime}
                      onChange={e => updateResult(i, 'totalTime', e.target.value)}
                      placeholder="h:mm:ss"
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9CA3AF] uppercase mb-0.5">Swim</label>
                    <input
                      type="text"
                      value={r.swimTime}
                      onChange={e => updateResult(i, 'swimTime', e.target.value)}
                      placeholder="h:mm:ss"
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9CA3AF] uppercase mb-0.5">Bike</label>
                    <input
                      type="text"
                      value={r.bikeTime}
                      onChange={e => updateResult(i, 'bikeTime', e.target.value)}
                      placeholder="h:mm:ss"
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9CA3AF] uppercase mb-0.5">Run</label>
                    <input
                      type="text"
                      value={r.runTime}
                      onChange={e => updateResult(i, 'runTime', e.target.value)}
                      placeholder="h:mm:ss"
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Side Bets Resolution */}
        {sideBets.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-[#D0A242] mb-4 flex items-center gap-2">
              Resolve Side Bets
            </h2>
            <p className="text-sm text-[#9CA3AF] mb-4">
              Answer each side bet based on the actual race outcome. Points will be awarded to users who predicted correctly.
            </p>
            <div className="space-y-3">
              {sideBets.map(bet => (
                <div key={bet.key} className="card p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <p className="text-[#1F2937] font-medium">{bet.prompt}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${DIFFICULTY_COLORS[bet.difficulty] || DIFFICULTY_COLORS.easy}`}>
                          {bet.difficulty}
                        </span>
                        <span className="text-xs text-[#9CA3AF]">{bet.points || (bet.difficulty === 'hard' ? 5 : bet.difficulty === 'medium' ? 3 : 1)} pts</span>
                      </div>
                    </div>
                  </div>

                  {bet.type === 'boolean' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateSideBet(bet.key, 'yes')}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          sideBetAnswers[bet.key] === 'yes'
                            ? 'bg-[#D0A242] text-[#1F2937]'
                            : 'bg-[#E8E3DA] text-[#9CA3AF] hover:bg-[#F0EDE8]'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSideBet(bet.key, 'no')}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          sideBetAnswers[bet.key] === 'no'
                            ? 'bg-[#BE123C] text-[#1F2937]'
                            : 'bg-[#E8E3DA] text-[#9CA3AF] hover:bg-[#F0EDE8]'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  )}

                  {bet.type === 'over_under' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateSideBet(bet.key, 'over')}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          sideBetAnswers[bet.key] === 'over'
                            ? 'bg-[#D0A242] text-[#1F2937]'
                            : 'bg-[#E8E3DA] text-[#9CA3AF] hover:bg-[#F0EDE8]'
                        }`}
                      >
                        Over
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSideBet(bet.key, 'under')}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          sideBetAnswers[bet.key] === 'under'
                            ? 'bg-[#6366F1] text-[#1F2937]'
                            : 'bg-[#E8E3DA] text-[#9CA3AF] hover:bg-[#F0EDE8]'
                        }`}
                      >
                        Under
                      </button>
                    </div>
                  )}

                  {bet.type !== 'boolean' && bet.type !== 'over_under' && (
                    <div>
                      <input
                        type="text"
                        value={sideBetAnswers[bet.key] || ''}
                        onChange={e => updateSideBet(bet.key, e.target.value)}
                        placeholder="Enter the answer..."
                        className="input-field text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button type="submit" className="btn-primary flex-1" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Results'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
