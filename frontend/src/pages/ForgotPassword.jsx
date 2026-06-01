import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import PageMeta from '../components/PageMeta'
import ErrorAlert from '../components/ErrorAlert'
import { validateEmail } from '../utils/validation'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldError('')

    const emailErr = validateEmail(email)
    if (emailErr) {
      setFieldError(emailErr)
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <PageMeta title="Check Your Email" />
        <div className="card w-full max-w-md text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(208,162,66,0.08)] flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#D0A242]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#D0A242] mb-2">Check your email</h2>
            <p className="text-[#9CA3AF]">
              If an account with <span className="text-[#1F2937] font-medium">{email}</span> exists,
              we've sent a password reset link. Check your inbox (and spam folder).
            </p>
          </div>
          <p className="text-[#9CA3AF] text-sm mb-4">The link expires in 4 hours.</p>
          <Link to="/login" className="text-[#D0A242] hover:text-[#C4963A] text-sm">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <PageMeta title="Forgot Password" description="Reset your Fantasy Endurance password" />
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#D0A242]">
            Fantasy Endurance
          </h1>
          <p className="text-[#9CA3AF] mt-2">Reset your password</p>
        </div>

        <ErrorAlert message={error} onDismiss={() => setError('')} />

        <p className="text-[#9CA3AF] text-sm mb-6">
          Enter the email address associated with your account and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#6B7280] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldError('') }}
              className={`input-field ${fieldError ? 'border-[#BE123C]/40' : ''}`}
              placeholder="you@example.com"
              required
              autoFocus
            />
            {fieldError && <p className="text-[#E11D48] text-xs mt-1">{fieldError}</p>}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-center text-sm text-[#9CA3AF] mt-6">
          Remember your password?{' '}
          <Link to="/login" className="text-[#D0A242] hover:text-[#C4963A]">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
