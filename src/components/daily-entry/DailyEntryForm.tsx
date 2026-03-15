'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Plus, Package, Coins, Save, Loader2, RefreshCw, X,
  ChevronDown, Eye, Search, Zap, Users, CheckCircle2,
} from 'lucide-react'
import { saveDailyRecord, getDailyRecord } from '@/actions/daily-records'
import { quickCreateMaterial } from '@/actions/materials'
import { addCustomCategory } from '@/actions/settings'
import { formatCurrency } from '@/lib/utils'
import { EXPENSE_CATEGORIES, MATERIAL_CATEGORIES, QUICK_ADD_TILES } from '@/lib/constants'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Material { id: string; name: string; unit: string; defaultRate: number; category: string }
interface Site { id: string; name: string; location: string }
interface MaterialEntry { materialId: string; name: string; unit: string; quantity: number; rate: number }
interface OtherEntry { category: string; amount: number; description: string }

interface Props {
  sites: Site[]
  materials: Material[]
  customCategories: string[]
  defaultSiteId?: string
  defaultDate: string
}

export function DailyEntryForm({
  sites,
  materials: initialMaterials,
  customCategories: initCustom,
  defaultSiteId,
  defaultDate,
}: Props) {
  const router = useRouter()
  const [siteId, setSiteId] = useState(defaultSiteId || sites[0]?.id || '')
  const [date, setDate] = useState(defaultDate)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<'material' | 'other'>('material')
  const [showSummary, setShowSummary] = useState(false)
  const [existingRecord, setExistingRecord] = useState(false)
  const [allMaterials, setAllMaterials] = useState<Material[]>(initialMaterials)

  const [customCategories, setCustomCategories] = useState<string[]>(initCustom)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const allCategories = useMemo(() => [...EXPENSE_CATEGORIES, ...customCategories], [customCategories])

  const [materialEntries, setMaterialEntries] = useState<MaterialEntry[]>([])
  const [materialSearch, setMaterialSearch] = useState('')
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false)
  const [showNewMaterial, setShowNewMaterial] = useState(false)
  const [newMat, setNewMat] = useState({ name: '', unit: '', defaultRate: '', category: 'Masonry' })
  const [creatingMat, setCreatingMat] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const [otherEntries, setOtherEntries] = useState<OtherEntry[]>([])
  const [storedAdvanceTotal, setStoredAdvanceTotal] = useState(0)
  const [storedAdvanceCount, setStoredAdvanceCount] = useState(0)

  // Close search dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowMaterialDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const loadExisting = useCallback(async () => {
    if (!siteId || !date) return
    setLoading(true)
    try {
      const record = await getDailyRecord(siteId, date)
      if (record) {
        setExistingRecord(true)
        setNotes(record.notes || '')
        setMaterialEntries(record.materialEntries.map((e: any) => ({
          materialId: e.materialId, name: e.material.name,
          unit: e.material.unit, quantity: e.quantity, rate: e.rate,
        })))
        setOtherEntries(record.otherExpenses.map((e: any) => ({
          category: e.category, amount: e.amount, description: e.description || '',
        })))
        const advances: any[] = (record as any).labourAdvances || []
        setStoredAdvanceTotal(advances.reduce((s: number, a: any) => s + a.amount, 0))
        setStoredAdvanceCount(advances.length)
      } else {
        setExistingRecord(false); setNotes(''); setMaterialEntries([])
        setOtherEntries([]); setStoredAdvanceTotal(0); setStoredAdvanceCount(0)
      }
    } finally { setLoading(false) }
  }, [siteId, date])

  useEffect(() => { loadExisting() }, [loadExisting])

  const totals = useMemo(() => {
    const material = materialEntries.reduce((s, e) => s + e.quantity * e.rate, 0)
    const other = otherEntries.reduce((s, e) => s + e.amount, 0)
    return { material, other, grand: material + other + storedAdvanceTotal }
  }, [materialEntries, otherEntries, storedAdvanceTotal])

  const filteredMaterials = useMemo(() => {
    if (!materialSearch) return allMaterials
    const q = materialSearch.toLowerCase()
    return allMaterials.filter(m => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
  }, [allMaterials, materialSearch])

  function addMaterial(mat: Material) {
    if (materialEntries.find(e => e.materialId === mat.id)) { toast.error('Already added'); return }
    setMaterialEntries(prev => [...prev, { materialId: mat.id, name: mat.name, unit: mat.unit, quantity: 1, rate: mat.defaultRate }])
    setMaterialSearch(''); setShowMaterialDropdown(false)
  }

  function updateMaterial(idx: number, field: 'quantity' | 'rate', value: number) {
    setMaterialEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  async function handleCreateMaterial() {
    if (!newMat.name || !newMat.unit || !newMat.defaultRate) { toast.error('Fill all fields'); return }
    setCreatingMat(true)
    try {
      const res = await quickCreateMaterial({ name: newMat.name, unit: newMat.unit, defaultRate: parseFloat(newMat.defaultRate), category: newMat.category })
      if (res.success && res.data) {
        setAllMaterials(prev => [...prev, res.data!])
        addMaterial(res.data!)
        setNewMat({ name: '', unit: '', defaultRate: '', category: 'Masonry' })
        setShowNewMaterial(false)
        toast.success('Material added to catalogue')
      } else toast.error(res.error || 'Failed')
    } finally { setCreatingMat(false) }
  }

  function addOther() { setOtherEntries(prev => [...prev, { category: allCategories[0], amount: 0, description: '' }]) }
  function addQuickTile(category: string, defaultAmount: number) { setOtherEntries(prev => [...prev, { category, amount: defaultAmount, description: '' }]) }
  function updateOther(idx: number, field: keyof OtherEntry, value: any) { setOtherEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e)) }

  async function handleAddCategory() {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return
    if (allCategories.includes(trimmed)) { toast.error('Category already exists'); return }
    setAddingCategory(true)
    try {
      const res = await addCustomCategory(trimmed)
      if (res.success) { setCustomCategories(prev => [...prev, trimmed]); setNewCategoryName(''); setShowAddCategory(false); toast.success(`"${trimmed}" added`) }
      else toast.error(res.error || 'Failed')
    } finally { setAddingCategory(false) }
  }

  async function handleSubmit() {
    if (!siteId) { toast.error('Select a site'); return }
    setSaving(true)
    try {
      const res = await saveDailyRecord({
        siteId, date, notes,
        materialEntries: materialEntries.map(e => ({ materialId: e.materialId, quantity: e.quantity, rate: e.rate })),
        otherExpenses: otherEntries.filter(e => e.amount > 0).map(e => ({ category: e.category, amount: e.amount, description: e.description })),
      })
      if (res.success) { toast.success(existingRecord ? 'Record updated!' : 'Record saved!'); router.push('/records') }
      else toast.error(res.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  const sections = [
    { id: 'material' as const, label: 'Materials', icon: Package, badge: materialEntries.length },
    { id: 'other' as const, label: 'Expenses', icon: Coins, badge: otherEntries.length },
  ]

  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()

  return (
    <div className="max-w-3xl space-y-5">

      {/* ── Info Banner ─────────────────────────────────────────────── */}
      <div className="alert-info flex items-center gap-3">
        <Users className="w-4 h-4 flex-shrink-0" style={{ color: '#1e40af' }} />
        <p className="text-sm">
          Labour attendance is tracked separately in the{' '}
          <a href="/labour" className="font-semibold underline">Labour → Attendance</a> tab.
        </p>
      </div>

      {/* ── Site + Date ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Construction Site</label>
            <select className="input" value={siteId} onChange={e => setSiteId(e.target.value)}>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name} — {s.location}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} max={todayStr} />
          </div>
        </div>
        {existingRecord && (
          <div className="mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
            style={{ color: 'var(--text-secondary)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <RefreshCw className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
            <span>Updating existing record for this date. Labour attendance is unchanged.</span>
          </div>
        )}
      </div>

      {/* ── Main content with loading overlay ───────────────────────── */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl"
            style={{ background: 'var(--surface-0)', opacity: 0.9 }}>
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--brand)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Loading record…</p>
          </div>
        )}

        <div className={cn('space-y-4', loading && 'pointer-events-none select-none opacity-25')}>

          {/* ── Section Tabs ──────────────────────────────────────── */}
          <div className="tab-bar w-fit">
            {sections.map(({ id, label, icon: Icon, badge }) => (
              <button key={id} onClick={() => setActiveSection(id)} className={cn('tab-btn flex items-center gap-1.5', activeSection === id && 'active')}>
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
                {badge > 0 && (
                  <span className={cn('text-[11px] px-1.5 py-0.5 rounded-full font-bold',
                    activeSection === id ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400')}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ══ MATERIALS ══════════════════════════════════════════════ */}
          {activeSection === 'material' && (
            <div className="space-y-4">
              <div className="card space-y-4">

                {/* Search + New button */}
                <div className="flex items-center gap-2" ref={searchRef}>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    <input
                      className="input pl-9"
                      placeholder="Search catalogue…"
                      value={materialSearch}
                      onChange={e => { setMaterialSearch(e.target.value); setShowMaterialDropdown(true) }}
                      onFocus={() => setShowMaterialDropdown(true)}
                    />
                    {/* Search dropdown — uses .dropdown design system class */}
                    {showMaterialDropdown && materialSearch && (
                      <div className="dropdown absolute left-0 right-0 top-full">
                        {filteredMaterials.length === 0 ? (
                          <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                            No match —{' '}
                            <button onClick={() => { setShowNewMaterial(true); setShowMaterialDropdown(false) }}
                              className="font-semibold" style={{ color: 'var(--brand)' }}>
                              create "{materialSearch}"?
                            </button>
                          </div>
                        ) : (
                          <div className="max-h-52 overflow-y-auto">
                            {filteredMaterials.map(mat => (
                              <button key={mat.id} onClick={() => addMaterial(mat)} className="dropdown-item w-full">
                                <div className="flex-1 text-left">
                                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{mat.name}</p>
                                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{mat.category} · {mat.unit}</p>
                                </div>
                                <span className="text-xs font-semibold flex-shrink-0 ml-3" style={{ color: 'var(--text-secondary)' }}>
                                  {formatCurrency(mat.defaultRate)}/{mat.unit}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setShowNewMaterial(!showNewMaterial); setShowMaterialDropdown(false) }}
                    className={cn('btn-secondary whitespace-nowrap', showNewMaterial && 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border-primary-200 dark:border-primary-800')}
                  >
                    <Plus className="w-3.5 h-3.5" /><span>New</span>
                  </button>
                </div>

                {/* Inline new material form */}
                {showNewMaterial && (
                  <div className="rounded-xl p-4 space-y-3"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border-base)' }}>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--brand)' }}>
                      Add to Catalogue &amp; Use
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="label">Material Name *</label>
                        <input className="input" value={newMat.name} onChange={e => setNewMat(p => ({ ...p, name: e.target.value }))}
                          placeholder="e.g. Chalk Piece, Plywood Sheet" autoFocus />
                      </div>
                      <div>
                        <label className="label">Category</label>
                        <select className="input" value={newMat.category} onChange={e => setNewMat(p => ({ ...p, category: e.target.value }))}>
                          {MATERIAL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Unit *</label>
                        <input className="input" value={newMat.unit} onChange={e => setNewMat(p => ({ ...p, unit: e.target.value }))} placeholder="Nos, Kg, Bag…" />
                      </div>
                      <div className="col-span-2">
                        <label className="label">Default Rate (₹) *</label>
                        <input className="input" type="number" value={newMat.defaultRate}
                          onChange={e => setNewMat(p => ({ ...p, defaultRate: e.target.value }))} placeholder="0" min={0} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleCreateMaterial} disabled={creatingMat} className="btn-primary">
                        {creatingMat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        <span>Add &amp; Use</span>
                      </button>
                      <button onClick={() => setShowNewMaterial(false)} className="btn-secondary"><span>Cancel</span></button>
                    </div>
                  </div>
                )}

                {/* Catalogue grid */}
                {!showMaterialDropdown && !showNewMaterial && allMaterials.length > 0 && (
                  <div>
                    <p className="label mb-2">Catalogue</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {allMaterials.map(mat => {
                        const added = !!materialEntries.find(e => e.materialId === mat.id)
                        return (
                          <button key={mat.id} onClick={() => addMaterial(mat)} disabled={added}
                            className="p-3 rounded-xl text-left text-sm transition-all"
                            style={{
                              background: added ? 'rgba(91,106,240,0.07)' : 'var(--surface-1)',
                              border: `1px solid ${added ? 'rgba(91,106,240,0.25)' : 'var(--border-base)'}`,
                              cursor: added ? 'default' : 'pointer',
                            }}>
                            <div className="flex items-start justify-between gap-1">
                              <p className="font-semibold text-sm truncate leading-tight"
                                style={{ color: added ? 'var(--brand)' : 'var(--text-primary)' }}>
                                {mat.name}
                              </p>
                              {added && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--brand)' }} />}
                            </div>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                              {mat.unit} · {formatCurrency(mat.defaultRate)}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {allMaterials.length === 0 && !showNewMaterial && (
                  <div className="empty-state py-8">
                    <div className="empty-state-icon"><Package className="w-5 h-5" /></div>
                    <p className="empty-state-title">No materials yet</p>
                    <p className="empty-state-desc">Click <strong>New</strong> to add your first material.</p>
                  </div>
                )}
              </div>

              {/* Added materials list */}
              {materialEntries.length > 0 && (
                <div className="card space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="section-title">Added Materials</p>
                    <span className="badge badge-blue">{materialEntries.length} item{materialEntries.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-2">
                    {materialEntries.map((entry, idx) => (
                      <div key={entry.materialId} className="p-3 rounded-xl space-y-3"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{entry.name}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{entry.unit}</p>
                          </div>
                          <button onClick={() => setMaterialEntries(p => p.filter((_, i) => i !== idx))} className="btn-icon" title="Remove">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="label">Qty ({entry.unit})</label>
                            <input type="number" className="input text-right" value={entry.quantity}
                              onChange={e => updateMaterial(idx, 'quantity', parseFloat(e.target.value) || 0)} min={0} />
                          </div>
                          <div>
                            <label className="label">Rate (₹)</label>
                            <input type="number" className="input text-right" value={entry.rate}
                              onChange={e => updateMaterial(idx, 'rate', parseFloat(e.target.value) || 0)} min={0} />
                          </div>
                          <div>
                            <label className="label">Total</label>
                            <div className="input flex items-center justify-end font-semibold pointer-events-none"
                              style={{ color: 'var(--text-primary)', background: 'var(--surface-3)' }}>
                              {formatCurrency(entry.quantity * entry.rate)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Material Total</span>
                    <span className="text-base font-bold amount-neutral">{formatCurrency(totals.material)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ OTHER EXPENSES ══════════════════════════════════════════ */}
          {activeSection === 'other' && (
            <div className="space-y-4">
              {/* Quick-add tiles */}
              <div className="card space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <p className="section-title">Quick Add</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUICK_ADD_TILES.map(tile => (
                    <button key={tile.label} onClick={() => addQuickTile(tile.category, tile.defaultAmount)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border-base)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.5)'; (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.06)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-base)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)' }}>
                      <span className="text-xl leading-none">{tile.emoji}</span>
                      <span className="text-xs font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{tile.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Expense entries */}
              <div className="card space-y-3">
                <div className="flex items-center justify-between">
                  <p className="section-title">Expenses</p>
                  <button onClick={addOther} className="btn-secondary">
                    <Plus className="w-3.5 h-3.5" /><span>Add Row</span>
                  </button>
                </div>

                {otherEntries.length === 0 ? (
                  <div className="empty-state py-8">
                    <div className="empty-state-icon"><Coins className="w-5 h-5" /></div>
                    <p className="empty-state-title">No expenses yet</p>
                    <p className="empty-state-desc">Use Quick Add above or click Add Row.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {otherEntries.map((entry, idx) => (
                        <div key={idx} className="p-3 rounded-xl space-y-2"
                          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                          <div className="flex items-center gap-2">
                            <select className="input flex-1" value={entry.category} onChange={e => updateOther(idx, 'category', e.target.value)}>
                              {allCategories.map(c => <option key={c}>{c}</option>)}
                            </select>
                            <div className="relative flex-shrink-0">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none" style={{ color: 'var(--text-muted)' }}>₹</span>
                              <input type="number" className="input w-28 pl-7 text-right" placeholder="0"
                                value={entry.amount || ''} onChange={e => updateOther(idx, 'amount', parseFloat(e.target.value) || 0)} min={0} />
                            </div>
                            <button onClick={() => setOtherEntries(p => p.filter((_, i) => i !== idx))} className="btn-icon flex-shrink-0" title="Remove">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <input className="input" placeholder="Description (e.g. Tea for workers, Petrol to site)"
                            value={entry.description} onChange={e => updateOther(idx, 'description', e.target.value)} />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Other Total</span>
                      <span className="text-base font-bold amount-neutral">{formatCurrency(totals.other)}</span>
                    </div>
                  </>
                )}

                {/* Add custom category */}
                <div className="pt-3" style={{ borderTop: '1px dashed var(--border-base)' }}>
                  {!showAddCategory ? (
                    <button onClick={() => setShowAddCategory(true)} className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--brand)' }}>
                      <Plus className="w-3 h-3" /><span>Add custom category</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input className="input flex-1" placeholder="New category name…" value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') setShowAddCategory(false) }}
                        autoFocus />
                      <button onClick={handleAddCategory} disabled={addingCategory} className="btn-primary">
                        {addingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save</span>}
                      </button>
                      <button onClick={() => { setShowAddCategory(false); setNewCategoryName('') }} className="btn-icon">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Notes ──────────────────────────────────────────────── */}
          <div className="card">
            <label className="label">Notes (optional)</label>
            <textarea className="input resize-none" rows={2} value={notes}
              onChange={e => setNotes(e.target.value)} placeholder="Any site remarks for this day…" />
          </div>

          {/* ── Summary ────────────────────────────────────────────── */}
          <div className="card" style={{ borderColor: totals.grand > 0 ? 'rgba(91,106,240,0.25)' : 'var(--border-subtle)' }}>
            <button onClick={() => setShowSummary(!showSummary)} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Summary</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold" style={{ color: 'var(--brand)' }}>{formatCurrency(totals.grand)}</span>
                <ChevronDown className={cn('w-4 h-4 transition-transform', showSummary && 'rotate-180')} style={{ color: 'var(--text-muted)' }} />
              </div>
            </button>

            {showSummary && (
              <div className="mt-4 pt-4 space-y-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>Materials ({materialEntries.length} item{materialEntries.length !== 1 ? 's' : ''})</span>
                  <span className="font-semibold amount-positive">{formatCurrency(totals.material)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>Other Expenses ({otherEntries.length})</span>
                  <span className="font-semibold" style={{ color: '#d97706' }}>{formatCurrency(totals.other)}</span>
                </div>
                {storedAdvanceCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Labour Advances ({storedAdvanceCount}){' '}
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>— manage in Labour</span>
                    </span>
                    <span className="font-semibold" style={{ color: '#ea580c' }}>{formatCurrency(storedAdvanceTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    Grand Total
                    <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>(excl. unpaid wages)</span>
                  </span>
                  <span className="text-lg font-bold" style={{ color: 'var(--brand)' }}>{formatCurrency(totals.grand)}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Unpaid wages are added to the total when salary is paid via Labour → Payments.
                </p>
              </div>
            )}
          </div>

          {/* ── Submit ─────────────────────────────────────────────── */}
          <button onClick={handleSubmit} disabled={saving} className="btn-primary btn-primary--lg w-full justify-center">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>{existingRecord ? 'Update Expenses' : 'Save Expenses'}</span>
          </button>

        </div>
      </div>
    </div>
  )
}
