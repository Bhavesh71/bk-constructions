'use client'

import { useState, useMemo } from 'react'
import { formatCurrency, formatDate, parseLocalDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import { Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface Site { id: string; name: string }
interface Record {
  id: string; siteId: string; date: string; totalLabour: number; totalMaterial: number; totalOther: number; grandTotal: number
  site: { name: string }; createdBy: { name: string }
}

const COLORS = ['#4F46E5', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6']
const PAGE_SIZE = 50

const formatInr = (v: number) => {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`
  return `₹${v}`
}

export function ReportsClient({ sites, records }: { sites: Site[]; records: Record[] }) {
  const [siteFilter, setSiteFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    setPage(1)
    return records.filter((r) => {
      if (siteFilter && r.siteId !== siteFilter) return false
      if (dateFrom && parseLocalDate(r.date) < parseLocalDate(dateFrom)) return false
      if (dateTo && parseLocalDate(r.date) > parseLocalDate(dateTo)) return false
      return true
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, siteFilter, dateFrom, dateTo])

  const totals = useMemo(() => ({
    labour: filtered.reduce((s, r) => s + r.totalLabour, 0),
    material: filtered.reduce((s, r) => s + r.totalMaterial, 0),
    other: filtered.reduce((s, r) => s + r.totalOther, 0),
    grand: filtered.reduce((s, r) => s + r.grandTotal, 0),
  }), [filtered])

  const pieData = [
    { name: 'Labour', value: totals.labour },
    { name: 'Material', value: totals.material },
    { name: 'Other', value: totals.other },
  ].filter(d => d.value > 0)

  // Site breakdown
  const siteBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; labour: number; material: number; other: number; total: number }>()
    for (const r of filtered) {
      const existing = map.get(r.siteId) || { name: r.site.name, labour: 0, material: 0, other: 0, total: 0 }
      map.set(r.siteId, {
        name: r.site.name.length > 12 ? r.site.name.substring(0, 12) + '…' : r.site.name,
        labour: existing.labour + r.totalLabour,
        material: existing.material + r.totalMaterial,
        other: existing.other + r.totalOther,
        total: existing.total + r.grandTotal,
      })
    }
    return Array.from(map.values())
  }, [filtered])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function exportCSV() {
    const headers = ['Date', 'Site', 'Labour', 'Material', 'Other', 'Total', 'Recorded By']
    const rows = filtered.map(r => [
      parseLocalDate(r.date).toLocaleDateString('en-IN'),
      r.site.name,
      r.totalLabour,
      r.totalMaterial,
      r.totalOther,
      r.grandTotal,
      r.createdBy.name,
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bk-constructions-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported!')
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Site</label>
            <select className="input" value={siteFilter} onChange={e => setSiteFilter(e.target.value)}>
              <option value="">All Sites</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">From Date</label>
            <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To Date</label>
            <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">{filtered.length} records found</p>
          <button onClick={exportCSV} className="btn-secondary text-xs py-1.5">
            <Download className="w-3.5 h-3.5" />Export CSV
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Labour', value: totals.labour, color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Material', value: totals.material, color: 'text-green-600 dark:text-green-400' },
          { label: 'Other', value: totals.other, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Grand Total', value: totals.grand, color: 'text-gray-900 dark:text-white' },
        ].map(item => (
          <div key={item.label} className="card py-4">
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">{item.label}</p>
            <p className={`font-display font-bold text-xl text-financial ${item.color}`}>{formatCurrency(item.value)}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      {filtered.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card">
            <h4 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Expense Breakdown</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '10px', color: '#f8fafc', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {siteBreakdown.length > 1 && (
            <div className="card">
              <h4 className="font-display font-semibold text-gray-900 dark:text-white mb-4">By Site</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={siteBreakdown} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatInr} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '10px', color: '#f8fafc', fontSize: '12px' }} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="labour" name="Labour" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="material" name="Material" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="other" name="Other" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Records Table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <h4 className="font-semibold text-gray-900 dark:text-white">Expense Records</h4>
          <span className="text-sm text-gray-400 dark:text-slate-500">{filtered.length} records</span>
        </div>
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Site</th>
                <th className="hidden sm:table-cell">Labour</th>
                <th className="hidden sm:table-cell">Material</th>
                <th className="hidden md:table-cell">Other</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 dark:text-slate-500 py-8">No records match the current filters</td></tr>
              ) : (
                paginated.map((r) => (
                  <tr key={r.id}>
                    <td className="text-gray-500 dark:text-slate-400 text-sm">{formatDate(r.date)}</td>
                    <td className="font-medium text-gray-800 dark:text-slate-200">{r.site.name}</td>
                    <td className="hidden sm:table-cell text-financial">{formatCurrency(r.totalLabour)}</td>
                    <td className="hidden sm:table-cell text-financial">{formatCurrency(r.totalMaterial)}</td>
                    <td className="hidden md:table-cell text-financial">{formatCurrency(r.totalOther)}</td>
                    <td className="font-bold text-financial text-gray-900 dark:text-white">{formatCurrency(r.grandTotal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-slate-700">
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Showing <span className="font-semibold text-gray-600 dark:text-slate-300">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-semibold text-gray-600 dark:text-slate-300">{filtered.length}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1
                if (totalPages > 5) {
                  if (page > 3) p = page - 2 + i
                  if (page > totalPages - 2) p = totalPages - 4 + i
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-semibold transition-colors',
                      p === page
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                    )}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
