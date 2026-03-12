'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, Package, Coins, Save, Loader2, RefreshCw, X,
  ChevronDown, Eye, Search, Zap, Info, Users,
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

  // Custom categories
  const [customCategories, setCustomCategories] = useState<string[]>(initCustom)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const allCategories = useMemo(() => [...EXPENSE_CATEGORIES, ...customCategories], [customCategories])

  // Materials
  const [materialEntries, setMaterialEntries] = useState<MaterialEntry[]>([])
  const [materialSearch, setMaterialSearch] = useState('')
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false)
  const [showNewMaterial, setShowNewMaterial] = useState(false)
  const [newMat, setNewMat] = useState({ name: '', unit: '', defaultRate: '', category: 'Masonry' })
  const [creatingMat, setCreatingMat] = useState(false)

  // Other expenses
  const [otherEntries, setOtherEntries] = useState<OtherEntry[]>([])
  // Advances loaded from an existing record — read-only, managed via Labour page
  const [storedAdvanceTotal, setStoredAdvanceTotal] = useState(0)
  const [storedAdvanceCount, setStoredAdvanceCount] = useState(0)

  // Load existing record when site or date changes
  const loadExisting = useCallback(async () => {
    if (!siteId || !date) return
    setLoading(true)
    try {
      const record = await getDailyRecord(siteId, date)
      if (record) {
        setExistingRecord(true)
        setNotes(record.notes || '')
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
        // Capture advances separately — they live in Labour page, shown read-only here
        const advances: any[] = (record as any).labourAdvances || []
        setStoredAdvanceTotal(advances.reduce((s: number, a: any) => s + a.amount, 0))
        setStoredAdvanceCount(advances.length)
      } else {
        setExistingRecord(false)
        setNotes('')
        setMaterialEntries([])
        setOtherEntries([])
        setStoredAdvanceTotal(0)
        setStoredAdvanceCount(0)
      }
    } finally {
      setLoading(false)
    }
  }, [siteId, date])

  useEffect(() => { loadExisting() }, [loadExisting])

  const totals = useMemo(() => {
    const material = materialEntries.reduce((s, e) => s + e.quantity * e.rate, 0)
    const other = otherEntries.reduce((s, e) => s + e.amount, 0)
    // storedAdvanceTotal is included in the DB grand total — show it here so the
    // summary matches what is actually stored/saved.
    return { material, other, grand: material + other + storedAdvanceTotal }
  }, [materialEntries, otherEntries, storedAdvanceTotal])

  // --- Material helpers ---
  const filteredMaterials = useMemo(() => {
    if (!materialSearch) return allMaterials
    const q = materialSearch.toLowerCase()
    return allMaterials.filter((m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
  }, [allMaterials, materialSearch])

  function addMaterial(mat: Material) {
    if (materialEntries.find((e) => e.materialId === mat.id)) {
      toast.error('Already added')
      return
    }
    setMaterialEntries((prev) => [
      ...prev,
      { materialId: mat.id, name: mat.name, unit: mat.unit, quantity: 1, rate: mat.defaultRate },
    ])
    setMaterialSearch('')
    setShowMaterialDropdown(false)
  }

  function updateMaterial(idx: number, field: 'quantity' | 'rate', value: number) {
    setMaterialEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)))
  }

  async function handleCreateMaterial() {
    if (!newMat.name || !newMat.unit || !newMat.defaultRate) {
      toast.error('Fill all fields')
      return
    }
    setCreatingMat(true)
    try {
      const res = await quickCreateMaterial({
        name: newMat.name,
        unit: newMat.unit,
        defaultRate: parseFloat(newMat.defaultRate),
        category: newMat.category,
      })
      if (res.success && res.data) {
        setAllMaterials((prev) => [...prev, res.data!])
        addMaterial(res.data!)
        setNewMat({ name: '', unit: '', defaultRate: '', category: 'Masonry' })
        setShowNewMaterial(false)
        toast.success('Material added to catalogue')
      } else {
        toast.error(res.error || 'Failed')
      }
    } finally {
      setCreatingMat(false)
    }
  }

  // --- Other expense helpers ---
  function addOther() {
    setOtherEntries((prev) => [...prev, { category: allCategories[0], amount: 0, description: '' }])
  }

  function addQuickTile(category: string, defaultAmount: number) {
    setOtherEntries((prev) => [...prev, { category, amount: defaultAmount, description: '' }])
  }

  function updateOther(idx: number, field: keyof OtherEntry, value: any) {
    setOtherEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)))
  }

  async function handleAddCategory() {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return
    if (allCategories.includes(trimmed)) { toast.error('Category already exists'); return }
    setAddingCategory(true)
    try {
      const res = await addCustomCategory(trimmed)
      if (res.success) {
        setCustomCategories((prev) => [...prev, trimmed])
        setNewCategoryName('')
        setShowAddCategory(false)
        toast.success(`"${trimmed}" added`)
      } else {
        toast.error(res.error || 'Failed')
      }
    } finally {
      setAddingCategory(false) }
  }

  async function handleSubmit() {
    if (!siteId) { toast.error('Select a site'); return }
    setSaving(true)
    try {
      const res = await saveDailyRecord({
        siteId,
        date,
        notes,
        materialEntries: materialEntries.map((e) => ({
          materialId: e.materialId,
          quantity: e.quantity,
          rate: e.rate,
        })),
        otherExpenses: otherEntries
          .filter((e) => e.amount > 0)
          .map((e) => ({ category: e.category, amount: e.amount, description: e.description })),
      })
      if (res.success) {
        toast.success(existingRecord ? 'Record updated!' : 'Record saved!')
        router.push('/records')
      } else {
        toast.error(res.error || 'Failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    { id: 'material' as const, label: 'Materials', icon: Package, badge: materialEntries.length },
    { id: 'other' as const, label: 'Expenses', icon: Coins, badge: otherEntries.length },
  ]

  return (
    <div className="max-w-3xl space-y-4">
      {/* Info Banner */}
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
        <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Labour attendance is tracked separately in the{' '}
          <a href="/labour" className="font-semibold underline">Labour → Attendance</a> tab.
        </p>
      </div>

      {/* Site + Date */}
      <div className="card grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Construction Site</label>
          <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.location}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()}
          />
        </div>
        {existingRecord && (
          <div className="sm:col-span-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-xl">
            <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
            Updating existing expense record for this date. Labour attendance for this date is unchanged.
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
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-700 rounded-xl w-fit">
            {sections.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={cn('tab-btn flex items-center gap-1.5', activeSection === id && 'active')}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {badge > 0 && (
                  <span
                    className={cn(
                      'text-[11px] px-1.5 py-0.5 rounded-full font-bold',
                      activeSection === id
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400'
                    )}
                  >
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── MATERIALS ──────────────────────────────────────────────── */}
          {activeSection === 'material' && (
            <div className="space-y-3">
              <div className="card space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      className="input pl-9 text-sm"
                      placeholder="Search materials..."
                      value={materialSearch}
                      onChange={(e) => {
                        setMaterialSearch(e.target.value)
                        setShowMaterialDropdown(true)
                      }}
                      onFocus={() => setShowMaterialDropdown(true)}
                    />
                  </div>
                  <button
                    onClick={() => {
                      setShowNewMaterial(!showNewMaterial)
                      setShowMaterialDropdown(false)
                    }}
                    className={cn(
                      'btn-secondary text-xs py-2 whitespace-nowrap',
                      showNewMaterial && 'bg-primary-50 text-primary-600 border-primary-200'
                    )}
                  >
                    <Plus className="w-3.5 h-3.5" /> New
                  </button>
                </div>

                {/* Search dropdown */}
                {showMaterialDropdown && materialSearch && (
                  <div className="border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden shadow-lg">
                    {filteredMaterials.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">
                        No match —{' '}
                        <button
                          onClick={() => {
                            setShowNewMaterial(true)
                            setShowMaterialDropdown(false)
                          }}
                          className="text-primary-500 font-semibold"
                        >
                          create "{materialSearch}"?
                        </button>
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-700">
                        {filteredMaterials.map((mat) => (
                          <button
                            key={mat.id}
                            onClick={() => addMaterial(mat)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{mat.name}</p>
                              <p className="text-xs text-gray-400 dark:text-slate-500">
                                {mat.category} · {mat.unit}
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 ml-3">
                              {formatCurrency(mat.defaultRate)}/{mat.unit}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Inline new material form */}
                {showNewMaterial && (
                  <div className="bg-primary-50/50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                      Add to Catalogue & Use
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="label text-xs">Material Name *</label>
                        <input
                          className="input text-sm"
                          value={newMat.name}
                          onChange={(e) => setNewMat((p) => ({ ...p, name: e.target.value }))}
                          placeholder="e.g. Chalk Piece, Plywood Sheet"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Category</label>
                        <select
                          className="input text-sm"
                          value={newMat.category}
                          onChange={(e) => setNewMat((p) => ({ ...p, category: e.target.value }))}
                        >
                          {MATERIAL_CATEGORIES.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">Unit *</label>
                        <input
                          className="input text-sm"
                          value={newMat.unit}
                          onChange={(e) => setNewMat((p) => ({ ...p, unit: e.target.value }))}
                          placeholder="Nos, Kg, Bag..."
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Default Rate (₹) *</label>
                        <input
                          className="input text-sm"
                          type="number"
                          value={newMat.defaultRate}
                          onChange={(e) => setNewMat((p) => ({ ...p, defaultRate: e.target.value }))}
                          placeholder="0"
                          min={0}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleCreateMaterial} disabled={creatingMat} className="btn-primary text-xs py-2">
                        {creatingMat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Add & Use
                      </button>
                      <button onClick={() => setShowNewMaterial(false)} className="btn-secondary text-xs py-2">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Catalogue tiles */}
                {!showMaterialDropdown && !showNewMaterial && allMaterials.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">Catalogue</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {allMaterials.map((mat) => {
                        const added = !!materialEntries.find((e) => e.materialId === mat.id)
                        return (
                          <button
                            key={mat.id}
                            onClick={() => addMaterial(mat)}
                            disabled={added}
                            className={cn(
                              'p-2.5 rounded-xl border text-left text-xs transition-all',
                              added
                                ? 'border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-primary-500 cursor-default'
                                : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-primary-300 hover:bg-primary-50/30'
                            )}
                          >
                            <p className="font-semibold text-gray-800 dark:text-slate-200 truncate">{mat.name}</p>
                            <p className="text-gray-400 dark:text-slate-500 mt-0.5">
                              {mat.unit} · {formatCurrency(mat.defaultRate)}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Added materials list */}
              {materialEntries.length > 0 && (
                <div className="card space-y-3">
                  <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">Added Materials</p>
                  {materialEntries.map((entry, idx) => (
                    <div key={entry.materialId} className="p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{entry.name}</p>
                          <p className="text-xs text-gray-400">{entry.unit}</p>
                        </div>
                        <button
                          onClick={() => setMaterialEntries((p) => p.filter((_, i) => i !== idx))}
                          className="p-1 text-gray-300 hover:text-red-500 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-400 uppercase tracking-wide">
                            Qty ({entry.unit})
                          </label>
                          <input
                            type="number"
                            className="input py-1.5 text-sm text-right"
                            value={entry.quantity}
                            onChange={(e) => updateMaterial(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            min={0}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Rate (₹)</label>
                          <input
                            type="number"
                            className="input py-1.5 text-sm text-right"
                            value={entry.rate}
                            onChange={(e) => updateMaterial(idx, 'rate', parseFloat(e.target.value) || 0)}
                            min={0}
                          />
                        </div>
                        <div className="flex-1 text-right">
                          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Total</label>
                          <p className="text-sm font-bold text-gray-700 dark:text-slate-200 mt-1.5">
                            {formatCurrency(entry.quantity * entry.rate)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1 border-t border-gray-100 dark:border-slate-700">
                    <span className="text-sm text-gray-500">Material Total</span>
                    <span className="font-display font-bold text-gray-900 dark:text-white">
                      {formatCurrency(totals.material)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── OTHER EXPENSES ──────────────────────────────────────────── */}
          {activeSection === 'other' && (
            <div className="space-y-3">
              {/* Quick tiles */}
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Quick Add
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUICK_ADD_TILES.map((tile) => (
                    <button
                      key={tile.label}
                      onClick={() => addQuickTile(tile.category, tile.defaultAmount)}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-all text-center group"
                    >
                      <span className="text-lg">{tile.emoji}</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-slate-300 group-hover:text-amber-700 dark:group-hover:text-amber-400">
                        {tile.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Expense entries */}
              <div className="card space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">Expenses</p>
                  <button onClick={addOther} className="btn-secondary text-xs py-1.5 px-3">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {otherEntries.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
                    Use quick-add above or click "Add" for custom expenses.
                  </p>
                ) : (
                  <>
                    {otherEntries.map((entry, idx) => (
                      <div key={idx} className="rounded-xl bg-gray-50 dark:bg-slate-700/50 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <select
                            className="input flex-1 py-2 text-sm"
                            value={entry.category}
                            onChange={(e) => updateOther(idx, 'category', e.target.value)}
                          >
                            {allCategories.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            className="input w-28 py-2 text-right text-sm flex-shrink-0"
                            placeholder="₹ Amount"
                            value={entry.amount || ''}
                            onChange={(e) => updateOther(idx, 'amount', parseFloat(e.target.value) || 0)}
                            min={0}
                          />
                          <button
                            onClick={() => setOtherEntries((p) => p.filter((_, i) => i !== idx))}
                            className="p-2 text-gray-300 hover:text-red-500 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          className="input py-2 text-sm w-full"
                          placeholder="Description (e.g. Tea for workers, Petrol Vengadamangalam)"
                          value={entry.description}
                          onChange={(e) => updateOther(idx, 'description', e.target.value)}
                        />
                      </div>
                    ))}
                    <div className="flex justify-between pt-1 border-t border-gray-100 dark:border-slate-700">
                      <span className="text-sm text-gray-500">Other Total</span>
                      <span className="font-display font-bold text-gray-900 dark:text-white">
                        {formatCurrency(totals.other)}
                      </span>
                    </div>
                  </>
                )}

                {/* Add custom category */}
                <div className="pt-2 border-t border-dashed border-gray-200 dark:border-slate-600">
                  {!showAddCategory ? (
                    <button
                      onClick={() => setShowAddCategory(true)}
                      className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add custom category
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        className="input flex-1 py-2 text-sm"
                        placeholder="New category name..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddCategory()
                          if (e.key === 'Escape') setShowAddCategory(false)
                        }}
                        autoFocus
                      />
                      <button onClick={handleAddCategory} disabled={addingCategory} className="btn-primary text-xs py-2 px-3">
                        {addingCategory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddCategory(false)
                          setNewCategoryName('')
                        }}
                        className="btn-secondary text-xs py-2 px-2"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="card">
            <label className="label">Notes (optional)</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any site remarks for this day..."
            />
          </div>

          {/* Summary */}
          <div className="card border-primary-100 dark:border-primary-800">
            <button onClick={() => setShowSummary(!showSummary)} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary-500" />
                <span className="font-semibold text-gray-900 dark:text-white">Summary</span>
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
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Materials ({materialEntries.length} items)</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(totals.material)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Other Expenses ({otherEntries.length})</span>
                  <span className="font-semibold text-amber-600">{formatCurrency(totals.other)}</span>
                </div>
                {storedAdvanceCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Labour Advances ({storedAdvanceCount}) <span className="text-xs text-gray-400">— manage in Labour page</span>
                    </span>
                    <span className="font-semibold text-orange-600">{formatCurrency(storedAdvanceTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100 dark:border-slate-700">
                  <span className="text-gray-900 dark:text-white">Grand Total (excl. unpaid wages)</span>
                  <span className="text-primary-600 font-display">{formatCurrency(totals.grand)}</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Unpaid wages are added to the total when salary is paid via Labour → Payments.
                </p>
              </div>
            )}
          </div>

          <button onClick={handleSubmit} disabled={saving} className="btn-primary w-full justify-center py-3 text-base">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {existingRecord ? 'Update Expenses' : 'Save Expenses'}
          </button>
        </>
      )}
    </div>
  )
}
