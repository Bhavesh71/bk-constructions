'use client'

import { useState, useEffect } from 'react'
import {
  Plus, Edit2, Trash2, X, Loader2, CreditCard, Wallet, Pencil,
  CheckCircle, Calendar, Users, CalendarCheck, ClipboardList, Info,
  AlertTriangle, UserCheck, History, RefreshCw, Clock,
} from 'lucide-react'
import { formatCurrency, parseLocalDate, formatDate, formatDateInput, cn } from '@/lib/utils'
import {
  createLabour, updateLabour, deleteLabour, reactivateLabour,
  addLabourAdvance, editLabourAdvance, deleteLabourAdvance,
  recordWeeklySalary, getUnpaidSummary, getLabourAdvancesAll,
  getAttendanceSheet,
} from '@/actions/labour'
import { saveAttendance } from '@/actions/daily-records'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────
interface Labour {
  id: string; name: string; designation: string; dailyWage: number
  active: boolean; labourType: string
  totalEarnings: number; unpaidDays: number; unpaidWage: number
  thisWeekDays: number; thisWeekWage: number; pendingAdvance: number
}
interface Site { id: string; name: string; location: string }

// ── Advance History Modal ─────────────────────────────────────────────────
function AdvanceHistoryModal({ labour, onClose }: { labour: Labour; onClose: () => void }) {
  const router = useRouter()
  const [advances, setAdvances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editReason, setEditReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getLabourAdvancesAll(labour.id)
      .then((data) => setAdvances(data))
      .catch(() => toast.error('Failed to load advances'))
      .finally(() => setLoading(false))
  }, [labour.id])

  function startEdit(adv: any) {
    setEditingId(adv.id)
    setEditAmount(String(adv.amount))
    setEditReason(adv.reason || '')
  }

  async function handleEdit(id: string) {
    if (!editAmount || parseFloat(editAmount) <= 0) { toast.error('Enter valid amount'); return }
    setSaving(true)
    try {
      const res = await editLabourAdvance(id, { amount: parseFloat(editAmount), reason: editReason })
      if (res.success) {
        setAdvances((prev) => prev.map((a) => a.id === id ? { ...a, amount: parseFloat(editAmount), reason: editReason } : a))
        setEditingId(null)
        toast.success('Advance updated')
        router.refresh()
      } else toast.error(res.error || 'Failed')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string, amount: number) {
    if (!confirm(`Delete advance of ${formatCurrency(amount)}? This cannot be undone.`)) return
    const res = await deleteLabourAdvance(id)
    if (res.success) {
      setAdvances((prev) => prev.filter((a) => a.id !== id))
      toast.success('Advance deleted')
      router.refresh()
    } else {
      toast.error(res.error || 'Settled advances cannot be deleted')
    }
  }

  const pending = advances.filter((a) => !a.isSettled)
  const settled = advances.filter((a) => a.isSettled)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
          <div>
            <h3 className="font-display font-bold text-gray-900 dark:text-white">Advance History</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{labour.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
        ) : advances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
              <History className="w-5 h-5 text-gray-300 dark:text-slate-600" />
            </div>
            <p className="text-sm text-gray-400">No advances recorded for {labour.name}</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
            {pending.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">
                  Pending ({pending.length}) · {formatCurrency(pending.reduce((s, a) => s + a.amount, 0))}
                </p>
                <div className="space-y-2">
                  {pending.map((adv) => (
                    <div key={adv.id} className="rounded-xl border border-red-100 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 p-3">
                      {editingId === adv.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-400 uppercase">Amount (₹)</label>
                              <input className="input py-1.5 text-sm" type="number" value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)} autoFocus />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 uppercase">Reason</label>
                              <input className="input py-1.5 text-sm" value={editReason}
                                onChange={(e) => setEditReason(e.target.value)} placeholder="Optional" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEdit(adv.id)} disabled={saving}
                              className="btn-primary text-xs py-1.5 flex-1 justify-center">
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Changes'}
                            </button>
                            <button onClick={() => setEditingId(null)} className="btn-secondary text-xs py-1.5">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-red-600 dark:text-red-400">{formatCurrency(adv.amount)}</p>
                            {adv.reason && <p className="text-xs text-gray-500 mt-0.5">{adv.reason}</p>}
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(adv.createdAt).toLocaleDateString('en-IN')}</p>
                            {adv.dailyRecord && (
                              <p className="text-xs text-blue-400 mt-0.5 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {adv.dailyRecord.site?.name} · {parseLocalDate(adv.dailyRecord.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => startEdit(adv)}
                              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 transition-colors" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(adv.id, adv.amount)}
                              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {settled.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Settled ({settled.length}) · {formatCurrency(settled.reduce((s, a) => s + a.amount, 0))}
                </p>
                {settled.map((adv) => (
                  <div key={adv.id} className="rounded-xl border border-gray-100 dark:border-slate-700 p-3 opacity-60 mb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-500 line-through">{formatCurrency(adv.amount)}</p>
                        {adv.reason && <p className="text-xs text-gray-400">{adv.reason}</p>}
                        <p className="text-xs text-gray-400">{new Date(adv.createdAt).toLocaleDateString('en-IN')}</p>
                        {adv.dailyRecord && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {adv.dailyRecord.site?.name}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Settled
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Give Advance Modal ────────────────────────────────────────────────────
function GiveAdvanceModal({ labour, sites, onClose }: { labour: Labour; sites: Site[]; onClose: () => void }) {
  const router = useRouter()
  // Local date (not UTC) so IST users see the correct calendar date as default
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [siteId, setSiteId] = useState(sites[0]?.id || '')
  const [date, setDate] = useState(today)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!amount || parseFloat(amount) <= 0) { toast.error('Enter a valid amount'); return }
    if (!siteId) { toast.error('Please select a site'); return }
    setSaving(true)
    try {
      const res = await addLabourAdvance({
        labourId: labour.id,
        amount: parseFloat(amount),
        reason,
        siteId,
        date,
      })
      if (res.success) {
        toast.success(`Advance of ${formatCurrency(parseFloat(amount))} recorded and added to daily expenses`)
        router.refresh()
        onClose()
      } else toast.error(res.error || 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box p-6 space-y-4 max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-gray-900 dark:text-white">Give Advance</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
          <CreditCard className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <div className="text-sm text-orange-700 dark:text-orange-300">
            <span className="font-semibold">{labour.name}</span>
            <span className="text-xs ml-1">· Daily wage: {formatCurrency(labour.dailyWage)}</span>
            {labour.pendingAdvance > 0 && (
              <p className="text-xs mt-0.5">Existing pending advance: <span className="font-bold">{formatCurrency(labour.pendingAdvance)}</span></p>
            )}
          </div>
        </div>

        <div>
          <label className="label">Advance Amount (₹) *</label>
          <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount" min={1} autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
          {/* Smart warning: advance > daily wage */}
          {parseFloat(amount) > 0 && parseFloat(amount) > labour.dailyWage && (
            <div className="mt-2 flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Advance exceeds daily wage ({formatCurrency(labour.dailyWage)})
                </p>
                {parseFloat(amount) > labour.dailyWage * 7 ? (
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                    This is more than a week's pay — make sure this is intentional.
                  </p>
                ) : (
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                    Equivalent to {(parseFloat(amount) / labour.dailyWage).toFixed(1)} days of work. Proceed if approved.
                  </p>
                )}
              </div>
            </div>
          )}
          {/* Warning: existing advance + new one > week's wage */}
          {parseFloat(amount) > 0 && (labour.pendingAdvance + parseFloat(amount)) > labour.dailyWage * 6 && (
            <p className="text-[10px] text-red-500 mt-1.5 font-medium">
              ⚠ Total pending advances ({formatCurrency(labour.pendingAdvance + parseFloat(amount))}) will exceed 6 days of wages.
            </p>
          )}
        </div>

        <div>
          <label className="label">Reason (optional)</label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Medical, Personal, Festival" />
        </div>

        {/* Site + Date — always recorded as expense so it hits budget immediately */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Recorded to daily spending immediately — impacts budget & totals</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Site *</label>
              <select className="input py-1.5 text-sm" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Date *</label>
              <input
                className="input py-1.5 text-sm"
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Record Advance
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Pay Week Modal ────────────────────────────────────────────────────────
// BUG-1 FIX: Added confirmPay state + two-step confirmation flow
// SCROLL FIX: Modal now scrolls when attendance list is long
function PayModal({ labour, onClose }: { labour: Labour; onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [weekData, setWeekData] = useState<any>(null)
  const [selectedAdvances, setSelectedAdvances] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [confirmPay, setConfirmPay] = useState(false)  // BUG-1 FIX

  useEffect(() => {
    getUnpaidSummary(labour.id)
      .then((data) => {
        setWeekData(data)
        setSelectedAdvances(data.pendingAdvances.map((a: any) => a.id))
      })
      .catch(() => toast.error('Failed to load payment data'))
      .finally(() => setLoading(false))
  }, [labour.id])

  const deductTotal = weekData?.pendingAdvances
    .filter((a: any) => selectedAdvances.includes(a.id))
    .reduce((s: number, a: any) => s + a.amount, 0) || 0

  const netPay = Math.max(0, (weekData?.totalWage || 0) - deductTotal)

  async function handlePay() {
    if (!weekData || weekData.daysWorked === 0) return
    setSaving(true)
    try {
      const res = await recordWeeklySalary({
        labourId: labour.id,
        weekStart: weekData.weekStart,
        weekEnd: weekData.weekEnd,
        daysWorked: weekData.daysWorked,
        totalWage: weekData.totalWage,
        advanceDeducted: deductTotal,
        netPaid: netPay,
        settledAdvanceIds: selectedAdvances,
        notes,
      })
      if (res.success) {
        toast.success(`✅ Paid ${formatCurrency(netPay)} to ${labour.name}`)
        router.refresh()
        onClose()
      } else toast.error(res.error || 'Failed to record payment')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Proper sticky header + scrollable body + sticky footer architecture */}
      <div className="modal-box max-w-md w-full" onClick={(e) => e.stopPropagation()}>

        {/* ── Sticky Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
          <div>
            <h3 className="font-display font-bold text-gray-900 dark:text-white text-lg leading-tight">Pay Worker</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{labour.name} · {labour.designation}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 ml-4">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* ── Scrollable Body ───────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-primary-500" />
              <p className="text-sm text-gray-400">Loading payment data...</p>
            </div>
          ) : !weekData ? (
            <p className="text-center text-gray-400 py-6">Failed to load data</p>
          ) : (
            <>
              {/* ── Attendance Summary ─── */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Unpaid Attendance</p>
                </div>
                {weekData.daysWorked === 0 ? (
                  <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      No unpaid attendance found. Mark attendance in the Attendance tab first.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Days Present</p>
                        <p className="font-display font-bold text-3xl text-gray-900 dark:text-white leading-none">
                          {weekData.daysWorked}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Gross Wage</p>
                        <p className="font-display font-bold text-xl text-emerald-600 dark:text-emerald-400 leading-none tabular-nums">
                          {formatCurrency(weekData.totalWage)}
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 dark:border-slate-600 pt-2 space-y-1.5">
                      {weekData.entries.map((e: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-xs py-0.5">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600 flex-shrink-0" />
                            <span className="text-gray-500 dark:text-slate-400">
                              {new Date(e.dailyRecord.date).toLocaleDateString('en-IN', {
                                weekday: 'short', day: 'numeric', month: 'short',
                              })}
                              {e.dailyRecord.site && (
                                <span className="text-gray-400 dark:text-slate-500 ml-1">· {e.dailyRecord.site.name}</span>
                              )}
                            </span>
                          </div>
                          <span className="font-semibold text-gray-700 dark:text-slate-300 tabular-nums">
                            {formatCurrency(e.cost)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* ── Advance Deductions ─── */}
              {weekData.pendingAdvances.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" /> Deduct Advances
                  </p>
                  {weekData.pendingAdvances.map((adv: any) => (
                    <label
                      key={adv.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                        selectedAdvances.includes(adv.id)
                          ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
                          : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/30 hover:border-gray-300'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAdvances.includes(adv.id)}
                        onChange={(e) =>
                          setSelectedAdvances((prev) =>
                            e.target.checked ? [...prev, adv.id] : prev.filter((id) => id !== adv.id)
                          )
                        }
                        className="w-4 h-4 rounded text-red-500 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-slate-200">{formatCurrency(adv.amount)}</p>
                        {adv.reason && <p className="text-xs text-gray-400 truncate">{adv.reason}</p>}
                        <p className="text-[10px] text-gray-400 dark:text-slate-500">
                          {new Date(adv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      {selectedAdvances.includes(adv.id) && (
                        <span className="text-[9px] font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
                          Deducting
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}

              {/* ── Notes ─── */}
              <div>
                <label className="label">Notes (optional)</label>
                <input className="input text-sm" value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Paid cash on Saturday" />
              </div>
            </>
          )}
        </div>

        {/* ── Sticky Footer ─────────────────────────────────────── */}
        {!loading && weekData && weekData.daysWorked > 0 && (
          <div className="flex-shrink-0 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 px-6 py-4 space-y-3">
            {/* Breakdown */}
            <div className="space-y-1">
              {deductTotal > 0 ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-slate-400">Gross Wage</span>
                    <span className="font-medium text-gray-700 dark:text-slate-300 tabular-nums">{formatCurrency(weekData.totalWage)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-500">Advance Deducted</span>
                    <span className="font-medium text-red-500 tabular-nums">− {formatCurrency(deductTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-gray-200 dark:border-slate-600">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">Cash to Pay Now</span>
                    <span className="font-display font-bold text-2xl text-primary-600 dark:text-primary-400 tabular-nums">{formatCurrency(netPay)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Cash to Pay Now</span>
                  <span className="font-display font-bold text-2xl text-primary-600 dark:text-primary-400 tabular-nums">{formatCurrency(netPay)}</span>
                </div>
              )}
            </div>
            {/* Confirm button */}
            {confirmPay ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3.5 py-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Confirm paying <span className="font-bold">{formatCurrency(netPay)}</span> to {labour.name}?
                    {deductTotal > 0 && <span className="text-amber-700"> ({formatCurrency(deductTotal)} advance deducted)</span>}
                    {' '}This cannot be undone.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handlePay} disabled={saving}
                    className="btn-primary flex-1 justify-center py-2.5 bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-400">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {saving ? 'Recording...' : 'Yes, Record Payment'}
                  </button>
                  <button onClick={() => setConfirmPay(false)} className="btn-secondary" disabled={saving}>Go Back</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmPay(true)} disabled={saving}
                className="btn-primary w-full justify-center py-3 text-base">
                <Wallet className="w-4 h-4" />
                Record Payment of {formatCurrency(netPay)}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Attendance Panel ──────────────────────────────────────────────────────
function AttendancePanel({ sites }: { sites: Site[] }) {
  const router = useRouter()
  // Local date (not UTC) so IST users see the correct calendar date as default
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
  const [siteId, setSiteId] = useState(sites[0]?.id || '')
  const [date, setDate] = useState(today)
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  // BUG-6 FIX: track whether the loaded sheet came from the database (existing record)
  const [hasExistingRecord, setHasExistingRecord] = useState(false)

  useEffect(() => {
    if (!siteId || !date) return
    setLoading(true)
    getAttendanceSheet(siteId, date)
      .then((data) => {
        setEntries(data)
        // BUG-6 FIX: only set true if data contains entries that were pre-loaded from DB
        // (i.e., at least one entry has isPaid=true OR present=true AND came from DB)
        // We detect "came from DB" by checking if any entry has a different rate than dailyWage
        // OR any entry is present (since fresh sheets are all not-present by default)
        const anyPresent = data.some((e) => e.present)
        setHasExistingRecord(anyPresent)
      })
      .catch(() => toast.error('Failed to load attendance'))
      .finally(() => setLoading(false))
  }, [siteId, date])

  function toggle(labourId: string) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.labourId !== labourId) return e
        if (e.isPaid) return e  // cannot untick already-paid entries
        return { ...e, present: !e.present }
      })
    )
  }

  function setRate(labourId: string, rate: number) {
    setEntries((prev) =>
      prev.map((e) => e.labourId === labourId ? { ...e, rate } : e)
    )
  }

  async function handleSave() {
    if (!siteId) { toast.error('Select a site'); return }
    setSaving(true)
    try {
      const res = await saveAttendance({
        siteId,
        date,
        entries: entries.map((e) => ({ labourId: e.labourId, present: e.present, rate: e.rate })),
      })
      if (res.success) {
        // BUG-8 FIX: use parseLocalDate to avoid IST off-by-one
        const d = parseLocalDate(date)
        toast.success(`Attendance saved for ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`)
        setHasExistingRecord(entries.some((e) => e.present))
        router.refresh()
      } else {
        toast.error(res.error || 'Failed to save')
      }
    } finally { setSaving(false) }
  }

  const presentCount = entries.filter((e) => e.present).length
  const paidCount = entries.filter((e) => e.isPaid).length
  const regular = entries.filter((e) => e.labourType !== 'ONCALL')
  const oncall = entries.filter((e) => e.labourType === 'ONCALL')

  // BUG-8 FIX: use parseLocalDate for display
  const displayDate = parseLocalDate(date)

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Mark workers present here. Wages are <span className="font-semibold">not deducted</span> yet — they're applied when you click <span className="font-semibold">Pay</span> in the Payments tab.
        </p>
      </div>

      <div className="card grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Site</label>
          {sites.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2">
              No active sites found. Create a site first.
            </p>
          ) : (
            <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {s.location}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
          />
        </div>
      </div>

      {loading ? (
        <div className="card flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : entries.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">
          No active workers registered. Add workers in the Workers tab.
        </div>
      ) : (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                {displayDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {/* BUG-6 FIX: only show "editing" note when data was pre-loaded from DB */}
              {hasExistingRecord && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                  <Info className="w-2.5 h-2.5" />
                  Editing saved attendance — paid entries are locked
                </p>
              )}
            </div>
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {presentCount} of {entries.length} present
              {paidCount > 0 && <span className="text-emerald-500 ml-1">· {paidCount} paid</span>}
            </span>
          </div>

          {regular.length > 0 && (
            <div className="space-y-2">
              {regular.map((entry) => (
                <AttendanceRow
                  key={entry.labourId}
                  entry={entry}
                  onToggle={() => toggle(entry.labourId)}
                  onRate={(v) => setRate(entry.labourId, v)}
                />
              ))}
            </div>
          )}

          {oncall.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-dashed border-gray-200 dark:border-slate-600">
              <p className="text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wider">
                On-Call Workers
              </p>
              {oncall.map((entry) => (
                <AttendanceRow
                  key={entry.labourId}
                  entry={entry}
                  onToggle={() => toggle(entry.labourId)}
                  onRate={(v) => setRate(entry.labourId, v)}
                />
              ))}
            </div>
          )}

          {presentCount > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 rounded-xl px-3 py-2 -mx-1">
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Estimated wages (paid on Saturday)
              </span>
              <span className="text-sm font-semibold text-gray-400 dark:text-slate-500 line-through tabular-nums">
                {formatCurrency(entries.filter((e) => e.present).reduce((s, e) => s + e.rate, 0))}
              </span>
            </div>
          )}

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
            Save Attendance
          </button>
        </div>
      )}
    </div>
  )
}

// ── Attendance Row ─────────────────────────────────────────────────────────
function AttendanceRow({
  entry,
  onToggle,
  onRate,
}: {
  entry: any
  onToggle: () => void
  onRate: (v: number) => void
}) {
  const locked = entry.isPaid  // locked if already paid — cannot un-tick

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-all duration-150',
        locked
          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
          : entry.present
            ? 'border-primary-200 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10'
            : 'border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30'
      )}
    >
      <button
        onClick={onToggle}
        disabled={locked}
        className={cn(
          'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
          locked
            ? 'bg-emerald-500 border-emerald-500 text-white cursor-not-allowed'
            : entry.present
              ? 'bg-primary-500 border-primary-500 text-white'
              : 'border-gray-300 dark:border-slate-500'
        )}
      >
        {(entry.present || locked) && <span className="text-white text-xs font-bold">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', (entry.present || locked) ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500')}>
          {entry.name}
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-500">{entry.designation}</p>
      </div>
      {locked && (
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 flex-shrink-0">
          <CheckCircle className="w-3 h-3" /> Paid
        </span>
      )}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-xs text-gray-400">₹</span>
        <input
          type="number"
          className={cn(
            'w-20 sm:w-24 px-2 py-1 rounded-lg border text-sm text-right transition-colors',
            locked
              ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300 cursor-not-allowed'
              : entry.present
                ? 'border-primary-200 dark:border-primary-700 bg-white dark:bg-slate-700 text-gray-900 dark:text-white'
                : 'border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-gray-300 dark:text-slate-600'
          )}
          value={entry.rate}
          onChange={(e) => onRate(parseFloat(e.target.value) || 0)}
          disabled={!entry.present || locked}
          min={0}
        />
      </div>
    </div>
  )
}

// ── Payments Panel ─────────────────────────────────────────────────────────
function PaymentsPanel({ labours }: { labours: Labour[] }) {
  const [payLabour, setPayLabour] = useState<Labour | null>(null)
  const activeLabours = labours.filter((l) => l.active)
  const withUnpaid = activeLabours.filter((l) => l.unpaidDays > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Every Saturday, click <span className="font-semibold">Pay</span> for each worker. The system calculates wages from attendance, deducts any advances, and records the cash payment.
        </p>
      </div>

      {withUnpaid.length === 0 ? (
        <div className="card text-center py-10 space-y-2">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
          <p className="font-semibold text-gray-700 dark:text-slate-300">All workers are paid up!</p>
          <p className="text-sm text-gray-400">No pending wages. Mark attendance in the Attendance tab.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">Workers with Unpaid Wages</p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {withUnpaid.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xs font-bold flex-shrink-0">
                  {l.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-slate-200 text-sm">{l.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    {l.unpaidDays} day{l.unpaidDays > 1 ? 's' : ''} unpaid
                    {l.pendingAdvance > 0 && ` · Advance: ${formatCurrency(l.pendingAdvance)}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 mr-2">
                  <p className="font-bold text-gray-900 dark:text-white tabular-nums">
                    {formatCurrency(l.unpaidWage)}
                  </p>
                  {l.pendingAdvance > 0 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                      Net ~{formatCurrency(Math.max(0, l.unpaidWage - l.pendingAdvance))}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setPayLabour(l)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex-shrink-0"
                >
                  <Wallet className="w-3.5 h-3.5" /> Pay
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All workers summary table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">All Workers</p>
        </div>
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead>
              <tr>
                <th>Worker</th>
                <th>This Week</th>
                <th className="hidden sm:table-cell">Total Paid</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeLabours.map((l) => (
                <tr key={l.id}>
                  <td>
                    <p className="font-medium text-gray-800 dark:text-slate-200 text-sm">{l.name}</p>
                    <p className="text-xs text-gray-400">{l.designation}</p>
                  </td>
                  <td>
                    <p className="text-sm font-semibold">{l.thisWeekDays} days</p>
                    <p className="text-xs text-gray-400">{formatCurrency(l.thisWeekWage)}</p>
                  </td>
                  <td className="hidden sm:table-cell text-sm font-semibold tabular-nums text-gray-700 dark:text-slate-300">
                    {formatCurrency(l.totalEarnings)}
                  </td>
                  <td>
                    <button
                      onClick={() => setPayLabour(l)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors',
                        l.unpaidDays > 0
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-400 hover:bg-gray-200'
                      )}
                    >
                      <Wallet className="w-3 h-3" />
                      {l.unpaidDays > 0 ? `Pay (${l.unpaidDays}d)` : 'Pay'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {payLabour && <PayModal labour={payLabour} onClose={() => setPayLabour(null)} />}
    </div>
  )
}

// ── Workers Panel ─────────────────────────────────────────────────────────
function WorkersPanel({ labours, sites, isAdmin }: { labours: Labour[]; sites: Site[]; isAdmin: boolean }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', designation: '', dailyWage: '', active: true, labourType: 'REGULAR' })
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'REGULAR' | 'ONCALL'>('all')
  const [advanceHistoryLabour, setAdvanceHistoryLabour] = useState<Labour | null>(null)
  const [giveAdvanceLabour, setGiveAdvanceLabour] = useState<Labour | null>(null)

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  function startEdit(l: Labour) {
    setEditingId(l.id)
    setForm({ name: l.name, designation: l.designation, dailyWage: String(l.dailyWage), active: l.active, labourType: l.labourType })
    setShowForm(true)
  }

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setForm({ name: '', designation: '', dailyWage: '', active: true, labourType: 'REGULAR' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.designation || !form.dailyWage) { toast.error('Fill all required fields'); return }
    setLoading(true)
    try {
      const data = {
        name: form.name.trim(),
        designation: form.designation.trim(),
        dailyWage: parseFloat(form.dailyWage),
        active: form.active,
        labourType: form.labourType as 'REGULAR' | 'ONCALL',
      }
      const result = editingId ? await updateLabour(editingId, data) : await createLabour(data)
      if (result.success) {
        toast.success(editingId ? 'Worker updated' : 'Worker added')
        resetForm()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed')
      }
    } finally { setLoading(false) }
  }

  async function handleDeactivate(id: string, name: string) {
    if (!confirm(`Deactivate ${name}? They won't appear in daily attendance.`)) return
    const result = await deleteLabour(id)
    if (result.success) { toast.success(`${name} deactivated`); router.refresh() }
    else toast.error(result.error || 'Failed')
  }

  async function handleReactivate(id: string, name: string) {
    const result = await reactivateLabour(id)
    if (result.success) { toast.success(`${name} reactivated`); router.refresh() }
    else toast.error(result.error || 'Failed')
  }

  const filtered = labours.filter((l) => filter === 'all' || l.labourType === filter)

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {showForm ? (editingId ? 'Edit Worker' : 'Add New Worker') : 'Worker Registry'}
            </h3>
            {!showForm && (
              <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary text-xs py-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Worker
              </button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)}
                    placeholder="Worker name" required autoFocus />
                </div>
                <div>
                  <label className="label">Designation *</label>
                  <input className="input" value={form.designation} onChange={(e) => set('designation', e.target.value)}
                    placeholder="e.g. Mason, Carpenter, Helper" required />
                </div>
                <div>
                  <label className="label">Daily Wage (₹) *</label>
                  <input className="input" type="number" min="1" value={form.dailyWage}
                    onChange={(e) => set('dailyWage', e.target.value)} placeholder="500" required />
                </div>
                <div>
                  <label className="label">Worker Type</label>
                  <select className="input" value={form.labourType} onChange={(e) => set('labourType', e.target.value)}>
                    <option value="REGULAR">Regular (appears in attendance daily)</option>
                    <option value="ONCALL">On-Call (add only when needed)</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 col-span-full">
                  <input type="checkbox" id="active-check" checked={form.active}
                    onChange={(e) => set('active', e.target.checked)} className="w-4 h-4 text-primary-500 rounded" />
                  <label htmlFor="active-check" className="text-sm text-gray-700 dark:text-slate-300">Active worker</label>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={resetForm} className="btn-secondary">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {editingId ? 'Update Worker' : 'Add Worker'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {(['all', 'REGULAR', 'ONCALL'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
              filter === f
                ? 'bg-primary-500 text-white border-primary-500'
                : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:bg-gray-50'
            )}
          >
            {f === 'all' ? 'All Workers' : f === 'REGULAR' ? '🔄 Regular' : '📞 On-Call'}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead>
              <tr>
                <th>Worker</th>
                <th className="hidden sm:table-cell">Type</th>
                <th>This Week</th>
                <th className="hidden md:table-cell">Rate/Day</th>
                <th>Advance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">No workers found</td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className={cn(!l.active && 'opacity-50')}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xs font-bold flex-shrink-0">
                          {l.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-slate-200 text-sm">{l.name}</p>
                          <p className="text-xs text-gray-400">{l.designation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        l.labourType === 'REGULAR'
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                      )}>
                        {l.labourType === 'REGULAR' ? 'Regular' : 'On-Call'}
                      </span>
                    </td>
                    <td>
                      <p className="text-sm font-semibold">{l.thisWeekDays}d</p>
                      <p className="text-xs text-gray-400">{formatCurrency(l.thisWeekWage)}</p>
                    </td>
                    <td className="hidden md:table-cell font-semibold tabular-nums text-gray-700 dark:text-slate-300">
                      {formatCurrency(l.dailyWage)}
                    </td>
                    <td>
                      {l.pendingAdvance > 0 ? (
                        <button
                          onClick={() => setAdvanceHistoryLabour(l)}
                          className="text-sm font-semibold text-red-500 hover:text-red-600 tabular-nums hover:underline underline-offset-2"
                          title="View advance history"
                        >
                          {formatCurrency(l.pendingAdvance)}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-1 items-center flex-wrap">
                        <button
                          onClick={() => setGiveAdvanceLabour(l)}
                          title="Give advance"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 transition-colors"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span className="hidden sm:inline">Advance</span>
                        </button>
                        {/* View advance history button */}
                        <button
                          onClick={() => setAdvanceHistoryLabour(l)}
                          title="Advance history"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-100 transition-colors"
                        >
                          <History className="w-3 h-3" />
                        </button>
                        {isAdmin && (
                          <>
                            <button onClick={() => startEdit(l)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {l.active ? (
                              <button onClick={() => handleDeactivate(l.id, l.name)}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
                                title="Deactivate">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button onClick={() => handleReactivate(l.id, l.name)}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-400 hover:text-emerald-600 transition-colors"
                                title="Reactivate">
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {advanceHistoryLabour && (
        <AdvanceHistoryModal labour={advanceHistoryLabour} onClose={() => setAdvanceHistoryLabour(null)} />
      )}
      {giveAdvanceLabour && (
        <GiveAdvanceModal labour={giveAdvanceLabour} sites={sites} onClose={() => setGiveAdvanceLabour(null)} />
      )}
    </div>
  )
}

// ── Main LabourManagement (3 tabs) ─────────────────────────────────────────
export function LabourManagement({
  labours,
  sites,
  isAdmin,
}: {
  labours: Labour[]
  sites: Site[]
  isAdmin: boolean
}) {
  const [tab, setTab] = useState<'workers' | 'attendance' | 'payments'>('workers')

  const unpaidCount = labours.filter((l) => l.active && l.unpaidDays > 0).length

  const tabs = [
    { id: 'workers' as const, label: 'Workers', icon: Users },
    { id: 'attendance' as const, label: 'Attendance', icon: CalendarCheck },
    { id: 'payments' as const, label: 'Payments', icon: Wallet, badge: unpaidCount },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-700 rounded-xl w-fit overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn('tab-btn flex items-center gap-1.5 whitespace-nowrap', tab === id && 'active')}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {badge !== undefined && badge > 0 && (
              <span className={cn(
                'text-[11px] px-1.5 py-0.5 rounded-full font-bold',
                tab === id
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              )}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'workers' && <WorkersPanel labours={labours} sites={sites} isAdmin={isAdmin} />}
      {tab === 'attendance' && <AttendancePanel sites={sites} />}
      {tab === 'payments' && <PaymentsPanel labours={labours} />}
    </div>
  )
}
