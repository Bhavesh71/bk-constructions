'use client'

import { useState } from 'react'
import { Lock, MapPin, Loader2, Save, Sun, Moon, CheckCircle2, Clock } from 'lucide-react'
import { changePassword } from '@/actions/settings'
import { useTheme } from '@/lib/theme'
import { cn, getSiteStatusColor } from '@/lib/utils'
import toast from 'react-hot-toast'

interface SupervisorSettingsProps {
  user: { name: string; email: string; role: string }
  assignedSites: Array<{ id: string; name: string; location: string; status: string }>
  totalRecordsCreated: number
}

export function SupervisorSettingsClient({ user, assignedSites, totalRecordsCreated }: SupervisorSettingsProps) {
  const { theme, toggleTheme } = useTheme()

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return }
    if (newPw.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setPwLoading(true)
    try {
      const res = await changePassword(currentPw, newPw)
      if (res.success) {
        toast.success('Password changed successfully')
        setCurrentPw(''); setNewPw(''); setConfirmPw('')
      } else {
        toast.error(res.error || 'Failed to change password')
      }
    } finally { setPwLoading(false) }
  }

  return (
    <div className="space-y-6">

      {/* Profile Info */}
      <div className="card">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-lg">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="font-display font-bold text-gray-900 dark:text-white text-lg">{user.name}</h2>
            <p className="text-sm text-gray-400 dark:text-slate-400">{user.email}</p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mt-1">
              Supervisor
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3">
            <p className="text-xs text-gray-400 dark:text-slate-400 mb-0.5">Assigned Sites</p>
            <p className="font-display font-bold text-gray-900 dark:text-white">{assignedSites.length}</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3">
            <p className="text-xs text-gray-400 dark:text-slate-400 mb-0.5">Records Created</p>
            <p className="font-display font-bold text-gray-900 dark:text-white">{totalRecordsCreated}</p>
          </div>
        </div>
      </div>

      {/* Assigned Sites */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 gradient-emerald rounded-xl flex items-center justify-center">
            <MapPin className="w-[18px] h-[18px] text-white" />
          </div>
          <h3 className="font-display font-semibold text-gray-900 dark:text-white">Assigned Sites</h3>
        </div>

        {assignedSites.length === 0 ? (
          <div className="empty-state py-6">
            <div className="empty-state-icon">
              <MapPin className="w-8 h-8 text-gray-300 dark:text-slate-600" />
            </div>
            <p className="text-gray-400 dark:text-slate-500 text-sm">No sites assigned yet</p>
            <p className="text-gray-300 dark:text-slate-600 text-xs mt-1">Contact your admin to get assigned to sites</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assignedSites.map((site) => {
              const { badge, label } = getSiteStatusColor(site.status)
              return (
                <div key={site.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">{site.name}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{site.location}</p>
                  </div>
                  <span className={cn('badge text-xs', badge)}>{label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Theme Toggle */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
              {theme === 'dark' ? <Moon className="w-[18px] h-[18px] text-primary-400" /> : <Sun className="w-[18px] h-[18px] text-amber-500" />}
            </div>
            <div>
              <h3 className="font-display font-semibold text-gray-900 dark:text-white">Appearance</h3>
              <p className="text-xs text-gray-400 dark:text-slate-400">
                {theme === 'dark' ? 'Dark mode is on' : 'Light mode is on'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
              theme === 'dark' ? 'bg-primary-500' : 'bg-gray-200 dark:bg-slate-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
              theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-gray-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
            <Lock className="w-[18px] h-[18px] text-gray-500 dark:text-slate-400" />
          </div>
          <h3 className="font-display font-semibold text-gray-900 dark:text-white">Change Password</h3>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
          <div>
            <label className="label">Current Password</label>
            <input className="input" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required placeholder="••••••••" />
          </div>
          <div>
            <label className="label">New Password</label>
            <input className="input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required placeholder="Min. 6 characters" />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input className="input" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required placeholder="Repeat new password" />
          </div>
          <button type="submit" disabled={pwLoading} className="btn-primary">
            {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  )
}
