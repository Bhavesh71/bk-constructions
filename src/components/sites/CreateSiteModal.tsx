'use client'

import { useState } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { createSite } from '@/actions/sites'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export function CreateSiteModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    location: '',
    status: 'ACTIVE',
    description: '',
    expectedRevenue: '',
    startDate: '',
    expectedEndDate: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await createSite({
        ...form,
        expectedRevenue: form.expectedRevenue ? parseFloat(form.expectedRevenue) : null,
        startDate: form.startDate || null,
        expectedEndDate: form.expectedEndDate || null,
      })
      if (result.success) {
        toast.success('Site created successfully!')
        setOpen(false)
        setForm({ name: '', location: '', status: 'ACTIVE', description: '', expectedRevenue: '', startDate: '', expectedEndDate: '' })
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to create site')
      }
    } finally {
      setLoading(false)
    }
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="w-4 h-4" />
        New Site
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg animate-slide-up border border-transparent dark:border-slate-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
              <h3 className="font-display font-bold text-gray-900 dark:text-white text-lg">Create New Site</h3>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Site Name *</label>
                  <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Riverside Towers" required />
                </div>
                <div className="col-span-2">
                  <label className="label">Location *</label>
                  <input className="input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="City, State" required />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="label">Expected Revenue (₹)</label>
                  <input className="input" type="number" value={form.expectedRevenue} onChange={e => set('expectedRevenue', e.target.value)} placeholder="0" min="0" />
                </div>
                <div>
                  <label className="label">Start Date</label>
                  <input className="input" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                </div>
                <div>
                  <label className="label">Expected End Date</label>
                  <input className="input" type="date" value={form.expectedEndDate} onChange={e => set('expectedEndDate', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="label">Description</label>
                  <textarea className="input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of the site..." />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : <><Plus className="w-4 h-4" />Create Site</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
