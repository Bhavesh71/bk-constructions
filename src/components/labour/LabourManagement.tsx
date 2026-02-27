'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, X, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { createLabour, updateLabour, deleteLabour } from '@/actions/labour'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Labour {
  id: string; name: string; designation: string; dailyWage: number; overtimeRate: number; active: boolean
  totalEarnings: number; daysWorked: number
}

export function LabourManagement({ labours, isAdmin }: { labours: Labour[]; isAdmin: boolean }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', designation: '', dailyWage: '', overtimeRate: '', active: true })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  function startEdit(l: Labour) {
    setEditingId(l.id)
    setForm({ name: l.name, designation: l.designation, dailyWage: String(l.dailyWage), overtimeRate: String(l.overtimeRate), active: l.active })
    setShowForm(true)
  }

  function resetForm() { setShowForm(false); setEditingId(null); setForm({ name: '', designation: '', dailyWage: '', overtimeRate: '', active: true }) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = { name: form.name, designation: form.designation, dailyWage: parseFloat(form.dailyWage), overtimeRate: parseFloat(form.overtimeRate) || 0, active: form.active }
      const result = editingId ? await updateLabour(editingId, data) : await createLabour(data)
      if (result.success) {
        toast.success(editingId ? 'Labour updated' : 'Labour added')
        resetForm()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return
    const result = await deleteLabour(id)
    if (result.success) { toast.success('Labour removed'); router.refresh() }
    else toast.error(result.error || 'Failed to delete')
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-gray-900">{showForm ? (editingId ? 'Edit Worker' : 'Add Worker') : 'Worker Registry'}</h3>
            {!showForm && (
              <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary text-xs py-1.5">
                <Plus className="w-3.5 h-3.5" />Add Worker
              </button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="label">Full Name *</label>
                  <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Worker name" required />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="label">Designation *</label>
                  <input className="input" value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="e.g. Mason, Carpenter" required />
                </div>
                <div>
                  <label className="label">Daily Wage (₹) *</label>
                  <input className="input" type="number" min="0" value={form.dailyWage} onChange={e => set('dailyWage', e.target.value)} required />
                </div>
                <div>
                  <label className="label">OT Rate (₹/hr)</label>
                  <input className="input" type="number" min="0" value={form.overtimeRate} onChange={e => set('overtimeRate', e.target.value)} placeholder="0" />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="active" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 text-primary-500 rounded" />
                  <label htmlFor="active" className="text-sm text-gray-700 font-medium">Active worker</label>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={resetForm} className="btn-secondary"><X className="w-4 h-4" />Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {editingId ? 'Update' : 'Add Worker'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hidden sm:table-cell">Designation</th>
                <th>Daily Wage</th>
                <th className="hidden md:table-cell">OT Rate</th>
                <th className="hidden lg:table-cell">Days Worked</th>
                <th className="hidden lg:table-cell">Total Earnings</th>
                <th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {labours.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-400 py-8">No workers added yet</td></tr>
              ) : (
                labours.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-bold flex-shrink-0">
                          {l.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-800">{l.name}</span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell text-gray-500">{l.designation}</td>
                    <td className="text-financial font-semibold">{formatCurrency(l.dailyWage)}</td>
                    <td className="hidden md:table-cell text-gray-500">{formatCurrency(l.overtimeRate)}/hr</td>
                    <td className="hidden lg:table-cell text-gray-700">{l.daysWorked}</td>
                    <td className="hidden lg:table-cell text-financial font-semibold text-green-600">{formatCurrency(l.totalEarnings)}</td>
                    <td>
                      {l.active
                        ? <span className="badge bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" />Active</span>
                        : <span className="badge bg-gray-100 text-gray-500"><XCircle className="w-3 h-3" />Inactive</span>
                      }
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(l)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(l.id, l.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
