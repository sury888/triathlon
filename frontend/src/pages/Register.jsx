import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, Navigate, useLocation } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import PageMeta from '../components/PageMeta'
import ErrorAlert from '../components/ErrorAlert'
import { validateEmail, validatePassword, validateName, validateConfirmPassword, getPasswordStrength } from '../utils/validation'

export default function Register() {
  const { user, register, googleLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
const params = new URLSearchParams(location.search)
const redirectTo = params.get('redirect') || '/dashboard'

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [gsiLoaded, setGsiLoaded] = useState(false)
  const gsiCheckRef = useRef(null)

  useEffect(() => {
    gsiCheckRef.current = setInterval(() => {
      if (window.google?.accounts?.id) {
        setGsiLoaded(true)
        clearInterval(gsiCheckRef.current)
      }
    }, 500)
    const timeout = setTimeout(() => {
      clearInterval(gsiCheckRef.current)
    }, 5000)
    return () => { clearInterval(gsiCheckRef.current); clearTimeout(timeout) }
  }, [])

if (user) return <Navigate to={redirectTo} replace />

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setFieldErrors(f => ({ ...f, [e.target.name]: null }))
  }

  const validate = () => {
    const errors = {}
    const nameErr = validateName(form.name)
    const emailErr = validateEmail(form.email)
    const passErr = validatePassword(form.password)
    const confirmErr = validateConfirmPassword(form.password, form.confirmPassword)

    if (nameErr) errors.name = nameErr
    if (emailErr) errors.email = emailErr
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
await register(form.name, form.email, form.password, form.confirmPassword)

setTimeout(() => {
  navigate(redirectTo, { replace: true })
}, 0)

    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.details?.[0] || err.response?.data?.message
      if (msg) {
        setError(msg)
      } else if (err.response?.status === 400) {
        setError('Invalid registration details. Please check your inputs and try again.')
      } else if (err.response?.status === 409) {
        setError('An account with this email already exists. Try signing in instead.')
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.')
      } else if (!err.response) {
        setError('Network error. Please check your connection and try again.')
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await googleLogin(credentialResponse.credential)
navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Google signup failed')
    }
  }

  const strength = getPasswordStrength(form.password)

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <PageMeta title="Create Account" description="Create your Fantasy Endurance account and start playing" />
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#D0A242]">
            Fantasy Endurance
          </h1>
          <p className="text-[#9CA3AF] mt-2">Create your account</p>
        </div>

        <ErrorAlert message={error} onDismiss={() => setError('')} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#6B7280] mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className={`input-field ${fieldErrors.name ? 'border-[#BE123C]/40' : ''}`}
              placeholder="Your name"
              required
              minLength={3}
            />
            {fieldErrors.name && <p className="text-[#E11D48] text-xs mt-1">{fieldErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#6B7280] mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className={`input-field ${fieldErrors.email ? 'border-[#BE123C]/40' : ''}`}
              placeholder="you@example.com"
              required
            />
            {fieldErrors.email && <p className="text-[#E11D48] text-xs mt-1">{fieldErrors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#6B7280] mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                className={`input-field pr-10 ${fieldErrors.password ? 'border-[#BE123C]/40' : ''}`}
                placeholder="Min 8 chars, 1 uppercase, 1 special"
                required
                minLength={8}
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
            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= strength.score ? strength.color : 'bg-[#E8E3DA]'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs mt-1 ${
                  strength.score <= 2 ? 'text-[#E11D48]' :
                  strength.score <= 4 ? 'text-[#C4963A]' : 'text-[#D0A242]'
                }`}>
                  {strength.label}
                </p>
              </div>
            )}
            {fieldErrors.password && <p className="text-[#E11D48] text-xs mt-1">{fieldErrors.password}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#6B7280] mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className={`input-field pr-10 ${fieldErrors.confirmPassword ? 'border-[#BE123C]/40' : ''}`}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1F2937] transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
            {fieldErrors.confirmPassword && <p className="text-[#E11D48] text-xs mt-1">{fieldErrors.confirmPassword}</p>}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-[#E8E3DA]"></div>
          <span className="text-sm text-[#9CA3AF]">or</span>
          <div className="flex-1 h-px bg-[#E8E3DA]"></div>
        </div>

        <div className="flex justify-center">
          {gsiLoaded ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google signup failed')}
              theme="filled_black"
              shape="pill"
              size="large"
              text="signup_with"
            />
          ) : (
            <button
              type="button"
              onClick={() => setError('Google Sign-In is loading. Please wait a moment and try again.')}
              className="flex items-center gap-3 px-6 py-2.5 rounded-full border border-[rgba(180,190,200,0.3)] bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-[#3c4043] shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign up with Google
            </button>
          )}
        </div>

        <p className="text-center text-sm text-[#9CA3AF] mt-6">
          Already have an account?{' '}
 <Link
  to={
    redirectTo && redirectTo !== '/dashboard'
      ? `/login?redirect=${encodeURIComponent(redirectTo)}`
      : '/login'
  }
  className="text-[#D0A242] hover:text-[#C4963A]"
>
  Sign in
</Link>


        </p>
      </div>
    </div>
  )
}

