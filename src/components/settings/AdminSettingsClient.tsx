'use client'

import { useState } from 'react'
import { Building2, Lock, BarChart2, Loader2, Save, Edit2, Check, X, Sun, Moon } from 'lucide-react'
import { changePassword, updateAppSettings } from '@/actions/settings'
import { formatCurrency } from '@/lib/utils'
import { useTheme } from '@/lib/theme'
import toast from 'react-hot-toast'

interface AdminSettingsProps {
  user: { name: string; email: string; role: string }
  stats: {
    totalSites: number
    activeSites: number
    totalBudget: number
    totalSpent: number
    totalLabourPaid: number
    totalMaterialSpent: number
    totalRecords: number
    totalWorkers: number
    totalMaterials: number
  }
  appSettings: {
    id: string
    companyName: string
    companyTagline?: string | null
    currency: string
    address?: string | null
    phone?: string | null
    email?: string | null
    gstNumber?: string | null
    contactPerson?: string | null
    logoUrl?: string | null
  }
}

export function AdminSettingsClient({ user, stats, appSettings }: AdminSettingsProps) {
  const { theme, toggleTheme } = useTheme()

  const [profile, setProfile] = useState(appSettings)
  const [editingProfile, setEditingProfile] = useState(false)
  const [draftProfile, setDraftProfile] = useState(appSettings)
  const [profileSaving, setProfileSaving] = useState(false)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  function startEdit() {
    setDraftProfile({ ...profile })
    setEditingProfile(true)
  }
  function cancelEdit() { setEditingProfile(false) }

  async function saveEdit() {
    setProfileSaving(true)
    try {
      const res = await updateAppSettings({
        companyName: draftProfile.companyName,
        companyTagline: draftProfile.companyTagline || undefined,
        currency: draftProfile.currency,
        address: draftProfile.address || undefined,
        phone: draftProfile.phone || undefined,
        email: draftProfile.email || undefined,
        gstNumber: draftProfile.gstNumber || undefined,
        contactPerson: draftProfile.contactPerson || undefined,
      })
      if (res.success) {
        setProfile(draftProfile)
        setEditingProfile(false)
        toast.success('Company settings saved to database')
      } else {
        toast.error(res.error || 'Failed to save')
      }
    } finally { setProfileSaving(false) }
  }

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

  const profileFields: Array<{ key: keyof typeof profile; label: string; placeholder: string; type?: string }> = [
    { key: 'companyName', label: 'Company Name', placeholder: 'BK Constructions' },
    { key: 'companyTagline', label: 'Tagline', placeholder: 'Operations' },
    { key: 'contactPerson', label: 'Contact Person', placeholder: 'Owner / Manager name' },
    { key: 'phone', label: 'Phone Number', placeholder: '+91 98765 43210' },
    { key: 'email', label: 'Business Email', placeholder: 'info@company.com', type: 'email' },
    { key: 'address', label: 'Office Address', placeholder: '123 Main St, City, State' },
    { key: 'gstNumber', label: 'GST Number', placeholder: '22AAAAA0000A1Z5' },
    { key: 'currency', label: 'Currency', placeholder: 'INR' },
  ]

  return (
    <div className="space-y-6">

      {/* Business Stats */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 gradient-indigo rounded-xl flex items-center justify-center">
            <BarChart2 className="w-4.5 h-4.5 text-white" />
          </div>
          <h3 className="font-display font-semibold text-gray-900 dark:text-white">Business Overview</h3>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
          {[
            { label: 'Total Sites', value: String(stats.totalSites) },
            { label: 'Active Sites', value: String(stats.activeSites) },
            { label: 'Total Records', value: String(stats.totalRecords) },
            { label: 'Total Budget', value: formatCurrency(stats.totalBudget) },
            { label: 'Total Spent', value: formatCurrency(stats.totalSpent) },
            { label: 'Balance', value: formatCurrency(stats.totalBudget - stats.totalSpent) },
            { label: 'Labour Paid', value: formatCurrency(stats.totalLabourPaid) },
            { label: 'Material Cost', value: formatCurrency(stats.totalMaterialSpent) },
            { label: 'Active Workers', value: String(stats.totalWorkers) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3">
              <p className="text-xs text-gray-400 dark:text-slate-400 mb-0.5">{label}</p>
              <p className="font-display font-bold text-gray-900 dark:text-white text-sm truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Company Profile — DB Synced */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 gradient-emerald rounded-xl flex items-center justify-center">
              <Building2 className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-gray-900 dark:text-white">Company Settings</h3>
              <p className="text-xs text-gray-400 dark:text-slate-400">Synced to database</p>
            </div>
          </div>
          {!editingProfile ? (
            <button onClick={startEdit} className="btn-secondary text-xs py-1.5">
              <Edit2 className="w-3.5 h-3.5" />Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={cancelEdit} className="btn-secondary text-xs py-1.5">
                <X className="w-3.5 h-3.5" />Cancel
              </button>
              <button onClick={saveEdit} disabled={profileSaving} className="btn-primary text-xs py-1.5">
                {profileSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          )}
        </div>

        {!editingProfile ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {profileFields.map(({ key, label }) => (
              <div key={key} className="py-2 border-b border-gray-50 dark:border-slate-700 last:border-0">
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                  {String(profile[key] || '')}
                  {!profile[key] && <span className="text-gray-300 dark:text-slate-600 italic">Not set</span>}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {profileFields.map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input
                  className="input"
                  type={type || 'text'}
                  value={String(draftProfile[key] || '')}
                  onChange={(e) => setDraftProfile({ ...draftProfile, [key]: e.target.value })}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Theme */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
              {theme === 'dark' ? <Moon className="w-4.5 h-4.5 text-primary-400" /> : <Sun className="w-4.5 h-4.5 text-amber-500" />}
            </div>
            <div>
              <h3 className="font-display font-semibold text-gray-900 dark:text-white">Theme</h3>
              <p className="text-xs text-gray-400 dark:text-slate-400">Currently: {theme === 'dark' ? 'Dark mode' : 'Light mode'}</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
              theme === 'dark' ? 'bg-primary-500' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
              theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Account / Password */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-gray-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
            <Lock className="w-4.5 h-4.5 text-gray-500 dark:text-slate-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-gray-900 dark:text-white">My Account</h3>
            <p className="text-xs text-gray-400 dark:text-slate-400">{user.name} · {user.email} · {user.role}</p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">Change Password</p>
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
