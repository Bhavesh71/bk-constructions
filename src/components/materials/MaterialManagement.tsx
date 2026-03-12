'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, X, Loader2 } from 'lucide-react'
import { createMaterial, updateMaterial, deleteMaterial } from '@/actions/materials'
import { formatCurrency } from '@/lib/utils'
import { MATERIAL_CATEGORIES } from '@/lib/constants'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Material {
  id: string; name: string; unit: string; defaultRate: number; category: string
  totalSpent: number; totalQuantity: number
}

export function MaterialManagement({ materials, isAdmin }: { materials: Material[]; isAdmin: boolean }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', unit: '', defaultRate: '', category: 'Masonry' })
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('All')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const usedCategories = ['All', ...MATERIAL_CATEGORIES.filter(c => materials.some(m => m.category === c))]
  const filtered = filter === 'All' ? materials : materials.filter(m => m.category === filter)

  function startEdit(m: Material) {
    setEditingId(m.id)
    setForm({ name: m.name, unit: m.unit, defaultRate: String(m.defaultRate), category: m.category })
    setShowForm(true)
  }

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setForm({ name: '', unit: '', defaultRate: '', category: 'Masonry' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = { name: form.name, unit: form.unit, defaultRate: parseFloat(form.defaultRate), category: form.category }
      const result = editingId ? await updateMaterial(editingId, data) : await createMaterial(data)
      if (result.success) {
        toast.success(editingId ? 'Updated' : 'Material added')
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
    const result = await deleteMaterial(id)
    if (result.success) { toast.success('Removed'); router.refresh() }
    else toast.error(result.error || 'Failed')
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-gray-900 dark:text-white">
              {showForm ? (editingId ? 'Edit Material' : 'Add Material') : 'Material Catalogue'}
            </h3>
            {!showForm && (
              <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary text-xs py-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Material
              </button>
            )}
          </div>
          {showForm && (
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="label">Material Name *</label>
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Cement (OPC 53)" required />
              </div>
              <div>
                <label className="label">Category *</label>
                <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                  {MATERIAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Unit *</label>
                <input className="input" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="Bag, Kg, CFT, Nos" required />
              </div>
              <div>
                <label className="label">Default Rate (₹) *</label>
                <input className="input" type="number" min="0.01" step="0.01" value={form.defaultRate} onChange={e => set('defaultRate', e.target.value)} required />
              </div>
              <div className="col-span-2 flex gap-3">
                <button type="button" onClick={resetForm} className="btn-secondary">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {editingId ? 'Update' : 'Add Material'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {usedCategories.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${filter === c ? 'bg-primary-500 text-white border-primary-500' : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead>
              <tr>
                <th>Material</th>
                <th className="hidden sm:table-cell">Category</th>
                <th>Unit</th>
                <th>Rate</th>
                <th className="hidden lg:table-cell">Total Spent</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-8">No materials in this category</td>
                </tr>
              ) : (
                filtered.map(m => (
                  <tr key={m.id}>
                    <td className="font-medium text-gray-800 dark:text-slate-200">{m.name}</td>
                    <td className="hidden sm:table-cell">
                      <span className="badge badge-blue">{m.category}</span>
                    </td>
                    <td className="text-gray-500 dark:text-slate-400">{m.unit}</td>
                    <td className="text-financial font-semibold">{formatCurrency(m.defaultRate)}</td>
                    <td className="hidden lg:table-cell text-financial font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(m.totalSpent)}
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(m.id, m.name)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
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
