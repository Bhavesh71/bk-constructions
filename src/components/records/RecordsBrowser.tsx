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
  const [printModalOpen, setPrintModalOpen] = useState(false)

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

  function printRecords(theme: 'light' | 'dark') {
    const siteName    = siteFilter ? (sites.find(s => s.id === siteFilter)?.name ?? 'All Sites') : 'All Sites'
    const periodFrom  = dateFrom ? new Date(dateFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'All time'
    const periodTo    = dateTo   ? new Date(dateTo).toLocaleDateString('en-IN',   { day: 'numeric', month: 'short', year: 'numeric' }) : 'Present'
    const generatedOn = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

    const L = theme === 'light'

    const C = {
      pageBg:       L ? '#f4f6fb'  : '#0b0e17',
      coverBg:      L ? '#1e1b4b'  : '#0f0e1a',
      coverAccent:  L ? '#4338ca'  : '#312e81',
      coverText:    L ? '#ffffff'  : '#e0e7ff',
      coverSub:     L ? 'rgba(255,255,255,.55)' : 'rgba(180,170,255,.5)',
      cardBg:       L ? '#ffffff'  : '#131926',
      cardBorder:   L ? '#e2e8f0'  : '#1e2a3e',
      secBg:        L ? '#f1f5f9'  : '#1a2235',
      secText:      L ? '#475569'  : '#6b7fa0',
      rowA:         L ? '#ffffff'  : '#131926',
      rowB:         L ? '#f8fafc'  : '#171f30',
      rowDivide:    L ? '#f1f5f9'  : '#1e2a3e',
      primary:      L ? '#0f172a'  : '#dde4f0',
      muted:        L ? '#64748b'  : '#7a90b0',
      faint:        L ? '#94a3b8'  : '#3d5070',
      indigo:       L ? '#4338ca'  : '#818cf8',
      green:        L ? '#047857'  : '#34d399',
      amber:        L ? '#b45309'  : '#fbbf24',
      paidFg:       L ? '#166534'  : '#86efac',
      paidBg:       L ? '#dcfce7'  : '#052e16',
      unpaidFg:     L ? '#991b1b'  : '#fca5a5',
      unpaidBg:     L ? '#fee2e2'  : '#3b0f0f',
      advFg:        L ? '#78350f'  : '#fcd34d',
      advBg:        L ? '#fef3c7'  : '#1c1100',
      settledFg:    L ? '#166534'  : '#86efac',
      settledBg:    L ? '#dcfce7'  : '#052e16',
      totalsBg:     L ? '#eef2ff'  : '#181735',
      totalsText:   L ? '#3730a3'  : '#a5b4fc',
      footerBorder: L ? '#e2e8f0'  : '#1e2a3e',
      footerText:   L ? '#94a3b8'  : '#3d5070',
    }

    const inr = (n: number) => `&#8377;${Math.round(n).toLocaleString('en-IN')}`

    const pill = (label: string, bg: string, fg: string) =>
      `<span style="display:inline-block;font-size:8px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:2px 7px;border-radius:99px;background:${bg};color:${fg}">${label}</span>`

    const secHead = (icon: string, label: string, amt: number, color: string) =>
      `<tr><td colspan="3" style="padding:7px 14px;background:${C.secBg};font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:${C.secText};border-top:2px solid ${C.cardBorder}">${icon}&nbsp;&nbsp;${label}</td><td style="padding:7px 14px;text-align:right;background:${C.secBg};font-size:11px;font-weight:800;color:${color};border-top:2px solid ${C.cardBorder};font-variant-numeric:tabular-nums">${inr(amt)}</td></tr>`

    const subtotal = (label: string, amt: number, color: string) =>
      `<tr><td colspan="3" style="padding:6px 14px 6px 24px;background:${C.totalsBg};font-size:9px;font-weight:700;color:${color}">&#8627; ${label}</td><td style="padding:6px 14px;text-align:right;background:${C.totalsBg};font-size:10px;font-weight:800;color:${color};font-variant-numeric:tabular-nums">${inr(amt)}</td></tr>`

    const thead = (cols: Array<{l:string, r?:boolean}>) =>
      `<tr>${cols.map(c => `<th style="padding:5px 14px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:${C.faint};text-align:${c.r?'right':'left'};background:${C.secBg};border-bottom:1px solid ${C.cardBorder}">${c.l}</th>`).join('')}</tr>`

    const td  = (v: string, bg: string, x = '') => `<td style="padding:6px 14px;font-size:10px;color:${C.primary};background:${bg};border-bottom:1px solid ${C.rowDivide};${x}">${v}</td>`
    const tdM = (v: string, bg: string, x = '') => `<td style="padding:6px 14px;font-size:10px;color:${C.muted};background:${bg};border-bottom:1px solid ${C.rowDivide};${x}">${v}</td>`
    const tdR = (v: string, bg: string, color: string) => `<td style="padding:6px 14px;font-size:10px;font-weight:700;text-align:right;color:${color};background:${bg};border-bottom:1px solid ${C.rowDivide};font-variant-numeric:tabular-nums">${v}</td>`

    const recordCards = filtered.map(r => {
      const advAmt      = r.otherExpenses.filter(e => e.category === 'Advance').reduce((s, e) => s + e.amount, 0)
      const labourTotal = r.totalLabour + advAmt
      const otherTotal  = r.totalOther  - advAmt
      const present     = r.labourEntries.filter(e => e.present)
      const hasL        = present.length > 0 || r.labourAdvances.length > 0
      const hasM        = r.materialEntries.length > 0
      const otherExp    = r.otherExpenses.filter(e => e.category !== 'Advance')
      const hasO        = otherExp.length > 0

      const labourRows = present.map((e, i) => {
        const bg = i % 2 === 0 ? C.rowA : C.rowB
        return `<tr>${td(`<b>${e.labour.name}</b>`, bg)}${tdM(e.labour.designation, bg)}${td(e.isPaid ? pill('Paid', C.paidBg, C.paidFg) : pill('Unpaid', C.unpaidBg, C.unpaidFg), bg)}${tdR(inr(e.cost), bg, C.primary)}</tr>`
      }).join('')

      const advRows = r.labourAdvances.map(adv => {
        return `<tr>${td(`<b>${adv.labour.name}</b>`, C.advBg)}${tdM(`Advance${adv.reason ? ' \u2014 ' + adv.reason : ''}`, C.advBg)}${td(adv.isSettled ? pill('Settled', C.settledBg, C.settledFg) : pill('Pending', C.advBg, C.advFg), C.advBg)}${tdR(inr(adv.amount), C.advBg, C.amber)}</tr>`
      }).join('')

      const matRows = r.materialEntries.map((e, i) => {
        const bg = i % 2 === 0 ? C.rowA : C.rowB
        return `<tr>${td(`<b>${e.material.name}</b>`, bg)}${tdM(e.material.category, bg)}${tdM(`${e.quantity} ${e.material.unit} \u00d7 ${inr(e.rate)}`, bg)}${tdR(inr(e.total), bg, C.primary)}</tr>`
      }).join('')

      const otherRows = otherExp.map((e, i) => {
        const bg = i % 2 === 0 ? C.rowA : C.rowB
        return `<tr>${td(`<b>${e.category}</b>`, bg)}${tdM(e.description || '\u2014', bg, 'colspan="2"')}${tdR(inr(e.amount), bg, C.primary)}</tr>`
      }).join('')

      return `<div style="background:${C.cardBg};border:1px solid ${C.cardBorder};border-radius:10px;overflow:hidden;margin-bottom:14px;page-break-inside:avoid">
<table style="width:100%;border-collapse:collapse"><tr>
<td style="padding:13px 16px;background:${C.coverAccent};vertical-align:middle">
<div style="font-size:13px;font-weight:800;color:#fff;letter-spacing:-.01em">${formatDate(r.date)}</div>
<div style="font-size:8.5px;color:rgba(255,255,255,.6);margin-top:3px">${r.site.name} \u00b7 ${r.site.location} \u00b7 ${r.createdBy.name}</div>
</td>
<td style="padding:13px 16px;background:${C.coverAccent};text-align:right;vertical-align:middle;white-space:nowrap">
<div style="font-size:8px;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.55);margin-bottom:3px">Grand Total</div>
<div style="font-size:22px;font-weight:900;color:#fff;font-variant-numeric:tabular-nums;letter-spacing:-.03em">${inr(r.grandTotal)}</div>
</td></tr></table>
<table style="width:100%;border-collapse:collapse;border-bottom:1px solid ${C.cardBorder}"><tr>
<td style="padding:8px 16px;width:33.3%;border-right:1px solid ${C.cardBorder}"><div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.08em;color:${C.faint};font-weight:700;margin-bottom:3px">Labour</div><div style="font-size:12px;font-weight:800;color:${C.indigo};font-variant-numeric:tabular-nums">${inr(labourTotal)}</div></td>
<td style="padding:8px 16px;width:33.3%;border-right:1px solid ${C.cardBorder}"><div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.08em;color:${C.faint};font-weight:700;margin-bottom:3px">Material</div><div style="font-size:12px;font-weight:800;color:${C.green};font-variant-numeric:tabular-nums">${inr(r.totalMaterial)}</div></td>
<td style="padding:8px 16px;width:33.4%"><div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.08em;color:${C.faint};font-weight:700;margin-bottom:3px">Other</div><div style="font-size:12px;font-weight:800;color:${C.amber};font-variant-numeric:tabular-nums">${inr(otherTotal)}</div></td>
</tr></table>
${hasL ? `<table style="width:100%;border-collapse:collapse;table-layout:fixed"><colgroup><col style="width:24%"><col style="width:28%"><col style="width:18%"><col style="width:30%"></colgroup>${secHead('\u2692', 'Labour &amp; Advances', labourTotal, C.indigo)}${thead([{l:'Name'},{l:'Designation'},{l:'Status'},{l:'Amount',r:true}])}${labourRows}${advRows}${subtotal('Labour subtotal', labourTotal, C.indigo)}</table>` : ''}
${hasM ? `<table style="width:100%;border-collapse:collapse;table-layout:fixed"><colgroup><col style="width:28%"><col style="width:22%"><col style="width:24%"><col style="width:26%"></colgroup>${secHead('\u{1F9F1}', 'Materials', r.totalMaterial, C.green)}${thead([{l:'Material'},{l:'Category'},{l:'Qty \u00d7 Rate'},{l:'Amount',r:true}])}${matRows}${subtotal('Material subtotal', r.totalMaterial, C.green)}</table>` : ''}
${hasO ? `<table style="width:100%;border-collapse:collapse;table-layout:fixed"><colgroup><col style="width:24%"><col style="width:46%"><col style="width:0%"><col style="width:30%"></colgroup>${secHead('\u{1F4B8}', 'Other Expenses', otherTotal, C.amber)}${thead([{l:'Category'},{l:'Description'},{l:''},{l:'Amount',r:true}])}${otherRows}${subtotal('Other subtotal', otherTotal, C.amber)}</table>` : ''}
${r.notes ? `<div style="padding:7px 16px;background:${C.secBg};border-top:1px solid ${C.cardBorder};font-size:8.5px;font-style:italic;color:${C.muted}">\ud83d\udcdd\u00a0 ${r.notes}</div>` : ''}
</div>`
    }).join('')

    const summaryCard = `<div style="background:${C.cardBg};border:1px solid ${C.cardBorder};border-radius:10px;overflow:hidden;margin-bottom:20px">
<table style="width:100%;border-collapse:collapse">
<thead><tr style="background:${C.secBg}">
<th style="padding:8px 14px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${C.faint};text-align:left;border-bottom:1px solid ${C.cardBorder}">Category</th>
<th style="padding:8px 14px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${C.faint};text-align:right;border-bottom:1px solid ${C.cardBorder}">Amount</th>
<th style="padding:8px 14px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${C.faint};text-align:right;border-bottom:1px solid ${C.cardBorder};width:70px">Records</th>
</tr></thead>
<tbody>
<tr><td style="padding:10px 14px;font-size:11px;font-weight:600;color:${C.indigo};border-bottom:1px solid ${C.rowDivide}">Labour &amp; Advances</td><td style="padding:10px 14px;text-align:right;font-size:11px;font-weight:700;color:${C.indigo};border-bottom:1px solid ${C.rowDivide};font-variant-numeric:tabular-nums">${inr(totals.labour)}</td><td style="padding:10px 14px;text-align:right;font-size:10px;color:${C.muted};border-bottom:1px solid ${C.rowDivide}">${filtered.filter(r=>r.totalLabour>0||r.labourAdvances.length>0).length}</td></tr>
<tr style="background:${C.rowB}"><td style="padding:10px 14px;font-size:11px;font-weight:600;color:${C.green};border-bottom:1px solid ${C.rowDivide}">Materials</td><td style="padding:10px 14px;text-align:right;font-size:11px;font-weight:700;color:${C.green};border-bottom:1px solid ${C.rowDivide};font-variant-numeric:tabular-nums">${inr(totals.material)}</td><td style="padding:10px 14px;text-align:right;font-size:10px;color:${C.muted};border-bottom:1px solid ${C.rowDivide}">${filtered.filter(r=>r.totalMaterial>0).length}</td></tr>
<tr><td style="padding:10px 14px;font-size:11px;font-weight:600;color:${C.amber};border-bottom:1px solid ${C.rowDivide}">Other Expenses</td><td style="padding:10px 14px;text-align:right;font-size:11px;font-weight:700;color:${C.amber};border-bottom:1px solid ${C.rowDivide};font-variant-numeric:tabular-nums">${inr(totals.other)}</td><td style="padding:10px 14px;text-align:right;font-size:10px;color:${C.muted};border-bottom:1px solid ${C.rowDivide}">${filtered.filter(r=>r.totalOther>0).length}</td></tr>
<tr style="background:${C.totalsBg}"><td style="padding:12px 14px;font-size:13px;font-weight:900;color:${C.totalsText};letter-spacing:-.01em">Grand Total</td><td style="padding:12px 14px;text-align:right;font-size:17px;font-weight:900;color:${C.totalsText};font-variant-numeric:tabular-nums;letter-spacing:-.02em">${inr(totals.grand)}</td><td style="padding:12px 14px;text-align:right;font-size:10px;font-weight:700;color:${C.totalsText}">${filtered.length}&nbsp;days</td></tr>
</tbody></table></div>`

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>BK Constructions \u2014 Expense Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap"/>
<style>
@page{size:A4 portrait;margin:14mm 12mm 16mm 12mm;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{font-family:'DM Sans',system-ui,sans-serif;font-size:11px;background:${C.pageBg};color:${C.primary};-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
table{border-collapse:collapse;width:100%;}b{color:inherit;}
@media screen{body{padding:32px;max-width:794px;margin:0 auto;}}
@media print{body{padding:0;background:${C.pageBg}!important;}.no-print{display:none!important;}}
</style>
</head>
<body>
<table style="margin-bottom:20px;border-radius:12px;overflow:hidden"><tr>
<td style="background:${C.coverBg};padding:20px 22px;vertical-align:top;width:58%">
<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
<div style="width:36px;height:36px;background:${C.coverAccent};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px">\ud83c\udfd7</div>
<div><div style="font-size:15px;font-weight:800;color:${C.coverText};letter-spacing:-.02em;line-height:1.1">BK Constructions</div>
<div style="font-size:8px;color:${C.coverSub};text-transform:uppercase;letter-spacing:.1em;font-weight:600;margin-top:2px">Daily Expense Report</div></div></div>
<table style="border-collapse:collapse"><tr>
<td style="padding-right:16px;vertical-align:top"><div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.09em;color:${C.coverSub};font-weight:700;margin-bottom:4px">Site</div><div style="font-size:11px;font-weight:700;color:${C.coverText}">${siteName}</div></td>
<td style="padding-right:16px;vertical-align:top"><div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.09em;color:${C.coverSub};font-weight:700;margin-bottom:4px">Period</div><div style="font-size:10px;font-weight:600;color:${C.coverText}">${periodFrom} \u2014 ${periodTo}</div></td>
<td style="vertical-align:top"><div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.09em;color:${C.coverSub};font-weight:700;margin-bottom:4px">Records</div><div style="font-size:11px;font-weight:700;color:${C.coverText}">${filtered.length}</div></td>
</tr></table>
</td>
<td style="background:${C.coverAccent};padding:20px 22px;text-align:right;vertical-align:bottom">
<div style="font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.5);margin-bottom:6px">Total Expenditure</div>
<div style="font-size:28px;font-weight:900;color:#fff;font-variant-numeric:tabular-nums;letter-spacing:-.03em;line-height:1">${inr(totals.grand)}</div>
<div style="margin-top:16px;display:flex;gap:12px;justify-content:flex-end">
<div style="text-align:center"><div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.45);margin-bottom:3px">Labour</div><div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.85);font-variant-numeric:tabular-nums">${inr(totals.labour)}</div></div>
<div style="width:1px;background:rgba(255,255,255,.15)"></div>
<div style="text-align:center"><div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.45);margin-bottom:3px">Material</div><div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.85);font-variant-numeric:tabular-nums">${inr(totals.material)}</div></div>
<div style="width:1px;background:rgba(255,255,255,.15)"></div>
<div style="text-align:center"><div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.45);margin-bottom:3px">Other</div><div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.85);font-variant-numeric:tabular-nums">${inr(totals.other)}</div></div>
</div>
</td></tr></table>
<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div style="font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:${C.faint}">Summary</div><div style="flex:1;height:1px;background:${C.cardBorder}"></div></div>
${summaryCard}
<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;margin-top:4px"><div style="font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:${C.faint}">Daily Breakdown \u2014 ${filtered.length} Record${filtered.length !== 1 ? 's' : ''}</div><div style="flex:1;height:1px;background:${C.cardBorder}"></div></div>
${recordCards}
<table style="margin-top:8px;border-top:1px solid ${C.footerBorder}" class="no-print"><tr>
<td style="padding:10px 0 0;font-size:8px;color:${C.footerText}">BK Constructions \u2014 Confidential \u2014 Internal use only</td>
<td style="padding:10px 0 0;text-align:right;font-size:8px;color:${C.footerText}">${filtered.length} record(s) \u00b7 Printed ${generatedOn}</td>
</tr></table>
</body></html>`

    const w = window.open('', '_blank')
    if (!w) { toast.error('Allow popups to open the print preview'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print() }, 900)
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
    <>
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
              <FileText className="w-3.5 h-3.5" /> <span>CSV</span>
            </button>
            <button onClick={exportExcel} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 transition-colors">
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Exporting...' : 'Excel'}
            </button>
            <button onClick={() => setPrintModalOpen(true)}
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

      {/* ── Print Options Modal ─────────────────────────────────────── */}
      {printModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }} onClick={() => setPrintModalOpen(false)} />
          <div className="relative w-full max-w-sm overflow-hidden animate-slide-up"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-base)', borderRadius: '20px', boxShadow: 'var(--shadow-xl)' }}
            role="dialog" aria-modal="true" aria-labelledby="print-modal-title">

            <div style={{ background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)', padding: '20px 24px' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.18)' }}>
                  <Printer className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 id="print-modal-title" className="text-sm font-bold text-white">Print / Download PDF</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(199,210,254,0.75)' }}>
                    {filtered.length} record{filtered.length !== 1 ? 's' : ''} &nbsp;&middot;&nbsp; A4 format
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Choose a theme</p>

              <button onClick={() => { setPrintModalOpen(false); printRecords('light') }}
                className="w-full text-left rounded-xl overflow-hidden transition-all duration-150 group"
                style={{ border: '1.5px solid var(--border-base)' }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px 10px' }}>
                  <div style={{ height: '8px', width: '55%', borderRadius: '4px', background: '#4338ca', marginBottom: '7px' }} />
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
                    {['#e0e7ff','#dcfce7','#fef3c7','#fce7f3'].map(c =>
                      <div key={c} style={{ height: '18px', flex: 1, borderRadius: '4px', background: c }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {['100%','80%','65%'].map(w => <div key={w} style={{ height: '5px', borderRadius: '3px', background: '#e2e8f0', width: w }} />)}
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border-subtle)' }}>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>☀️ Light Theme</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>White background — ideal for printing on paper</p>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--brand)' }} />
                </div>
              </button>

              <button onClick={() => { setPrintModalOpen(false); printRecords('dark') }}
                className="w-full text-left rounded-xl overflow-hidden transition-all duration-150 group"
                style={{ border: '1.5px solid var(--border-base)' }}>
                <div style={{ background: '#0d1117', padding: '12px 14px 10px' }}>
                  <div style={{ height: '8px', width: '55%', borderRadius: '4px', background: '#4338ca', marginBottom: '7px' }} />
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
                    {['#1e1b4b','#052e16','#1c1402','#2d1b3d'].map(c =>
                      <div key={c} style={{ height: '18px', flex: 1, borderRadius: '4px', background: c, border: '1px solid rgba(255,255,255,0.08)' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {['100%','80%','65%'].map(w => <div key={w} style={{ height: '5px', borderRadius: '3px', background: '#1f2937', width: w }} />)}
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border-subtle)' }}>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>🌙 Dark Theme</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Deep dark — great for digital screens &amp; saving ink</p>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--brand)' }} />
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between px-5 pb-5" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Opens in new tab → print dialog → save as PDF</p>
              <button onClick={() => setPrintModalOpen(false)} className="btn-ghost text-xs py-1.5 px-3">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
