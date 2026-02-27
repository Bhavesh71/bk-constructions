'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Loader2, TrendingDown, TrendingUp } from 'lucide-react'
import { addBudgetEntry } from '@/actions/sites'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const tabs = ['Overview', 'Daily Records', 'Budget']

interface SiteTabsProps {
  site: any
  isAdmin: boolean
}

export function SiteTabs({ site, isAdmin }: SiteTabsProps) {
  const [activeTab, setActiveTab] = useState('Overview')

  return (
    <div>
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn('tab-btn', activeTab === tab && 'active')}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && <OverviewTab site={site} />}
      {activeTab === 'Daily Records' && <DailyRecordsTab site={site} />}
      {activeTab === 'Budget' && <BudgetTab site={site} isAdmin={isAdmin} />}
    </div>
  )
}

function OverviewTab({ site }: { site: any }) {
  // Labour vs Material breakdown from daily records
  const totalLabour = site.dailyRecords.reduce((s: number, r: any) => s + r.totalLabour, 0)
  const totalMaterial = site.dailyRecords.reduce((s: number, r: any) => s + r.totalMaterial, 0)
  const totalOther = site.dailyRecords.reduce((s: number, r: any) => s + r.totalOther, 0)
  const grand = totalLabour + totalMaterial + totalOther

  return (
    <div className="space-y-4">
      {site.description && (
        <div className="card">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
          <p className="text-gray-700 text-sm">{site.description}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Labour', value: totalLabour, color: 'bg-primary-500', pct: grand > 0 ? (totalLabour / grand) * 100 : 0 },
          { label: 'Material', value: totalMaterial, color: 'bg-green-500', pct: grand > 0 ? (totalMaterial / grand) * 100 : 0 },
          { label: 'Other', value: totalOther, color: 'bg-amber-500', pct: grand > 0 ? (totalOther / grand) * 100 : 0 },
        ].map((item) => (
          <div key={item.label} className="card py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
              <span className="text-xs font-medium text-gray-500">{item.label}</span>
            </div>
            <p className="font-display font-bold text-gray-900 text-lg">{formatCurrency(item.value)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{item.pct.toFixed(1)}% of total</p>
          </div>
        ))}
      </div>

      {site.assignedUsers.length > 0 && (
        <div className="card">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Assigned Supervisors</p>
          <div className="space-y-2">
            {site.assignedUsers.map(({ user }: any) => (
              <div key={user.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-bold">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DailyRecordsTab({ site }: { site: any }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">Daily Records</h4>
        <Link href={`/daily-entry?siteId=${site.id}`} className="btn-primary text-xs py-1.5">
          <Plus className="w-3.5 h-3.5" />Add Record
        </Link>
      </div>
      <div className="table-container rounded-none border-0">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Labour</th>
              <th className="hidden md:table-cell">Material</th>
              <th className="hidden md:table-cell">Other</th>
              <th>Total</th>
              <th className="hidden sm:table-cell">By</th>
            </tr>
          </thead>
          <tbody>
            {site.dailyRecords.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-400 py-8">No daily records yet</td></tr>
            ) : (
              site.dailyRecords.map((r: any) => (
                <tr key={r.id}>
                  <td className="font-medium text-gray-800">{formatDate(r.date)}</td>
                  <td className="text-financial">{formatCurrency(r.totalLabour)}</td>
                  <td className="hidden md:table-cell text-financial">{formatCurrency(r.totalMaterial)}</td>
                  <td className="hidden md:table-cell text-financial">{formatCurrency(r.totalOther)}</td>
                  <td className="font-bold text-financial text-gray-900">{formatCurrency(r.grandTotal)}</td>
                  <td className="hidden sm:table-cell text-gray-400 text-xs">{r.createdBy?.name.split(' ')[0]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BudgetTab({ site, isAdmin }: { site: any; isAdmin: boolean }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAddBudget(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await addBudgetEntry({ siteId: site.id, amount: parseFloat(amount), note })
      if (result.success) {
        toast.success('Budget entry added!')
        setAmount('')
        setNote('')
        setShowForm(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to add budget')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Add Budget Entry</h4>
            <button onClick={() => setShowForm(!showForm)} className="btn-secondary text-xs py-1.5">
              <Plus className="w-3.5 h-3.5" />{showForm ? 'Cancel' : 'Add Entry'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleAddBudget} className="space-y-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="label">Amount (₹) *</label>
                  <input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 500000" required />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="label">Note (optional)</label>
                  <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Q2 addition" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Entry
                </button>
              </div>
              <p className="text-xs text-gray-400">For corrections, enter a negative value (e.g. -50000)</p>
            </form>
          )}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h4 className="font-semibold text-gray-900">Budget History</h4>
        </div>
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th className="hidden sm:table-cell">Note</th>
                <th className="hidden sm:table-cell">Added By</th>
              </tr>
            </thead>
            <tbody>
              {site.budgetEntries.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-gray-400 py-8">No budget entries yet</td></tr>
              ) : (
                site.budgetEntries.map((entry: any) => (
                  <tr key={entry.id}>
                    <td className="text-gray-500 text-sm">{formatDate(entry.createdAt)}</td>
                    <td>
                      <span className={`flex items-center gap-1 font-semibold text-financial ${entry.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {entry.amount < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                        {formatCurrency(Math.abs(entry.amount))}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell text-gray-500 text-sm">{entry.note || '—'}</td>
                    <td className="hidden sm:table-cell text-gray-400 text-sm">{entry.createdBy?.name.split(' ')[0]}</td>
                  </tr>
                ))
              )}
            </tbody>
            {site.budgetEntries.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-sm text-gray-700">Total Budget</td>
                  <td className="px-4 py-3 font-display font-bold text-gray-900">{formatCurrency(site.totalBudget)}</td>
                  <td colSpan={2} className="hidden sm:table-cell" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
