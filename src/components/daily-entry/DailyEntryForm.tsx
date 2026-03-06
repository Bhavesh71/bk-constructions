'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, Trash2, Users, Package, Coins, Save,
  Loader2, RefreshCw, X, ChevronDown, Eye,
} from 'lucide-react'
import { saveDailyRecord, getDailyRecord } from '@/actions/daily-records'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Labour {
  id: string
  name: string
  designation: string
  dailyWage: number
}

interface Material {
  id: string
  name: string
  unit: string
  defaultRate: number
  category: string
}

interface Site {
  id: string
  name: string
  location: string
}

interface LabourEntry {
  labourId: string
  name: string
  designation: string
  rate: number           // editable, defaults to dailyWage
  present: boolean
}

interface MaterialEntry {
  materialId: string
  name: string
  unit: string
  quantity: number
  rate: number
}

interface OtherEntry {
  category: string
  amount: number
  description: string
}

const OTHER_CATEGORIES = [
  'Transport', 'Equipment Rental', 'Fuel', 'Food', 'Utilities', 'Security', 'Miscellaneous',
]

interface Props {
  sites: Site[]
  labours: Labour[]
  materials: Material[]
  defaultSiteId?: string
  defaultDate: string
}

export function DailyEntryForm({ sites, labours, materials, defaultSiteId, defaultDate }: Props) {
  const router = useRouter()
  const [siteId, setSiteId] = useState(defaultSiteId || sites[0]?.id || '')
  const [date, setDate] = useState(defaultDate)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<'labour' | 'material' | 'other'>('labour')
  const [showSummary, setShowSummary] = useState(false)

  const [labourEntries, setLabourEntries] = useState<LabourEntry[]>(
    labours.map((l) => ({
      labourId: l.id,
      name: l.name,
      designation: l.designation,
      rate: l.dailyWage,
      present: false,
    }))
  )
  const [materialEntries, setMaterialEntries] = useState<MaterialEntry[]>([])
  const [otherEntries, setOtherEntries] = useState<OtherEntry[]>([])
  const [existingRecord, setExistingRecord] = useState(false)

  const loadExistingRecord = useCallback(async () => {
    if (!siteId || !date) return
    setLoading(true)
    try {
      const record = await getDailyRecord(siteId, date)
      if (record) {
        setExistingRecord(true)
        setNotes(record.notes || '')
        setLabourEntries(
          labours.map((l) => {
            const existing = record.labourEntries.find((e: any) => e.labourId === l.id)
            return {
              labourId: l.id,
              name: l.name,
              designation: l.designation,
              rate: existing?.rate ?? l.dailyWage,
              present: existing?.present || false,
            }
          })
        )
        setMaterialEntries(
          record.materialEntries.map((e: any) => ({
            materialId: e.materialId,
            name: e.material.name,
            unit: e.material.unit,
            quantity: e.quantity,
            rate: e.rate,
          }))
        )
        setOtherEntries(
          record.otherExpenses.map((e: any) => ({
            category: e.category,
            amount: e.amount,
            description: e.description || '',
          }))
        )
      } else {
        setExistingRecord(false)
        setNotes('')
        setLabourEntries(labours.map((l) => ({
          labourId: l.id,
          name: l.name,
          designation: l.designation,
          rate: l.dailyWage,
          present: false,
        })))
        setMaterialEntries([])
        setOtherEntries([])
      }
    } finally {
      setLoading(false)
    }
  }, [siteId, date, labours])

  useEffect(() => { loadExistingRecord() }, [loadExistingRecord])

  // ── Totals ────────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const labour = labourEntries.filter(e => e.present).reduce((s, e) => s + e.rate, 0)
    const material = materialEntries.reduce((s, e) => s + e.quantity * e.rate, 0)
    const other = otherEntries.reduce((s, e) => s + e.amount, 0)
    return { labour, material, other, grand: labour + material + other }
  }, [labourEntries, materialEntries, otherEntries])

  const presentCount = labourEntries.filter(e => e.present).length

  // ── Labour helpers ─────────────────────────────────────────────────────────
  function togglePresent(idx: number) {
    setLabourEntries(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], present: !next[idx].present }
      return next
    })
  }

  function setRate(idx: number, rate: number) {
    setLabourEntries(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], rate }
      return next
    })
  }

  // ── Material helpers ───────────────────────────────────────────────────────
  function addMaterial(mat: Material) {
    if (materialEntries.find(e => e.materialId === mat.id)) {
      toast.error('Material already added')
      return
    }
    setMaterialEntries(prev => [
      ...prev,
      { materialId: mat.id, name: mat.name, unit: mat.unit, quantity: 1, rate: mat.defaultRate },
    ])
  }

  function updateMaterial(idx: number, field: 'quantity' | 'rate', value: number) {
    setMaterialEntries(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  function removeMaterial(idx: number) {
    setMaterialEntries(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Other helpers ──────────────────────────────────────────────────────────
  function addOther() {
    setOtherEntries(prev => [...prev, { category: OTHER_CATEGORIES[0], amount: 0, description: '' }])
  }

  function updateOther(idx: number, field: keyof OtherEntry, value: any) {
    setOtherEntries(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  function removeOther(idx: number) {
    setOtherEntries(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!siteId) { toast.error('Select a site'); return }
    setSaving(true)
    try {
      const payload = {
        siteId,
        date,
        notes,
        labourEntries: labourEntries
          .filter(e => e.present)
          .map(e => ({
            labourId: e.labourId,
            rate: e.rate,
            present: true,
            cost: e.rate,
          })),
        materialEntries: materialEntries.map(e => ({
          materialId: e.materialId,
          quantity: e.quantity,
          rate: e.rate,
          total: e.quantity * e.rate,
        })),
        otherExpenses: otherEntries.map(e => ({
          category: e.category,
          amount: e.amount,
          description: e.description,
        })),
      }

      const res = await saveDailyRecord(payload)
      if (res.success) {
        toast.success(existingRecord ? 'Record updated' : 'Record saved')
        router.push('/records')
      } else {
        toast.error(res.error || 'Failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    { id: 'labour' as const, label: 'Labour', icon: Users, badge: `${presentCount} present` },
    { id: 'material' as const, label: 'Materials', icon: Package, badge: `${materialEntries.length} items` },
    { id: 'other' as const, label: 'Other', icon: Coins, badge: `${otherEntries.length} items` },
  ]

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header: site + date */}
      <div className="card grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Construction Site</label>
          <select className="input" value={siteId} onChange={e => setSiteId(e.target.value)}>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name} — {s.location}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        {existingRecord && (
          <div className="sm:col-span-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-xl">
            <RefreshCw className="w-3.5 h-3.5" />
            Updating existing record for this date
          </div>
        )}
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : (
        <>
          {/* Section tabs */}
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-700 rounded-xl w-fit">
              {sections.map(({ id, label, icon: Icon, badge }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={cn('tab-btn flex items-center gap-1.5 whitespace-nowrap', activeSection === id && 'active')}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  <span className={cn(
                    'text-[11px] px-1.5 py-0.5 rounded-full font-medium',
                    activeSection === id
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400'
                  )}>{badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Labour Section ──────────────────────────────────────── */}
          {activeSection === 'labour' && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                  Mark Attendance &amp; Set Rates
                </p>
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  {presentCount} of {labourEntries.length} present
                </span>
              </div>

              {labourEntries.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500">No labour records found. Add labour in the Labour section first.</p>
              ) : (
                <div className="space-y-2">
                  {labourEntries.map((entry, idx) => (
                    <div
                      key={entry.labourId}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border transition-all duration-150',
                        entry.present
                          ? 'border-primary-200 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10'
                          : 'border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30'
                      )}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => togglePresent(idx)}
                        className={cn(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          entry.present
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-gray-300 dark:border-slate-500'
                        )}
                      >
                        {entry.present && <span className="text-white text-xs font-bold">✓</span>}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium',
                          entry.present ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500'
                        )}>{entry.name}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{entry.designation}</p>
                      </div>

                      {/* Editable rate */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-400 dark:text-slate-500">₹</span>
                        <input
                          type="number"
                          className={cn(
                            'w-20 sm:w-24 px-2 py-1 rounded-lg border text-sm text-right transition-colors',
                            entry.present
                              ? 'border-primary-200 dark:border-primary-700 bg-white dark:bg-slate-700 text-gray-900 dark:text-white'
                              : 'border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500'
                          )}
                          value={entry.rate}
                          onChange={e => setRate(idx, parseFloat(e.target.value) || 0)}
                          disabled={!entry.present}
                          min={0}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {presentCount > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
                  <span className="text-sm text-gray-500 dark:text-slate-400">Labour Total</span>
                  <span className="font-display font-bold text-gray-900 dark:text-white">{formatCurrency(totals.labour)}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Material Section ─────────────────────────────────────── */}
          {activeSection === 'material' && (
            <div className="space-y-4">
              {/* Quick-add from catalogue */}
              <div className="card">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Add from Catalogue</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {materials.map(mat => (
                    <button
                      key={mat.id}
                      onClick={() => addMaterial(mat)}
                      disabled={!!materialEntries.find(e => e.materialId === mat.id)}
                      className={cn(
                        'p-2.5 rounded-xl border text-left text-xs transition-all',
                        materialEntries.find(e => e.materialId === mat.id)
                          ? 'border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 cursor-default'
                          : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 cursor-pointer'
                      )}
                    >
                      <p className="font-semibold text-gray-800 dark:text-slate-200 truncate">{mat.name}</p>
                      <p className="text-gray-400 dark:text-slate-500 mt-0.5">{mat.unit} · ₹{mat.defaultRate}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Added materials */}
              {materialEntries.length > 0 && (
                <div className="card space-y-3">
                  <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">Added Materials</p>
                  {materialEntries.map((entry, idx) => (
                    <div key={entry.materialId} className="p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{entry.name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">{entry.unit}</p>
                        </div>
                        <button onClick={() => removeMaterial(idx)} className="p-1 text-gray-300 dark:text-slate-600 hover:text-red-500 rounded flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Qty"
                          className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-right dark:text-slate-200"
                          value={entry.quantity}
                          onChange={e => updateMaterial(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          min={0}
                        />
                        <span className="text-gray-300 dark:text-slate-600 text-xs flex-shrink-0">×</span>
                        <input
                          type="number"
                          placeholder="Rate"
                          className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-right dark:text-slate-200"
                          value={entry.rate}
                          onChange={e => updateMaterial(idx, 'rate', parseFloat(e.target.value) || 0)}
                          min={0}
                        />
                        <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold tabular-nums flex-shrink-0">
                          {formatCurrency(entry.quantity * entry.rate)}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
                    <span className="text-sm text-gray-500 dark:text-slate-400">Material Total</span>
                    <span className="font-display font-bold text-gray-900 dark:text-white">{formatCurrency(totals.material)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Other Expenses ────────────────────────────────────────── */}
          {activeSection === 'other' && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">Other Expenses</p>
                <button onClick={addOther} className="btn-secondary text-xs py-1.5 px-3">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {otherEntries.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">
                  No other expenses. Click "Add" to add transport, fuel, etc.
                </p>
              ) : (
                <>
                  {otherEntries.map((entry, idx) => (
                    <div key={idx} className="rounded-xl bg-gray-50 dark:bg-slate-700/50 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          className="input flex-1 py-2 text-sm"
                          value={entry.category}
                          onChange={e => updateOther(idx, 'category', e.target.value)}
                        >
                          {OTHER_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <input
                          type="number"
                          className="input w-28 py-2 text-right text-sm flex-shrink-0"
                          placeholder="Amount"
                          value={entry.amount || ''}
                          onChange={e => updateOther(idx, 'amount', parseFloat(e.target.value) || 0)}
                          min={0}
                        />
                        <button onClick={() => removeOther(idx)} className="p-2 text-gray-300 dark:text-slate-600 hover:text-red-500 rounded flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        className="input py-2 text-sm w-full"
                        placeholder="Description (optional)"
                        value={entry.description}
                        onChange={e => updateOther(idx, 'description', e.target.value)}
                      />
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
                    <span className="text-sm text-gray-500 dark:text-slate-400">Other Total</span>
                    <span className="font-display font-bold text-gray-900 dark:text-white">{formatCurrency(totals.other)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="card">
            <label className="label">Notes (optional)</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any remarks or special notes for today..."
            />
          </div>

          {/* ── Summary Preview ─────────────────────────────────────── */}
          <div className="card border-primary-100 dark:border-primary-800">
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary-500" />
                <span className="font-semibold text-gray-900 dark:text-white">Daily Summary</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-primary-600 dark:text-primary-400 text-lg">
                  {formatCurrency(totals.grand)}
                </span>
                <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', showSummary && 'rotate-180')} />
              </div>
            </button>

            {showSummary && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 space-y-2.5">
                {[
                  { label: `Labour (${presentCount} workers)`, value: totals.labour, color: 'text-primary-600 dark:text-primary-400' },
                  { label: `Materials (${materialEntries.length} items)`, value: totals.material, color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: `Other Expenses (${otherEntries.length})`, value: totals.other, color: 'text-amber-600 dark:text-amber-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-slate-400">{label}</span>
                    <span className={cn('font-semibold tabular-nums', color)}>{formatCurrency(value)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-slate-700 text-base font-bold">
                  <span className="text-gray-900 dark:text-white">Grand Total</span>
                  <span className="text-primary-600 dark:text-primary-400 font-display">{formatCurrency(totals.grand)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="btn-primary flex-1 justify-center py-3 text-base"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {existingRecord ? 'Update Record' : 'Save Daily Record'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
