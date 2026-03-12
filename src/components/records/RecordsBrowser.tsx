'use client'

import { useState, useMemo, Fragment } from 'react'
import { formatCurrency, formatDate, parseLocalDate } from '@/lib/utils'
import {
  ChevronDown, Search, Download,
  FileText, Users, Package, Coins,
  ChevronLeft, ChevronRight, SlidersHorizontal,
  TrendingUp, Calendar, MapPin, User, Printer,
  CheckCircle, Clock, CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface LabourEntry {
  id: string
  labour: { name: string; designation: string }
  rate: number
  cost: number
  present: boolean
  isPaid: boolean
}

interface LabourAdvance {
  id: string
  labour: { name: string }
  amount: number
  reason?: string | null
  isSettled: boolean
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
  description?: string | null
}

interface FullRecord {
  id: string
  date: string
  totalLabour: number
  totalMaterial: number
  totalOther: number
  grandTotal: number
  notes?: string | null
  siteId: string
  site: { name: string; location: string }
  createdBy: { name: string }
  labourEntries: LabourEntry[]
  labourAdvances: LabourAdvance[]
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
      if (dateFrom && parseLocalDate(r.date) < parseLocalDate(dateFrom)) return false
      if (dateTo && parseLocalDate(r.date) > parseLocalDate(dateTo)) return false
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

  // Summary card totals.
  // Advances are stored as OtherExpense(category='Advance') in the DB so they land
  // in totalOther/grandTotal correctly. For display we reclassify them under Labour.
  // grand = totalMaterial + totalOther + totalLabour (DB values) — always authoritative.
  // labour display = totalLabour + advanceSum (advances moved here from Other)
  // other display  = totalOther  - advanceInOther (advances removed from here)
  // → labour_display + other_display + material = grand  (net zero reclassification)
  const totals = useMemo(() => {
    let labour = 0, material = 0, other = 0, grand = 0
    for (const r of filtered) {
      // Use totalOther from DB as the authoritative advance bucket.
      // labourAdvances is for display grouping only — don't double-count.
      const advanceInOther = r.otherExpenses
        .filter(e => e.category === 'Advance')
        .reduce((s, e) => s + e.amount, 0)
      labour   += r.totalLabour + advanceInOther   // reclassify advances → Labour
      material += r.totalMaterial
      other    += r.totalOther - advanceInOther    // remove advances from Other
      grand    += r.grandTotal                     // always correct from DB
    }
    return { labour, material, other, grand }
  }, [filtered])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function resetPage() { setPage(1) }
  function toggleExpand(id: string) { setExpandedId(prev => prev === id ? null : id) }

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
          {(siteFilter || dateFrom || dateTo || search) && (
            <button
              onClick={() => { setSiteFilter(''); setDateFrom(''); setDateTo(''); setSearch(''); resetPage() }}
              className="ml-auto text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <div>
            <label className="label">Site</label>
            <select className="input" value={siteFilter} onChange={e => { setSiteFilter(e.target.value); resetPage() }}>
              <option value="">All Sites</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input className="input" type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); resetPage() }} />
          </div>
          <div>
            <label className="label">To</label>
            <input className="input" type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); resetPage() }} />
          </div>
          <div>
            <label className="label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 dark:text-slate-600" />
              <input
                className="input pl-9"
                placeholder="Site, worker, date..."
                value={search}
                onChange={e => { setSearch(e.target.value); resetPage() }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Records Table ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-slate-700 flex-wrap gap-2">
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
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
              <FileText className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={exportExcel} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 transition-colors">
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Exporting...' : 'Excel'}
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
              <Printer className="w-3.5 h-3.5" /> Print
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/80">
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Site</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider hidden sm:table-cell">Labour</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider hidden sm:table-cell">Material</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider hidden md:table-cell">Other</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Total</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider hidden md:table-cell">By</th>
                    <th className="px-4 py-3 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/60">
                  {paginated.map((record) => {
                    const presentEntries = record.labourEntries.filter(e => e.present)
                    const unpaidCount = presentEntries.filter(e => !e.isPaid).length
                    const hasAdvances = record.labourAdvances.length > 0
                    // Display reclassification: advances (stored in OtherExpense) shown under Labour.
                    // Use advanceInOther (from OtherExpense table) as the authoritative amount —
                    // labourAdvances is for grouping display only, not for re-summing totals.
                    const advanceInOther = record.otherExpenses
                      .filter(e => e.category === 'Advance')
                      .reduce((s, e) => s + e.amount, 0)
                    const labourDisplayTotal = record.totalLabour + advanceInOther
                    const otherDisplayTotal = record.totalOther - advanceInOther

                    return (
                      <Fragment key={record.id}>
                        {/* Main Row */}
                        <tr
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
                          <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400 tabular-nums">
                                {formatCurrency(labourDisplayTotal)}
                              </span>
                              {/* Show unpaid indicator in Labour column */}
                              {unpaidCount > 0 && (
                                <span className="text-[10px] font-bold text-red-500 dark:text-red-400 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {unpaidCount} unpaid
                                </span>
                              )}
                              {hasAdvances && (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                  <CreditCard className="w-2.5 h-2.5" />
                                  advance
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatCurrency(record.totalMaterial)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right hidden md:table-cell">
                            <span className="text-sm font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                              {formatCurrency(otherDisplayTotal)}
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
                                <div className="grid sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-indigo-100 dark:divide-indigo-900/30">

                                  {/* ── Labour Section ─────────────────────────────── */}
                                  <div className="px-6 py-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                        <Users className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                      </div>
                                      <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Labour</span>
                                      <div className="ml-auto text-right">
                                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                                          {formatCurrency(labourDisplayTotal)}
                                        </div>
                                        {unpaidCount > 0 && record.totalLabour > 0 && (
                                          <div className="text-[9px] text-gray-400 dark:text-slate-500">
                                            {formatCurrency(record.totalLabour)} paid so far
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {presentEntries.length === 0 && record.labourAdvances.length === 0 ? (
                                      <p className="text-xs text-gray-300 dark:text-slate-600 italic">No labour entries</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {/* Attendance entries — paid or unpaid */}
                                        {presentEntries.map(e => (
                                          <div key={e.id} className={cn(
                                            'flex items-start justify-between gap-2 rounded-lg px-2 py-1.5',
                                            e.isPaid
                                              ? 'bg-emerald-50 dark:bg-emerald-900/15'
                                              : 'bg-red-50 dark:bg-red-900/15'
                                          )}>
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 truncate">
                                                  {e.labour.name}
                                                </p>
                                                {/* PAID / UNPAID badge */}
                                                {e.isPaid ? (
                                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex-shrink-0">
                                                    <CheckCircle className="w-2 h-2" /> Paid
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 uppercase tracking-wide flex-shrink-0">
                                                    <Clock className="w-2 h-2" /> Unpaid
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-[10px] text-gray-400 dark:text-slate-500">{e.labour.designation} · ₹{e.rate}/day</p>
                                            </div>
                                            <span className={cn(
                                              'text-xs font-bold tabular-nums flex-shrink-0',
                                              e.isPaid
                                                ? 'text-emerald-700 dark:text-emerald-400'
                                                : 'text-red-600 dark:text-red-400'
                                            )}>
                                              {formatCurrency(e.cost)}
                                            </span>
                                          </div>
                                        ))}

                                        {/* Advances — shown under Labour with yellow styling */}
                                        {record.labourAdvances.map(adv => (
                                          <div key={adv.id} className="flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 bg-amber-50 dark:bg-amber-900/15">
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 truncate">
                                                  {adv.labour.name}
                                                </p>
                                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-500 uppercase tracking-wide flex-shrink-0">
                                                  <CreditCard className="w-2 h-2" /> Advance
                                                </span>
                                                {adv.isSettled && (
                                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex-shrink-0">
                                                    <CheckCircle className="w-2 h-2" /> Settled
                                                  </span>
                                                )}
                                              </div>
                                              {adv.reason && (
                                                <p className="text-[10px] text-gray-400 dark:text-slate-500">{adv.reason}</p>
                                              )}
                                            </div>
                                            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 tabular-nums flex-shrink-0">
                                              {formatCurrency(adv.amount)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* ── Materials Section ───────────────────────────── */}
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

                                  {/* ── Other Section (advances excluded — shown in Labour) ── */}
                                  <div className="px-6 py-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                                        <Coins className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                                      </div>
                                      <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Other</span>
                                      <span className="ml-auto text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                        {formatCurrency(otherDisplayTotal)}
                                      </span>
                                    </div>
                                    {/* Filter out "Advance" category — advances are shown in Labour section */}
                                    {record.otherExpenses.filter(e => e.category !== 'Advance').length === 0 ? (
                                      <p className="text-xs text-gray-300 dark:text-slate-600 italic">No other expenses</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {record.otherExpenses
                                          .filter(e => e.category !== 'Advance')
                                          .map(e => (
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
                      </Fragment>
                    )
                  })}
                </tbody>

                {/* Totals Footer */}
                <tfoot>
                  <tr className="border-t-2 border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/80">
                    <td colSpan={2} className="px-5 py-3.5">
                      <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Totals — {filtered.length} records
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">{formatCurrency(totals.labour)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(totals.material)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right hidden md:table-cell">
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-slate-700">
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Showing <span className="font-semibold text-gray-600 dark:text-slate-300">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-semibold text-gray-600 dark:text-slate-300">{filtered.length}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p = i + 1
                    if (totalPages > 5) {
                      if (page > 3) p = page - 2 + i
                      if (page > totalPages - 2) p = totalPages - 4 + i
                    }
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={cn('w-8 h-8 rounded-lg text-xs font-semibold transition-colors',
                          p === page ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700')}>
                        {p}
                      </button>
                    )
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors">
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
