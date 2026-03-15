'use client'

import { useState } from 'react'
import { Plus, Trash2, X, Loader2, Shield, UserPlus, AlertTriangle } from 'lucide-react'
import { createUser, deleteUser } from '@/actions/users'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Portal } from '@/components/layout/Portal'

interface User { id: string; name: string; email: string; role: string; createdAt: Date }

export function UsersManagement({ users }: { users: User[] }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SUPERVISOR' })
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
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

  async function confirmDeleteUser() {
    if (!confirmDelete) return
    const result = await deleteUser(confirmDelete.id)
    if (result.success) { toast.success('User removed'); router.refresh() }
    else toast.error(result.error || 'Failed')
    setConfirmDelete(null)
  }

  return (
    <>
      <div className="space-y-4">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Team Members</h3>
            {!showForm && (
              <button onClick={() => setShowForm(true)} className="btn-primary text-xs py-1.5">
                <UserPlus className="w-3.5 h-3.5" /><span>Invite User</span>
              </button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 rounded-xl"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
              <h4 className="section-title text-sm">New User</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="label">Full Name *</label>
                  <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" required />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="label">Email *</label>
                  <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" required />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="label">Password *</label>
                  <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 characters" minLength={8} required />
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
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  <X className="w-4 h-4" /><span>Cancel</span>
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create User
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {users.length === 0 ? (
              <div className="empty-state py-10">
                <div className="empty-state-icon">
                  <UserPlus className="w-5 h-5" />
                </div>
                <p className="empty-state-title">No team members yet</p>
                <p className="empty-state-desc">Invite your first user to get started.</p>
              </div>
            ) : users.map((user) => (
              <div key={user.id}
                className="flex items-center gap-4 p-3 rounded-xl transition-colors"
                style={{ border: '1px solid var(--border-subtle)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 icon-box-primary">
                  {user.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                    <span className={`badge ${user.role === 'ADMIN' ? 'badge-purple' : 'badge-green'}`}>
                      <Shield className="w-3 h-3" />
                      {user.role}
                    </span>
                    {user.id === session?.user?.id && (
                      <span className="badge badge-yellow">You</span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                </div>

                {/* Joined date */}
                <div className="text-right hidden sm:block flex-shrink-0">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Joined</p>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{formatDate(user.createdAt)}</p>
                </div>

                {/* Delete */}
                {user.id !== session?.user?.id && (
                  <button
                    onClick={() => setConfirmDelete({ id: user.id, name: user.name })}
                    className="btn-icon flex-shrink-0 hover:!text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/20"
                    title="Remove user"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirm Delete Modal — rendered via Portal for full-page coverage */}
      {confirmDelete && (
        <Portal>
          <div
            className="modal-overlay"
            onClick={() => setConfirmDelete(null)}
          >
            <div
              className="modal-box max-w-sm w-full"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-user-title"
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="flex items-center gap-3">
                  <div className="icon-box-red w-9 h-9 flex items-center justify-content-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 id="delete-user-title" className="modal-title">Remove User?</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>This action cannot be undone</p>
                  </div>
                </div>
                <button onClick={() => setConfirmDelete(null)} className="btn-icon">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="modal-body space-y-4">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{confirmDelete.name}</span>
                  {' '}will be permanently removed from the system. All their data will be preserved, but they will no longer be able to log in.
                </p>

                <div className="p-3 rounded-xl flex items-center gap-2.5"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                  <div className="w-8 h-8 rounded-lg icon-box-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {confirmDelete.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{confirmDelete.name}</p>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button onClick={() => setConfirmDelete(null)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteUser}
                  className="btn-danger"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove User
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
