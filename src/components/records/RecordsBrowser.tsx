'use client'

import { useState, useMemo } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  ChevronDown, Search, Download,
  FileText, Users, Package, Coins,
  ChevronLeft, ChevronRight, SlidersHorizontal,
  TrendingUp, Calendar, MapPin, User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface LabourEntry {
  id: string
  labour: { name: string; designation: string }
  rate: number
  cost: number
  present: boolean
}

interface MaterialEntry {
  id: string
  material: { name: string; unit: string; category: string }
  quantity: number
  rate: number
  total: number
}

interface OtherExpense {
  id: string
  category: string
  amount: number
  description?: string
}

interface FullRecord {
  id: string
  date: string
  totalLabour: number
  totalMaterial: number
  totalOther: number
  grandTotal: number
  notes?: string
  siteId: string
  site: { name: string; location: string }
  createdBy: { name: string }
  labourEntries: LabourEntry[]
  materialEntries: MaterialEntry[]
  otherExpenses: OtherExpense[]
}

interface Site { id: string; name: string }

interface Props {
  records: FullRecord[]
  sites: Site[]
}

const PAGE_SIZE = 20

export function RecordsBrowser({ records, sites }: Props) {
  const [siteFilter, setSiteFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (siteFilter && r.siteId !== siteFilter) return false
      if (dateFrom && new Date(r.date) < new Date(dateFrom)) return false
      if (dateTo && new Date(r.date) > new Date(dateTo)) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !r.site.name.toLowerCase().includes(q) &&
          !r.createdBy.name.toLowerCase().includes(q) &&
          !formatDate(r.date).toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [records, siteFilter, dateFrom, dateTo, search])

  const totals = useMemo(() => ({
    labour: filtered.reduce((s, r) => s + r.totalLabour, 0),
    material: filtered.reduce((s, r) => s + r.totalMaterial, 0),
    other: filtered.reduce((s, r) => s + r.totalOther, 0),
    grand: filtered.reduce((s, r) => s + r.grandTotal, 0),
  }), [filtered])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleFilterChange() { setPage(1) }
  function toggleExpand(id: string) {
    setExpandedId(prev => (prev === id ? null : id))
  }

  function exportCSV() {
    const rows: string[][] = []
    rows.push(['Date', 'Site', 'Location', 'Labour', 'Material', 'Other', 'Grand Total', 'Recorded By'])
    for (const r of filtered) {
      rows.push([
        formatDate(r.date), r.site.name, r.site.location,
        String(r.totalLabour), String(r.totalMaterial),
        String(r.totalOther), String(r.grandTotal), r.createdBy.name,
      ])
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `records-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  async function exportExcel() {
    setExporting(true)
    try {
      const rows = filtered
      const siteName = siteFilter ? sites.find(s => s.id === siteFilter)?.name : 'All Sites'
      const period = `${dateFrom || 'All'} to ${dateTo || 'All'}`
      const html = `
        <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"/></head>
        <body>
        <h2>Construction Operations Report</h2>
        <p>Site: ${siteName} | Period: ${period} | Generated: ${new Date().toLocaleString('en-IN')}</p>
        <h3>Summary</h3>
        <table border="1">
          <tr style="background:#4F46E5;color:white;font-weight:bold"><th>Category</th><th>Amount (₹)</th></tr>
          <tr><td>Total Labour</td><td>${totals.labour.toFixed(2)}</td></tr>
          <tr><td>Total Material</td><td>${totals.material.toFixed(2)}</td></tr>
          <tr><td>Total Other</td><td>${totals.other.toFixed(2)}</td></tr>
          <tr style="font-weight:bold"><td>Grand Total</td><td>${totals.grand.toFixed(2)}</td></tr>
        </table>
        <br/>
        <h3>Daily Records</h3>
        <table border="1">
          <tr style="background:#4F46E5;color:white;font-weight:bold">
            <th>Date</th><th>Site</th><th>Location</th>
            <th>Labour (₹)</th><th>Material (₹)</th><th>Other (₹)</th>
            <th>Grand Total (₹)</th><th>Recorded By</th>
          </tr>
          ${rows.map(r => `<tr>
            <td>${formatDate(r.date)}</td><td>${r.site.name}</td><td>${r.site.location}</td>
            <td>${r.totalLabour.toFixed(2)}</td><td>${r.totalMaterial.toFixed(2)}</td>
            <td>${r.totalOther.toFixed(2)}</td><td>${r.grandTotal.toFixed(2)}</td>
            <td>${r.createdBy.name}</td>
          </tr>`).join('')}
        </table>
        </body></html>`
      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `records-${new Date().toISOString().split('T')[0]}.xls`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Excel exported')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* ── Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Labour', value: totals.labour,
            icon: Users,
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            iconColor: 'text-blue-600 dark:text-blue-400',
            valueColor: 'text-blue-700 dark:text-blue-300',
            border: 'border-blue-100 dark:border-blue-900/40',
          },
          {
            label: 'Material', value: totals.material,
            icon: Package,
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            valueColor: 'text-emerald-700 dark:text-emerald-300',
            border: 'border-emerald-100 dark:border-emerald-900/40',
          },
          {
            label: 'Other', value: totals.other,
            icon: Coins,
            iconBg: 'bg-amber-100 dark:bg-amber-900/30',
            iconColor: 'text-amber-600 dark:text-amber-400',
            valueColor: 'text-amber-700 dark:text-amber-300',
            border: 'border-amber-100 dark:border-amber-900/40',
          },
          {
            label: 'Grand Total', value: totals.grand,
            icon: TrendingUp,
            iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
            iconColor: 'text-indigo-600 dark:text-indigo-400',
            valueColor: 'text-indigo-700 dark:text-indigo-300',
            border: 'border-indigo-200 dark:border-indigo-800/60',
          },
        ].map(({ label, value, icon: Icon, iconBg, iconColor, valueColor, border }) => (
          <div key={label} className={cn(
            'relative bg-white dark:bg-slate-800 rounded-2xl p-4 border shadow-sm',
            border
          )}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">{label}</p>
                <p className={cn('text-xl font-bold tabular-nums leading-tight', valueColor)}>
                  {formatCurrency(value)}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-600 mt-1">
                  {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className={cn('p-2.5 rounded-xl flex-shrink-0', iconBg)}>
                <Icon className={cn('w-4 h-4', iconColor)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
          <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Filters</span>
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <div>
            <label className="label">Site</label>
            <select className="input" value={siteFilter} onChange={e => { setSiteFilter(e.target.value); handleFilterChange() }}>
              <option value="">All Sites</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input className="input" type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); handleFilterChange() }} />
          </div>
          <div>
            <label className="label">To</label>
            <input className="input" type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); handleFilterChange() }} />
          </div>
          <div>
            <label className="label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 dark:text-slate-600" />
              <input
                className="input pl-9"
                placeholder="Site, worker, date..."
                value={search}
                onChange={e => { setSearch(e.target.value); handleFilterChange() }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Records Table ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400 dark:text-slate-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              {filtered.length} Record{filtered.length !== 1 ? 's' : ''}
            </span>
            {filtered.length !== records.length && (
              <span className="text-xs text-gray-400 dark:text-slate-500">
                (filtered from {records.length})
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={exportExcel}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Exporting...' : 'Excel'}
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
              <FileText className="w-6 h-6 text-gray-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-medium text-gray-400 dark:text-slate-500">No records match your filters</p>
            <p className="text-xs text-gray-300 dark:text-slate-600">Try adjusting or clearing the filters above</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/80">
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Site</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Labour</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Material</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Other</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Total</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider hidden md:table-cell">By</th>
                    <th className="px-4 py-3 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/60">
                  {paginated.map((record) => (
                    <>
                      {/* Main Row */}
                      <tr
                        key={record.id}
                        onClick={() => toggleExpand(record.id)}
                        className={cn(
                          'group cursor-pointer transition-colors duration-150',
                          expandedId === record.id
                            ? 'bg-indigo-50/60 dark:bg-indigo-900/10'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700/40'
                        )}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                            </div>
                            <span className="font-semibold text-gray-800 dark:text-slate-200 text-xs whitespace-nowrap">
                              {formatDate(record.date)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-gray-800 dark:text-slate-200 text-sm leading-tight">{record.site.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 text-gray-300 dark:text-slate-600" />
                            <p className="text-xs text-gray-400 dark:text-slate-500">{record.site.location}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 tabular-nums">
                            {formatCurrency(record.totalLabour)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatCurrency(record.totalMaterial)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-sm font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                            {formatCurrency(record.totalOther)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                            {formatCurrency(record.grandTotal)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                              <User className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400" />
                            </div>
                            <span className="text-xs text-gray-400 dark:text-slate-500 truncate max-w-[80px]">
                              {record.createdBy.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200',
                            expandedId === record.id
                              ? 'bg-indigo-500 text-white rotate-180'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 group-hover:bg-gray-200 dark:group-hover:bg-slate-600'
                          )}>
                            <ChevronDown className="w-3 h-3" />
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Detail Panel */}
                      {expandedId === record.id && (
                        <tr key={`${record.id}-detail`}>
                          <td colSpan={8} className="px-0 py-0">
                            <div className="bg-gradient-to-br from-indigo-50/80 to-slate-50 dark:from-indigo-900/10 dark:to-slate-800/60 border-y border-indigo-100 dark:border-indigo-900/30">

                              {/* Detail Grid */}
                              <div className="grid sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-indigo-100 dark:divide-indigo-900/30">

                                {/* Labour */}
                                <div className="px-6 py-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                      <Users className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Labour</span>
                                    <span className="ml-auto text-xs font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                                      {formatCurrency(record.totalLabour)}
                                    </span>
                                  </div>
                                  {record.labourEntries.filter(e => e.present).length === 0 ? (
                                    <p className="text-xs text-gray-300 dark:text-slate-600 italic">No labour entries</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {record.labourEntries.filter(e => e.present).map(e => (
                                        <div key={e.id} className="flex items-center justify-between gap-2">
                                          <div className="min-w-0">
                                            <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 truncate">{e.labour.name}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-slate-500">{e.labour.designation} · ₹{e.rate}/day</p>
                                          </div>
                                          <span className="text-xs font-bold text-gray-700 dark:text-slate-300 tabular-nums flex-shrink-0">
                                            {formatCurrency(e.cost)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Material */}
                                <div className="px-6 py-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                      <Package className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Materials</span>
                                    <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                      {formatCurrency(record.totalMaterial)}
                                    </span>
                                  </div>
                                  {record.materialEntries.length === 0 ? (
                                    <p className="text-xs text-gray-300 dark:text-slate-600 italic">No material entries</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {record.materialEntries.map(e => (
                                        <div key={e.id} className="flex items-center justify-between gap-2">
                                          <div className="min-w-0">
                                            <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 truncate">{e.material.name}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-slate-500">{e.quantity} {e.material.unit} · ₹{e.rate}/{e.material.unit}</p>
                                          </div>
                                          <span className="text-xs font-bold text-gray-700 dark:text-slate-300 tabular-nums flex-shrink-0">
                                            {formatCurrency(e.total)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Other */}
                                <div className="px-6 py-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                                      <Coins className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Other</span>
                                    <span className="ml-auto text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                      {formatCurrency(record.totalOther)}
                                    </span>
                                  </div>
                                  {record.otherExpenses.length === 0 ? (
                                    <p className="text-xs text-gray-300 dark:text-slate-600 italic">No other expenses</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {record.otherExpenses.map(e => (
                                        <div key={e.id} className="flex items-center justify-between gap-2">
                                          <div className="min-w-0">
                                            <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 truncate">{e.category}</p>
                                            {e.description && (
                                              <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">{e.description}</p>
                                            )}
                                          </div>
                                          <span className="text-xs font-bold text-gray-700 dark:text-slate-300 tabular-nums flex-shrink-0">
                                            {formatCurrency(e.amount)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Notes + Grand Total Footer */}
                              <div className="px-6 py-3 border-t border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                  {record.notes ? (
                                    <p className="text-xs text-gray-500 dark:text-slate-400">
                                      <span className="font-semibold">Note:</span> {record.notes}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-gray-300 dark:text-slate-600 italic">No notes</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">Grand Total</span>
                                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums bg-indigo-100 dark:bg-indigo-900/40 px-3 py-1 rounded-lg">
                                    {formatCurrency(record.grandTotal)}
                                  </span>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>

                {/* Totals Footer */}
                <tfoot>
                  <tr className="border-t-2 border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/80">
                    <td colSpan={2} className="px-5 py-3.5">
                      <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Totals — {filtered.length} records
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">{formatCurrency(totals.labour)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(totals.material)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatCurrency(totals.other)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{formatCurrency(totals.grand)}</span>
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ── Pagination ──────────────────────────────────────── */}
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
          </>
        )}
      </div>
    </div>
  )
}