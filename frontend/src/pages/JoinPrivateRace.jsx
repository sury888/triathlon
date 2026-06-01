import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import PageMeta from '../components/PageMeta'
import ErrorAlert from '../components/ErrorAlert'
import LoadingSpinner from '../components/LoadingSpinner'

export default function JoinPrivateRace() {
  const { inviteCode } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [race, setRace] = useState(null)

  useEffect(() => {
    async function joinRace() {
      try {
        const { data } = await api.post(`/races/join/${inviteCode}`)
        setRace(data.race)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to join race. The invite code may be invalid.')
      } finally {
        setLoading(false)
      }
    }
    joinRace()
  }, [inviteCode])

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <PageMeta title={race ? `Joined ${race.name}` : 'Join Race'} />
      {error ? (
        <div className="card">
          <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(251,113,133,0.1)] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#E11D48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <ErrorAlert message={error} />
          <button onClick={() => navigate('/races')} className="btn-primary mt-4">
            Go to Races
  </button>
        </div>
      ) : (
        <div className="card">
          <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(208,162,66,0.08)] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#D0A242]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#D0A242] mb-2">You're in!</h2>
          <p className="text-[#9CA3AF] mb-6">You've joined <span className="text-[#1F2937] font-medium">{race?.name}</span></p>
          <button onClick={() => navigate(`/races/${race?._id}`)} className="btn-primary">
            View Race
          </button>
        </div>
      )}
    </div>
  )
}