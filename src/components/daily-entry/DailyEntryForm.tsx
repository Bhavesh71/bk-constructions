'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Users, Package, Coins, Save, Loader2, RefreshCw, X } from 'lucide-react'
import { saveDailyRecord, getDailyRecord } from '@/actions/daily-records'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Labour { id: string; name: string; designation: string; dailyWage: number; overtimeRate: number }
interface Material { id: string; name: string; unit: string; defaultRate: number; category: string }
interface Site { id: string; name: string; location: string }

interface LabourEntry { labourId: string; name: string; designation: string; dailyWage: number; overtimeRate: number; present: boolean; overtimeHours: number }
interface MaterialEntry { materialId: string; name: string; unit: string; quantity: number; rate: number }
interface OtherEntry { category: string; amount: number; description: string }

const OTHER_CATEGORIES = ['Transport', 'Equipment Rental', 'Fuel', 'Food', 'Utilities', 'Security', 'Miscellaneous']

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

  // Labour entries - initialized from all labours
  const [labourEntries, setLabourEntries] = useState<LabourEntry[]>(
    labours.map((l) => ({ labourId: l.id, name: l.name, designation: l.designation, dailyWage: l.dailyWage, overtimeRate: l.overtimeRate, present: false, overtimeHours: 0 }))
  )
  const [materialEntries, setMaterialEntries] = useState<MaterialEntry[]>([])
  const [otherEntries, setOtherEntries] = useState<OtherEntry[]>([])
  const [existingRecord, setExistingRecord] = useState(false)

  // Load existing record when site or date changes
  const loadExistingRecord = useCallback(async () => {
    if (!siteId || !date) return
    setLoading(true)
    try {
      const record = await getDailyRecord(siteId, date)
      if (record) {
        setExistingRecord(true)
        setNotes(record.notes || '')

        // Rebuild labour entries
        const newLabourEntries = labours.map((l) => {
          const existing = record.labourEntries.find((e: any) => e.labourId === l.id)
          return {
            labourId: l.id,
            name: l.name,
            designation: l.designation,
            dailyWage: l.dailyWage,
            overtimeRate: l.overtimeRate,
            present: existing?.present || false,
            overtimeHours: existing?.overtimeHours || 0,
          }
        })
        setLabourEntries(newLabourEntries)

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
        setLabourEntries(labours.map((l) => ({ labourId: l.id, name: l.name, designation: l.designation, dailyWage: l.dailyWage, overtimeRate: l.overtimeRate, present: false, overtimeHours: 0 })))
        setMaterialEntries([])
        setOtherEntries([])
      }
    } catch (e) {
      // New record
    } finally {
      setLoading(false)
    }
  }, [siteId, date, labours])

  useEffect(() => { loadExistingRecord() }, [loadExistingRecord])

  // Totals
  const labourTotal = labourEntries.filter(e => e.present).reduce((sum, e) => sum + e.dailyWage + e.overtimeHours * e.overtimeRate, 0)
  const materialTotal = materialEntries.reduce((sum, e) => sum + e.quantity * e.rate, 0)
  const otherTotal = otherEntries.reduce((sum, e) => sum + e.amount, 0)
  const grandTotal = labourTotal + materialTotal + otherTotal

  function toggleLabour(id: string) {
    setLabourEntries(prev => prev.map(e => e.labourId === id ? { ...e, present: !e.present } : e))
  }
  function setOvertime(id: string, hours: number) {
    setLabourEntries(prev => prev.map(e => e.labourId === id ? { ...e, overtimeHours: hours } : e))
  }

  function addMaterial(mat: Material) {
    if (materialEntries.find(e => e.materialId === mat.id)) return
    setMaterialEntries(prev => [...prev, { materialId: mat.id, name: mat.name, unit: mat.unit, quantity: 1, rate: mat.defaultRate }])
  }
  function removeMaterial(id: string) { setMaterialEntries(prev => prev.filter(e => e.materialId !== id)) }
  function updateMaterial(id: string, field: 'quantity' | 'rate', value: number) {
    setMaterialEntries(prev => prev.map(e => e.materialId === id ? { ...e, [field]: value } : e))
  }

  function addOther() { setOtherEntries(prev => [...prev, { category: 'Transport', amount: 0, description: '' }]) }
  function removeOther(i: number) { setOtherEntries(prev => prev.filter((_, idx) => idx !== i)) }
  function updateOther(i: number, field: keyof OtherEntry, value: string | number) {
    setOtherEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  async function handleSave() {
    if (!siteId) { toast.error('Please select a site'); return }
    if (!date) { toast.error('Please select a date'); return }

    setSaving(true)
    try {
      const result = await saveDailyRecord({
        siteId,
        date,
        notes,
        labourEntries: labourEntries.map(e => ({ labourId: e.labourId, present: e.present, overtimeHours: e.overtimeHours })),
        materialEntries: materialEntries.map(e => ({ materialId: e.materialId, quantity: e.quantity, rate: e.rate })),
        otherExpenses: otherEntries.filter(e => e.amount > 0).map(e => ({ category: e.category, amount: e.amount, description: e.description })),
      })

      if (result.success) {
        toast.success(existingRecord ? 'Record updated!' : 'Record saved!')
        setExistingRecord(true)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  const presentCount = labourEntries.filter(e => e.present).length

  const materialsByCategory = materials.reduce((acc, m) => {
    if (!acc[m.category]) acc[m.category] = []
    acc[m.category].push(m)
    return acc
  }, {} as Record<string, Material[]>)

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main Form */}
      <div className="flex-1 space-y-4">
        {/* Site & Date selector */}
        <div className="card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Site *</label>
              <select className="input" value={siteId} onChange={e => setSiteId(e.target.value)}>
                <option value="">Select a site</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name} — {s.location}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          {existingRecord && (
            <div className="mt-3 flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg text-sm">
              <RefreshCw className="w-4 h-4" />
              <span>Editing existing record for this site and date. Saving will overwrite it.</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="card flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading record…
          </div>
        ) : (
          <>
            {/* Section Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
              {[
                { key: 'labour', label: 'Labour', count: presentCount, icon: Users },
                { key: 'material', label: 'Materials', count: materialEntries.length, icon: Package },
                { key: 'other', label: 'Other Expenses', count: otherEntries.length, icon: Coins },
              ].map(({ key, label, count, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key as any)}
                  className={cn('tab-btn flex items-center gap-2', activeSection === key && 'active')}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {count > 0 && (
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-semibold', activeSection === key ? 'bg-primary-100 text-primary-600' : 'bg-gray-200 text-gray-600')}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Labour Section */}
            {activeSection === 'labour' && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-gray-900">Attendance & Labour</h3>
                  <span className="text-sm text-gray-500">{presentCount} present</span>
                </div>

                {labourEntries.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">No labour added yet. Add labour from the Labour module.</p>
                ) : (
                  <div className="space-y-2">
                    {labourEntries.map((entry) => (
                      <div
                        key={entry.labourId}
                        className={cn(
                          'flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border transition-all',
                          entry.present ? 'border-primary-200 bg-primary-50/50' : 'border-gray-100 bg-gray-50/50'
                        )}
                      >
                        <button
                          onClick={() => toggleLabour(entry.labourId)}
                          className={cn(
                            'flex items-center gap-3 flex-1 text-left',
                          )}
                        >
                          <div className={cn(
                            'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                            entry.present ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                          )}>
                            {entry.present && <svg viewBox="0 0 10 8" className="w-3 h-3 fill-white"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </div>
                          <div>
                            <p className={cn('text-sm font-semibold', entry.present ? 'text-gray-900' : 'text-gray-500')}>{entry.name}</p>
                            <p className="text-xs text-gray-400">{entry.designation} · {formatCurrency(entry.dailyWage)}/day</p>
                          </div>
                        </button>

                        {entry.present && (
                          <div className="flex items-center gap-2 sm:justify-end">
                            <label className="text-xs text-gray-500 whitespace-nowrap">OT Hours:</label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={entry.overtimeHours}
                              onChange={(e) => setOvertime(entry.labourId, parseFloat(e.target.value) || 0)}
                              className="input w-20 text-center py-1.5 text-sm"
                            />
                            <span className="text-xs text-primary-600 font-semibold whitespace-nowrap">
                              = {formatCurrency(entry.dailyWage + entry.overtimeHours * entry.overtimeRate)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Material Section */}
            {activeSection === 'material' && (
              <div className="space-y-4">
                {/* Add material */}
                <div className="card">
                  <h3 className="font-display font-semibold text-gray-900 mb-3">Add Materials</h3>
                  <div className="space-y-3">
                    {Object.entries(materialsByCategory).map(([category, mats]) => (
                      <div key={category}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{category}</p>
                        <div className="flex flex-wrap gap-2">
                          {mats.map((mat) => {
                            const added = materialEntries.some(e => e.materialId === mat.id)
                            return (
                              <button
                                key={mat.id}
                                onClick={() => added ? removeMaterial(mat.id) : addMaterial(mat)}
                                className={cn(
                                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                                  added ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                )}
                              >
                                {mat.name}
                                {added && <span className="ml-1">✓</span>}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Material entries */}
                {materialEntries.length > 0 && (
                  <div className="card">
                    <h3 className="font-display font-semibold text-gray-900 mb-3">Material Usage</h3>
                    <div className="space-y-2">
                      {materialEntries.map((entry) => (
                        <div key={entry.materialId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800">{entry.name}</p>
                            <p className="text-xs text-gray-400">{entry.unit}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-500">Qty:</div>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={entry.quantity}
                              onChange={(e) => updateMaterial(entry.materialId, 'quantity', parseFloat(e.target.value) || 0)}
                              className="input w-20 text-center py-1.5 text-sm"
                            />
                            <div className="text-xs text-gray-500">Rate:</div>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={entry.rate}
                              onChange={(e) => updateMaterial(entry.materialId, 'rate', parseFloat(e.target.value) || 0)}
                              className="input w-24 text-center py-1.5 text-sm"
                            />
                            <span className="text-xs font-semibold text-green-600 w-20 text-right">{formatCurrency(entry.quantity * entry.rate)}</span>
                            <button onClick={() => removeMaterial(entry.materialId)} className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Other Expenses */}
            {activeSection === 'other' && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-gray-900">Other Expenses</h3>
                  <button onClick={addOther} className="btn-secondary text-xs py-1.5">
                    <Plus className="w-3.5 h-3.5" />Add Expense
                  </button>
                </div>

                {otherEntries.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">No other expenses. Click "Add Expense" to add transport, fuel, etc.</p>
                ) : (
                  <div className="space-y-3">
                    {otherEntries.map((entry, i) => (
                      <div key={i} className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <label className="label">Category</label>
                          <select className="input" value={entry.category} onChange={e => updateOther(i, 'category', e.target.value)}>
                            {OTHER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="label">Amount (₹)</label>
                          <input className="input" type="number" min="0" value={entry.amount} onChange={e => updateOther(i, 'amount', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="relative">
                          <label className="label">Description</label>
                          <div className="flex gap-2">
                            <input className="input flex-1" value={entry.description} onChange={e => updateOther(i, 'description', e.target.value)} placeholder="Optional" />
                            <button onClick={() => removeOther(i)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="card">
              <label className="label">Notes (Optional)</label>
              <textarea
                className="input resize-none"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional notes for this day…"
              />
            </div>
          </>
        )}
      </div>

      {/* Summary Panel */}
      <div className="lg:w-72 xl:w-80">
        <div className="lg:sticky lg:top-24 space-y-4">
          <div className="card border-2 border-primary-100">
            <h3 className="font-display font-bold text-gray-900 mb-4">Summary</h3>

            <div className="space-y-3">
              {[
                { label: 'Labour', value: labourTotal, items: `${presentCount} workers`, color: 'text-primary-600' },
                { label: 'Materials', value: materialTotal, items: `${materialEntries.length} items`, color: 'text-green-600' },
                { label: 'Other', value: otherTotal, items: `${otherEntries.length} expenses`, color: 'text-amber-600' },
              ].map(({ label, value, items, color }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400">{items}</p>
                  </div>
                  <p className={`font-display font-semibold text-financial ${color}`}>{formatCurrency(value)}</p>
                </div>
              ))}

              <div className="flex items-center justify-between pt-1">
                <p className="font-display font-bold text-gray-900">Grand Total</p>
                <p className="font-display font-bold text-gray-900 text-xl text-financial">{formatCurrency(grandTotal)}</p>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !siteId || loading}
              className="btn-primary w-full justify-center mt-4 py-3 text-base"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
              ) : (
                <><Save className="w-4 h-4" />{existingRecord ? 'Update Record' : 'Save Record'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
