'use client'

import { useState } from 'react'
import { Plus, Trash2, X, Loader2, Shield, UserPlus } from 'lucide-react'
import { createUser, deleteUser } from '@/actions/users'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface User { id: string; name: string; email: string; role: string; createdAt: Date }

export function UsersManagement({ users }: { users: User[] }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SUPERVISOR' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await createUser(form)
      if (result.success) {
        toast.success('User created!')
        setShowForm(false)
        setForm({ name: '', email: '', password: '', role: 'SUPERVISOR' })
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to create user')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return
    const result = await deleteUser(id)
    if (result.success) { toast.success('User removed'); router.refresh() }
    else toast.error(result.error || 'Failed')
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white">Team Members</h3>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary text-xs py-1.5">
              <UserPlus className="w-3.5 h-3.5" />Invite User
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-slate-600">
            <h4 className="font-semibold text-gray-800 dark:text-slate-200 text-sm">New User</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="label">Full Name *</label>
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="label">Email *</label>
                <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="label">Password *</label>
                <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} minLength={8} required />
              </div>
              <div>
                <label className="label">Role *</label>
                <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary"><X className="w-4 h-4" />Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create User
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-sm flex-shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{user.name}</p>
                  <span className={`badge text-xs ${user.role === 'ADMIN' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-800' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'}`}>
                    <Shield className="w-3 h-3" />{user.role}
                  </span>
                  {user.id === session?.user?.id && <span className="badge bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-xs">You</span>}
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{user.email}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-400 dark:text-slate-500">Joined</p>
                <p className="text-xs text-gray-600 dark:text-slate-400">{formatDate(user.createdAt)}</p>
              </div>
              {user.id !== session?.user?.id && (
                <button onClick={() => handleDelete(user.id, user.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
