import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import PageMeta from '../components/PageMeta'
import ErrorAlert from '../components/ErrorAlert'

export default function CreatePrivateRace() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('00:00')
  const [athletes, setAthletes] = useState([{ name: '', country: '' }])
  const [genderMode, setGenderMode] = useState('combined')
  const [inviteEmails, setInviteEmails] = useState('')
  const [sideBets, setSideBets] = useState([])
  const [raceNotes, setRaceNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)


  const addAthlete = () => setAthletes([...athletes, { name: '', gender: 'M', country: '' }])

  const removeAthlete = (i) => {
    if (athletes.length <= 1) return
    setAthletes(athletes.filter((_, idx) => idx !== i))
  }

  const updateAthlete = (i, field, value) => {
    const updated = [...athletes]
    updated[i] = { ...updated[i], [field]: value }
    setAthletes(updated)
  }

  const addSideBet = () => setSideBets([...sideBets, { prompt: '', type: 'boolean', difficulty: 'easy', line: '' }])

  const removeSideBet = (i) => setSideBets(sideBets.filter((_, idx) => idx !== i))

  const updateSideBet = (i, field, value) => {
    const updated = [...sideBets]
    updated[i] = { ...updated[i], [field]: value }
    setSideBets(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) return setError('Race name is required')
    if (!date) return setError('Race date is required')

    const raceDateTime = new Date(`${date}T${time || '00:00'}:00Z`)
    if (raceDateTime <= new Date()) return setError('Race date must be in the future')

    const validAthletes = athletes.filter(a => a.name.trim())
    if (validAthletes.length < 2) return setError('At least 2 athletes are required')

    setLoading(true)
    try {
      const validSideBets = sideBets
        .filter(s => s.prompt.trim())
        .map((s, i) => ({ key: `custom_${i}`, prompt: s.type === 'over_under' && s.line ? `${s.prompt} (line: ${s.line})` : s.prompt, type: s.type, difficulty: s.difficulty, line: s.type === 'over_under' ? s.line : undefined }))

      const raceDate = `${date}T${time || '00:00'}:00Z`
      const { data } = await api.post('/races/private', {
        name: name.trim(),
        date: raceDate,
        location: location.trim() || undefined,
        genderMode,
        startList: validAthletes.map(a => ({
          name: a.name.trim(),
          gender: genderMode === a.gender || 'M',
          country: a.country?.trim() || undefined
        })),
        sideBetsConfig: validSideBets,
        notes: raceNotes.trim() || undefined
      })

      // Invite emails if provided
      const emails = inviteEmails.split(/[,;\s]+/).map(e => e.trim()).filter(e => e.includes('@'))
      if (emails.length > 0) {
        await api.post(`/races/${data._id}/invite`, { emails })
      }

      navigate(`/races/${data._id}/pick`, { state: { inviteCode: data.inviteCode, raceName: data.name } })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create race')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PageMeta title="Create Private Race" description="Create a private race for you and your friends" />

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#D0A242]">Create Private Race</h1>
          <p className="text-[#9CA3AF] mt-1">Set up a race for you and your friends — only invited users can see it</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/races')}
          aria-label="Cancel and return to races"
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-[rgba(216,221,223,0.45)] hover:bg-[#E8E3DA] text-[#9CA3AF] hover:text-[#1F2937] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Race Details */}
        <div className="card">
          <h3 className="text-lg font-semibold text-[#D0A242] mb-4">Race Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#6B7280] mb-1">Race Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="input-field"
                placeholder="e.g. Happy Valley Sprint Tri 2026"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#6B7280] mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Happy Valley, PA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B7280] mb-1">Race Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-field"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#6B7280] mb-1">Race Time (UTC)</label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="input-field"
                />
                <p className="text-xs text-[#9CA3AF] mt-1">{time ? `${time} UTC` : '00:00 AM UTC (midnight)'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B7280] mb-1">Gender Scoring</label>
                <select
                  value={genderMode}
                  onChange={e => setGenderMode(e.target.value)}
                  className="input-field"
                >
                  <option value="combined">Combined (Men & Women scored together)</option>
                  <option value="separate">Separate (Men & Women scored separately)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Start List */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#D0A242]">Start List</h3>
            <button type="button" onClick={addAthlete} className="text-sm text-[#D0A242] hover:text-[#C4963A] flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Athlete
            </button>
          </div>
          <p className="text-[#9CA3AF] text-sm mb-4">Add your friends / amateur athletes competing in this race</p>
          <div className="space-y-3">
            {athletes.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[#9CA3AF] text-sm w-6 text-right flex-shrink-0">{i + 1}.</span>
                <input
                  type="text"
                  value={a.name}
                  onChange={e => updateAthlete(i, 'name', e.target.value)}
                  className="input-field flex-[3] min-w-0"
                  placeholder="Athlete name"
                />
                <input
                  type="text"
                  value={a.country || ''}
                  onChange={e => updateAthlete(i, 'country', e.target.value)}
                  className="input-field flex-[1.5] min-w-0"
                  placeholder="Country"
                />
                {genderMode === 'separate' && (
                  <select
                    value={a.gender || 'M'}
                    onChange={e => updateAthlete(i, 'gender', e.target.value)}
                    className="bg-[#E8E3DA] border border-[rgba(180,190,200,0.3)] rounded-lg px-2 py-2 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#15A780] w-14 flex-shrink-0"
                  >
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                )}
                {athletes.length > 1 && (
                  <button type="button" onClick={() => removeAthlete(i)} className="text-[#E11D48] hover:text-[#E11D48] flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Side Bets */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#D0A242]">Side Bets (Optional)</h3>
            <button type="button" onClick={addSideBet} className="text-sm text-[#D0A242] hover:text-[#C4963A] flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Side Bet
            </button>
          </div>
          {sideBets.length === 0 && (
            <p className="text-[#9CA3AF] text-sm">No side bets yet. Add some fun predictions!</p>
          )}
          <div className="space-y-3">
            {sideBets.map((s, i) => (
              <div key={i} className="bg-[rgba(216,221,223,0.45)] rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={s.prompt}
                    onChange={e => updateSideBet(i, 'prompt', e.target.value)}
                    className="input-field flex-1"
                    placeholder="e.g. Will anyone DNF?"
                  />
                  <button type="button" onClick={() => removeSideBet(i)} className="text-[#E11D48] hover:text-[#E11D48]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex gap-3">
                  <select
                    value={s.type}
                    onChange={e => updateSideBet(i, 'type', e.target.value)}
                    className="input-field flex-1"
                  >
                    <option value="boolean">Yes/No</option>
                    <option value="over_under">Over/Under</option>
                    <option value="exact">Exact</option>
                  </select>
                  {s.type === 'over_under' && (
                    <input
                      type="number"
                      step="0.5"
                      value={s.line || ''}
                      onChange={e => updateSideBet(i, 'line', e.target.value)}
                      className="bg-[#E8E3DA] border border-[rgba(180,190,200,0.3)] rounded-lg px-3 py-2 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#15A780] w-28 flex-shrink-0"
                      placeholder="Line (e.g. 10.5)"
                    />
                  )}
                  <select
                    value={s.difficulty}
                    onChange={e => updateSideBet(i, 'difficulty', e.target.value)}
                    className="input-field flex-1"
                  >
                    <option value="easy">Easy (+1 pt)</option>
                    <option value="medium">Medium (+3 pts)</option>
                    <option value="hard">Hard (+5 pts)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Race Notes / Rules */}
        <div className="card">
          <h3 className="text-lg font-semibold text-[#D0A242] mb-2">Race Notes &amp; Rules (Optional)</h3>
          <p className="text-[#9CA3AF] text-sm mb-3">
            Add any custom rules, handicaps, or notes for this race. e.g. "Ben has a 60 minute handicap"
          </p>
          <textarea
            value={raceNotes}
            onChange={e => setRaceNotes(e.target.value)}
            className="input-field"
            rows={3}
            placeholder="e.g. Ben has a 60 minute handicap. No wetsuits allowed."
          />
        </div>

        {/* Invite Friends */}
        <div className="card">
          <h3 className="text-lg font-semibold text-[#D0A242] mb-4">Invite Friends</h3>
          <p className="text-[#9CA3AF] text-sm mb-3">
            Enter email addresses of friends to invite (they'll also get an invite code to join).
            You can invite more people after creating the race too.
          </p>
          <textarea
            value={inviteEmails}
            onChange={e => setInviteEmails(e.target.value)}
            className="input-field"
            rows={3}
            placeholder="friend1@email.com, friend2@email.com, ..."
          />
        </div>

        <button type="submit" className="btn-primary w-full text-lg py-3" disabled={loading}>
          {loading ? 'Creating Race...' : 'Create Private Race'}
        </button>
      </form>
    </div>
  )
}
