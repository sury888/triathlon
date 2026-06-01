import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import PageMeta from '../components/PageMeta'
import ErrorAlert from '../components/ErrorAlert'
import { validatePassword, validateConfirmPassword, getPasswordStrength } from '../utils/validation'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <PageMeta title="Invalid Reset Link" />
        <div className="card w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(251,113,133,0.1)] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#E11D48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#D0A242] mb-2">Invalid Reset Link</h2>
          <p className="text-[#9CA3AF] mb-4">This password reset link is invalid or missing. Please request a new one.</p>
          <Link to="/forgot-password" className="text-[#D0A242] hover:text-[#C4963A]">
            Request new reset link
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <PageMeta title="Password Reset" />
        <div className="card w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(208,162,66,0.08)] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#D0A242]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#D0A242] mb-2">Password Reset!</h2>
          <p className="text-[#9CA3AF] mb-6">Your password has been successfully reset. You can now sign in with your new password.</p>
          <button onClick={() => navigate('/login')} className="btn-primary w-full">
            Sign In
          </button>
        </div>
      </div>
    )
  }

  const validate = () => {
    const errors = {}
    const passErr = validatePassword(password)
    const confirmErr = validateConfirmPassword(password, confirmPassword)
    if (passErr) errors.password = passErr
    if (confirmErr) errors.confirmPassword = confirmErr
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validate()) return

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword: password })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  const strength = getPasswordStrength(password)

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <PageMeta title="Reset Password" description="Set a new password for your Fantasy Endurance account" />
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#D0A242]">
            Fantasy Endurance
          </h1>
          <p className="text-[#9CA3AF] mt-2">Set a new password</p>
        </div>

        <ErrorAlert message={error} onDismiss={() => setError('')} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#6B7280] mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: null })) }}
                className={`input-field pr-10 ${fieldErrors.password ? 'border-[#BE123C]/40' : ''}`}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1F2937] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
            {fieldErrors.password && <p className="text-[#E11D48] text-xs mt-1">{fieldErrors.password}</p>}
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded ${i <= strength.score ? strength.color : 'bg-[#E8E3DA]'}`} />
                  ))}
                </div>
                <p className={`text-xs ${strength.score >= 3 ? 'text-[#D0A242]' : strength.score >= 2 ? 'text-[#D0A242]' : 'text-[#E11D48]'}`}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#6B7280] mb-1">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(f => ({ ...f, confirmPassword: null })) }}
              className={`input-field ${fieldErrors.confirmPassword ? 'border-[#BE123C]/40' : ''}`}
              placeholder="••••••••"
              required
            />
            {fieldErrors.confirmPassword && <p className="text-[#E11D48] text-xs mt-1">{fieldErrors.confirmPassword}</p>}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="text-center text-sm text-[#9CA3AF] mt-6">
          <Link to="/login" className="text-[#D0A242] hover:text-[#C4963A]">Back to Sign In</Link>
        </p>
      </div>
    </div>
  )
}
