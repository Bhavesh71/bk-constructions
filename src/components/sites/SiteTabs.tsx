'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Plus, Loader2, TrendingDown, TrendingUp, UserPlus, UserMinus,
  Edit2, Trash2, AlertTriangle, X, Check,
} from 'lucide-react'
import {
  addBudgetEntry, editBudgetEntry, voidBudgetEntry,
  assignUserToSite, removeUserFromSite,
} from '@/actions/sites'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface SiteTabsProps {
  site: any
  isAdmin: boolean
  allUsers?: Array<{ id: string; name: string; email: string; role: string }>
}

export function SiteTabs({ site, isAdmin, allUsers = [] }: SiteTabsProps) {
  const tabs = isAdmin
    ? ['Overview', 'Daily Records', 'Budget', 'Team']
    : ['Overview', 'Daily Records', 'Budget']
  const [activeTab, setActiveTab] = useState('Overview')
  const [tabLoading, setTabLoading] = useState(false)

  function switchTab(tab: string) {
    if (tab === activeTab) return
    setTabLoading(true)
    setActiveTab(tab)
    setTimeout(() => setTabLoading(false), 300)
  }

  return (
    <div>
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-700 rounded-xl w-fit mb-6">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => switchTab(tab)} className={cn('tab-btn whitespace-nowrap', activeTab === tab && 'active')}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {tabLoading && (
        <div className="w-full h-0.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mb-1 -mt-5">
          <div className="h-full bg-primary-500 rounded-full animate-loading-bar" />
        </div>
      )}
      <div className={cn('transition-opacity duration-150', tabLoading ? 'opacity-30 pointer-events-none select-none' : 'opacity-100 animate-tab-fade-in')}>
        {activeTab === 'Overview' && <OverviewTab site={site} />}
        {activeTab === 'Daily Records' && <DailyRecordsTab site={site} />}
        {activeTab === 'Budget' && <BudgetTab site={site} isAdmin={isAdmin} />}
        {activeTab === 'Team' && isAdmin && <TeamTab site={site} allUsers={allUsers} />}
      </div>
    </div>
  )
}

