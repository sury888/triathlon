import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../utils/api'
import PageMeta from '../components/PageMeta'

export default function Profile() {
  const { user, updateUser, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', bio: '', avatar: '' })
  const [activity, setActivity] = useState(null)
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', bio: user.bio || '', avatar: user.avatar || '' })
    }
    fetchActivity()
  }, [user])

  async function fetchActivity() {
    try {
      const { data } = await api.get(`/users/${user._id}/activity`)
      setActivity(data)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const { data } = await api.patch(`/users/${user._id}/updateProfile`, form)
      updateUser(data)
      setEditing(false)
      setSuccess('Profile updated!')
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed')
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (passwordForm.newPassword !== passwordForm.confirm) {
      setError('Passwords do not match')
      return
    }
    try {
      await api.post(`/users/${user._id}/changePassword`, {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      })
      setSuccess('Password changed!')
      setShowPassword(false)
      setPasswordForm({ oldPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <PageMeta title="Profile" description="Manage your Fantasy Endurance profile" />
      <h1 className="text-3xl font-bold mb-6">Profile</h1>

      {error && <div className="bg-[rgba(251,113,133,0.1)] border border-[#BE123C]/40 text-[#E11D48] rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}
      {success && <div className="bg-[rgba(245,243,238,0.35)] border-l-2 border-[#D0A242] text-[#C4963A] rounded-lg px-4 py-3 mb-4 text-sm">{success}</div>}

      {/* Profile Info */}
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#D0A242] flex items-center justify-center text-2xl font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.name}</h2>
              <p className="text-[#9CA3AF]">{user?.email}</p>
              {user?.bio && <p className="text-sm text-[#6B7280] mt-1">{user.bio}</p>}
            </div>
          </div>
          <button onClick={() => setEditing(!editing)} className="btn-secondary text-sm">
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editing && (
          <form onSubmit={handleUpdateProfile} className="space-y-3 mt-4 pt-4 border-t border-[rgba(180,190,200,0.3)]">
            <div>
              <label className="block text-sm text-[#6B7280] mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-1">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="input-field"
                rows={3}
              />
            </div>
            <button type="submit" className="btn-primary text-sm">Save Changes</button>
          </form>
        )}
      </div>

      {/* Security */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Security</h2>
          <button onClick={() => setShowPassword(!showPassword)} className="btn-secondary text-sm">
            {showPassword ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPassword && (
          <form onSubmit={handleChangePassword} className="space-y-3">
            <input
              type="password"
              value={passwordForm.oldPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
              className="input-field"
              placeholder="Current password"
              required
            />
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="input-field"
              placeholder="New password"
              required
            />
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
              className="input-field"
              placeholder="Confirm new password"
              required
            />
            <button type="submit" className="btn-primary text-sm">Update Password</button>
          </form>
        )}
      </div>

      {/* Activity */}
      {activity && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Activity</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#9CA3AF]">Leagues Joined</p>
              <p className="text-2xl font-bold">{activity.leaguesJoined?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-[#9CA3AF]">Picks Made</p>
              <p className="text-2xl font-bold">{activity.recentPicks?.length || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Theme Settings */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#1F2937]">Dark Mode</p>
            <p className="text-sm text-[#9CA3AF]">Switch between light and dark theme</p>
          </div>
          <button
            onClick={toggleTheme}
            className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none"
            style={{
              background: theme === 'dark' ? '#15A780' : '#D1D5DB',
            }}
            aria-label="Toggle dark mode"
          >
            <div
              className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center"
              style={{
                transform: theme === 'dark' ? 'translateX(30px)' : 'translateX(2px)',
              }}
            >
              {theme === 'dark' ? (
                <svg className="w-3.5 h-3.5 text-[#15A780]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-[#BE123C]/20">
        <h2 className="text-xl font-semibold text-[#E11D48] mb-2">Danger Zone</h2>
        <p className="text-sm text-[#9CA3AF] mb-4">Permanently delete your account and all associated data.</p>
        <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 bg-[#BE123C] hover:bg-[#9C3D3D] text-[#1F2937] rounded-lg text-sm font-medium transition-colors">
          Delete Account
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-panel w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">&#9888;</span>
              <h2 className="text-xl font-bold text-[#E11D48]">Delete Account?</h2>
            </div>
            <p className="text-[#6B7280] text-sm mb-6">
              Are you sure you want to permanently delete your account? This action cannot be undone. All your picks, league memberships, and profile data will be removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-lg bg-[#E8E3DA] text-[#6B7280] hover:bg-[#E8E3DA] transition-colors">
                Cancel
              </button>
              <button onClick={() => { setShowDeleteConfirm(false); logout() }} className="flex-1 px-4 py-2 rounded-lg bg-[#BE123C] hover:bg-[#9C3D3D] text-[#1F2937] font-medium transition-colors">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