function OverviewTab({ site }: { site: any }) {
  // Use pre-aggregated reclassified totals from getSiteById.
  // Advances have already been moved from Other → Labour at the data layer.
  const totalLabour   = site.totalLabour   ?? 0
  const totalMaterial = site.totalMaterial ?? 0
  const totalOther    = site.totalOther    ?? 0
  const grand         = site.totalSpent    ?? (totalLabour + totalMaterial + totalOther)

  return (
    <div className="space-y-4">
      {site.description && (
        <div className="card">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Description</p>
          <p className="text-gray-700 dark:text-slate-300 text-sm">{site.description}</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Labour', value: totalLabour, color: 'bg-primary-500', pct: grand > 0 ? (totalLabour / grand) * 100 : 0 },
          { label: 'Material', value: totalMaterial, color: 'bg-green-500', pct: grand > 0 ? (totalMaterial / grand) * 100 : 0 },
          { label: 'Other', value: totalOther, color: 'bg-amber-500', pct: grand > 0 ? (totalOther / grand) * 100 : 0 },
        ].map((item) => (
          <div key={item.label} className="card py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
              <span className="text-xs font-medium text-gray-500 dark:text-slate-400">{item.label}</span>
            </div>
            <p className="font-display font-bold text-gray-900 dark:text-white text-lg">{formatCurrency(item.value)}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{item.pct.toFixed(1)}% of total</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DailyRecordsTab({ site }: { site: any }) {
  const totalCount = (site._count?.dailyRecords ?? site.dailyRecords.length)
  const showingAll = site.dailyRecords.length >= totalCount
  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 dark:text-white">
          Daily Records
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-slate-500">
            {showingAll
              ? `(${site.dailyRecords.length} total)`
              : `(showing last 30 of ${totalCount} — `}
            {!showingAll && (
              <Link href="/records" className="text-primary-500 hover:text-primary-600 underline">view all</Link>
            )}
            {!showingAll && ')'}
          </span>
        </h4>
        <Link href="/daily-entry" className="btn-primary text-xs py-1.5 px-3">
          <Plus className="w-3.5 h-3.5" /> Add Entry
        </Link>
      </div>
      {site.dailyRecords.length === 0 ? (
        <div className="empty-state py-10">
          <p className="text-gray-400 dark:text-slate-500 text-sm">No records yet</p>
        </div>
      ) : (
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="hidden sm:table-cell">Labour</th>
                <th className="hidden sm:table-cell">Material</th>
                <th className="hidden md:table-cell">Other</th>
                <th>Total</th>
                <th className="hidden lg:table-cell">By</th>
              </tr>
            </thead>
            <tbody>
              {site.dailyRecords.map((r: any) => {
                // Reclassify advances: move them from Other → Labour for display
                const advAmt = (r.otherExpenses ?? [])
                  .filter((e: any) => e.category === 'Advance')
                  .reduce((s: number, e: any) => s + e.amount, 0)
                const labourDisplay = r.totalLabour + advAmt
                const otherDisplay  = r.totalOther  - advAmt
                return (
                  <tr key={r.id}>
                    <td className="font-medium">{formatDate(r.date)}</td>
                    <td className="hidden sm:table-cell">{formatCurrency(labourDisplay)}</td>
                    <td className="hidden sm:table-cell">{formatCurrency(r.totalMaterial)}</td>
                    <td className="hidden md:table-cell">{formatCurrency(otherDisplay)}</td>
                    <td className="font-semibold">{formatCurrency(r.grandTotal)}</td>
                    <td className="hidden lg:table-cell text-gray-400 dark:text-slate-500 text-xs">{r.createdBy.name}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Budget Tab ─────────────────────────────────────────────────────────────
function BudgetTab({ site, isAdmin }: { site: any; isAdmin: boolean }) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  // Edit modal state
  const [editEntry, setEditEntry] = useState<any | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Void modal state
  const [voidEntry, setVoidEntry] = useState<any | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [voiding, setVoiding] = useState(false)

  const activeBudget = site.budgetEntries
    .filter((b: any) => !b.isVoided)
    .reduce((s: number, b: any) => s + b.amount, 0)
  // Use the pre-aggregated totalSpent from getSiteById (covers ALL records, not just last 50)
  const totalSpent = site.totalSpent ?? site.dailyRecords.reduce((s: number, r: any) => s + r.grandTotal, 0)
  const remaining = activeBudget - totalSpent
  const pct = activeBudget > 0 ? Math.min((totalSpent / activeBudget) * 100, 100) : 0

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!amount) return
    setAdding(true)
    try {
      const res = await addBudgetEntry(site.id, { amount: parseFloat(amount), note })
      if (res.success) {
        toast.success('Budget entry added')
        setAmount('')
        setNote('')
        setShowAdd(false)
        router.refresh()
      } else {
        toast.error(res.error || 'Failed')
      }
    } finally { setAdding(false) }
  }

  function openEdit(entry: any) {
    setEditEntry(entry)
    setEditAmount(String(entry.amount))
    setEditNote(entry.note || '')
  }

  async function handleEditSave() {
    if (!editEntry) return
    setEditSaving(true)
    try {
      const res = await editBudgetEntry(editEntry.id, {
        amount: parseFloat(editAmount),
        note: editNote,
      })
      if (res.success) {
        toast.success('Budget entry updated')
        setEditEntry(null)
        router.refresh()
      } else {
        toast.error(res.error || 'Failed')
      }
    } finally { setEditSaving(false) }
  }

  async function handleVoidConfirm() {
    if (!voidEntry) return
    setVoiding(true)
    try {
      const res = await voidBudgetEntry(voidEntry.id, voidReason)
      if (res.success) {
        toast.success('Budget entry voided')
        setVoidEntry(null)
        setVoidReason('')
        router.refresh()
      } else {
        toast.error(res.error || 'Failed')
      }
    } finally { setVoiding(false) }
  }

  const barColor =
    pct >= 100 ? 'bg-red-500' : pct >= 85 ? 'bg-orange-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="card space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Total Budget</p>
            <p className="font-display font-bold text-gray-900 dark:text-white">{formatCurrency(activeBudget)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Spent</p>
            <p className="font-display font-bold text-red-500">{formatCurrency(totalSpent)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Remaining</p>
            <p className={cn('font-display font-bold', remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>
        <div>
          <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{pct.toFixed(1)}% of budget used</p>
        </div>
      </div>

      {/* Add budget */}
      {isAdmin && (
        <div className="card">
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Budget
            </button>
          ) : (
            <form onSubmit={handleAdd} className="space-y-3">
              <p className="font-semibold text-sm text-gray-700 dark:text-slate-300">New Budget Entry</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount (₹)</label>
                  <input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required min="1" />
                </div>
                <div>
                  <label className="label">Note (optional)</label>
                  <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Phase 1 allocation" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={adding} className="btn-primary">
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                  Add
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Budget entries list */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700">
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
            All Budget Entries
            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-slate-500">
              ({site.budgetEntries.filter((b: any) => !b.isVoided).length} active,&nbsp;
              {site.budgetEntries.filter((b: any) => b.isVoided).length} voided)
            </span>
          </h4>
        </div>
        {site.budgetEntries.length === 0 ? (
          <div className="empty-state py-8">
            <p className="text-gray-400 dark:text-slate-500 text-sm">No budget entries yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {site.budgetEntries.map((entry: any) => (
              <div key={entry.id} className={cn('flex items-start gap-3 p-4', entry.isVoided && 'opacity-50')}>
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
                  entry.isVoided ? 'bg-gray-100 dark:bg-slate-700' : 'bg-emerald-100 dark:bg-emerald-900/30'
                )}>
                  <TrendingUp className={cn('w-4 h-4', entry.isVoided ? 'text-gray-400' : 'text-emerald-600 dark:text-emerald-400')} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      'font-display font-bold text-sm',
                      entry.isVoided ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-white'
                    )}>
                      {formatCurrency(entry.amount)}
                    </p>
                    {entry.isVoided && (
                      <span className="badge badge-voided">VOIDED</span>
                    )}
                  </div>
                  {entry.note && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{entry.note}</p>}
                  {entry.voidReason && <p className="text-xs text-red-400 mt-0.5">Void reason: {entry.voidReason}</p>}
                  <div className="flex flex-wrap gap-x-3 mt-1">
                    <p className="text-[11px] text-gray-400 dark:text-slate-500">
                      Added by {entry.createdBy.name} · {formatDate(entry.createdAt)}
                    </p>
                    {entry.editedBy && (
                      <p className="text-[11px] text-blue-400">Edited by {entry.editedBy.name}</p>
                    )}
                    {entry.voidedBy && (
                      <p className="text-[11px] text-red-400">
                        Voided by {entry.voidedBy.name} · {formatDate(entry.voidedAt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Admin actions */}
                {isAdmin && !entry.isVoided && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(entry)}
                      title="Edit"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setVoidEntry(entry); setVoidReason('') }}
                      title="Void"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────── */}
      {editEntry && (
        <div className="modal-overlay" onClick={() => setEditEntry(null)}>
          <div className="modal-box p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Edit Budget Entry</h3>
              <button onClick={() => setEditEntry(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Amount (₹)</label>
                <input className="input" type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} min="1" required />
              </div>
              <div>
                <label className="label">Note</label>
                <input className="input" value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Optional note" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleEditSave} disabled={editSaving} className="btn-primary flex-1 justify-center">
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Changes
              </button>
              <button onClick={() => setEditEntry(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Void Confirmation Modal ────────────────────────────────── */}
      {voidEntry && (
        <div className="modal-overlay" onClick={() => setVoidEntry(null)}>
          <div className="modal-box p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Void Budget Entry?</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  This will mark {formatCurrency(voidEntry.amount)} as voided. It cannot be undone.
                </p>
              </div>
            </div>
            <div>
              <label className="label">Reason (optional)</label>
              <input
                className="input"
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                placeholder="Why are you voiding this entry?"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleVoidConfirm} disabled={voiding} className="btn-danger flex-1 justify-center">
                {voiding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Void Entry
              </button>
              <button onClick={() => setVoidEntry(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TeamTab({ site, allUsers }: { site: any; allUsers: any[] }) {
  const router = useRouter()
  const assignedIds = new Set(site.assignedUsers.map((su: any) => su.user.id))
  const unassigned = allUsers.filter(u => !assignedIds.has(u.id))
  const [adding, setAdding] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleAssign(userId: string) {
    setAdding(userId)
    const res = await assignUserToSite(site.id, userId)
    if (res.success) { toast.success('User assigned'); router.refresh() }
    else toast.error(res.error || 'Failed')
    setAdding(null)
  }

  async function handleRemove(userId: string) {
    setRemoving(userId)
    const res = await removeUserFromSite(site.id, userId)
    if (res.success) { toast.success('User removed'); router.refresh() }
    else toast.error(res.error || 'Failed')
    setRemoving(null)
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">
          Assigned Team ({site.assignedUsers.length})
        </h4>
        {site.assignedUsers.length === 0 ? (
          <p className="text-gray-400 dark:text-slate-500 text-sm">No team members assigned</p>
        ) : (
          <div className="space-y-2">
            {site.assignedUsers.map(({ user }: any) => (
              <div key={user.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xs font-bold">
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{user.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{user.role} · {user.email}</p>
                </div>
                <button onClick={() => handleRemove(user.id)} disabled={removing === user.id} className="btn-danger text-xs py-1 px-2">
                  {removing === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {unassigned.length > 0 && (
        <div className="card">
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Assign User</h4>
          <div className="space-y-2">
            {unassigned.map((user: any) => (
              <div key={user.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-slate-400 text-xs font-bold">
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{user.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{user.role}</p>
                </div>
                <button onClick={() => handleAssign(user.id)} disabled={adding === user.id} className="btn-secondary text-xs py-1 px-2">
                  {adding === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  Assign
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
