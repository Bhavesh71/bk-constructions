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
    const siteName = siteFilter ? sites.find(s => s.id === siteFilter)?.name : 'All Sites'
    const period = `${dateFrom || 'All'} to ${dateTo || 'All'}`
    const isLight = theme === 'light'

    // ── Theme tokens ──────────────────────────────────────────────────────
    const t = isLight ? {
      pageBg:       '#f8fafc',
      cardBg:       '#ffffff',
      cardBorder:   '#e2e8f0',
      accent:       '#4F46E5',
      accentLight:  '#eef2ff',
      accentMuted:  '#6366f1',
      text:         '#0f172a',
      textMuted:    '#64748b',
      textFaint:    '#94a3b8',
      headerBg:     'linear-gradient(135deg,#4F46E5 0%,#6366f1 100%)',
      headerText:   '#ffffff',
      sectionBg:    '#f1f5f9',
      sectionText:  '#475569',
      rowAlt:       '#f8fafc',
      rowBorder:    '#f1f5f9',
      subtotalBg:   '#eef2ff',
      subtotalText: '#3730a3',
      paidBg:       '#f0fdf4', paidText: '#166534',
      unpaidBg:     '#fff7ed', unpaidText:'#9a3412',
      advBg:        '#fffbeb', advText:   '#92400e',
      summaryHead:  'linear-gradient(135deg,#4F46E5,#6366f1)',
      grandBg:      '#eef2ff', grandText: '#3730a3',
      notesBg:      '#f8fafc', notesBorder:'#e2e8f0',
      footerText:   '#94a3b8',
      shadow:       '0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.04)',
    } : {
      pageBg:       '#0f1117',
      cardBg:       '#1a1d27',
      cardBorder:   '#2d3148',
      accent:       '#818cf8',
      accentLight:  '#1e2040',
      accentMuted:  '#a5b4fc',
      text:         '#e2e8f0',
      textMuted:    '#94a3b8',
      textFaint:    '#475569',
      headerBg:     'linear-gradient(135deg,#312e81 0%,#4338ca 100%)',
      headerText:   '#e0e7ff',
      sectionBg:    '#13151f',
      sectionText:  '#64748b',
      rowAlt:       '#1e2130',
      rowBorder:    '#252838',
      subtotalBg:   '#1e2040',
      subtotalText: '#a5b4fc',
      paidBg:       '#052e16', paidText: '#86efac',
      unpaidBg:     '#431407', unpaidText:'#fdba74',
      advBg:        '#2d2006', advText:   '#fcd34d',
      summaryHead:  'linear-gradient(135deg,#312e81,#4338ca)',
      grandBg:      '#1e2040', grandText: '#a5b4fc',
      notesBg:      '#13151f', notesBorder:'#2d3148',
      footerText:   '#475569',
      shadow:       '0 1px 3px rgba(0,0,0,.4),0 1px 2px rgba(0,0,0,.3)',
    }

    // ── Per-record HTML ───────────────────────────────────────────────────
    const recordsHtml = filtered.map((r, ri) => {
      const advanceInOther = r.otherExpenses
        .filter(e => e.category === 'Advance')
        .reduce((s, e) => s + e.amount, 0)
      const labourDisplay  = r.totalLabour + advanceInOther
      const otherDisplay   = r.totalOther  - advanceInOther
      const presentEntries = r.labourEntries.filter(e => e.present)

      const badge = (text: string, bg: string, color: string) =>
        `<span style="display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:700;padding:2px 7px;border-radius:999px;background:${bg};color:${color};text-transform:uppercase;letter-spacing:.04em">${text}</span>`

      const labourRows = presentEntries.map((e, i) => `
        <tr style="background:${i % 2 === 0 ? t.cardBg : t.rowAlt}">
          <td style="padding:7px 14px;color:${t.text};font-weight:600">${e.labour.name}</td>
          <td style="padding:7px 14px;color:${t.textMuted};font-size:11px">${e.labour.designation}</td>
          <td style="padding:7px 14px">${e.isPaid
            ? badge('✓ Paid', t.paidBg, t.paidText)
            : badge('⏳ Unpaid', t.unpaidBg, t.unpaidText)}</td>
          <td style="padding:7px 14px;text-align:right;font-weight:700;color:${t.text};font-variant-numeric:tabular-nums">₹${e.cost.toLocaleString('en-IN')}</td>
        </tr>`).join('')

      const advanceRows = r.labourAdvances.map((adv, i) => `
        <tr style="background:${t.advBg}">
          <td style="padding:7px 14px;color:${t.text};font-weight:600">${adv.labour.name}</td>
          <td style="padding:7px 14px;color:${t.textMuted};font-size:11px">Advance${adv.reason ? ' — ' + adv.reason : ''}</td>
          <td style="padding:7px 14px">${adv.isSettled
            ? badge('✓ Settled', t.paidBg, t.paidText)
            : badge('Pending', t.advBg, t.advText)}</td>
          <td style="padding:7px 14px;text-align:right;font-weight:700;color:${t.advText};font-variant-numeric:tabular-nums">₹${adv.amount.toLocaleString('en-IN')}</td>
        </tr>`).join('')

      const materialRows = r.materialEntries.map((e, i) => `
        <tr style="background:${i % 2 === 0 ? t.cardBg : t.rowAlt}">
          <td style="padding:7px 14px;color:${t.text};font-weight:600">${e.material.name}</td>
          <td style="padding:7px 14px;color:${t.textMuted};font-size:11px">${e.material.category}</td>
          <td style="padding:7px 14px;color:${t.textMuted};font-size:11px">${e.quantity} ${e.material.unit} × ₹${e.rate.toLocaleString('en-IN')}</td>
          <td style="padding:7px 14px;text-align:right;font-weight:700;color:${t.text};font-variant-numeric:tabular-nums">₹${e.total.toLocaleString('en-IN')}</td>
        </tr>`).join('')

      const otherRows = r.otherExpenses
        .filter(e => e.category !== 'Advance')
        .map((e, i) => `
        <tr style="background:${i % 2 === 0 ? t.cardBg : t.rowAlt}">
          <td style="padding:7px 14px;color:${t.text};font-weight:600">${e.category}</td>
          <td style="padding:7px 14px;color:${t.textMuted};font-size:11px" colspan="2">${e.description || '—'}</td>
          <td style="padding:7px 14px;text-align:right;font-weight:700;color:${t.text};font-variant-numeric:tabular-nums">₹${e.amount.toLocaleString('en-IN')}</td>
        </tr>`).join('')

      const sectionLabel = (icon: string, label: string, total: number, color: string) => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:${t.sectionBg};border-top:1px solid ${t.cardBorder};border-bottom:1px solid ${t.cardBorder}">
          <span style="font-size:13px">${icon}</span>
          <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:${t.sectionText}">${label}</span>
          <span style="margin-left:auto;font-size:12px;font-weight:800;color:${color};font-variant-numeric:tabular-nums">₹${total.toLocaleString('en-IN')}</span>
        </div>`

      const subtotalRow = (label: string, amount: number) => `
        <tr style="background:${t.subtotalBg}">
          <td colspan="3" style="padding:7px 14px;font-weight:700;font-size:11px;color:${t.subtotalText}">${label}</td>
          <td style="padding:7px 14px;text-align:right;font-weight:800;color:${t.subtotalText};font-variant-numeric:tabular-nums">₹${amount.toLocaleString('en-IN')}</td>
        </tr>`

      return `
        <div style="background:${t.cardBg};border:1px solid ${t.cardBorder};border-radius:12px;margin-bottom:18px;overflow:hidden;box-shadow:${t.shadow};page-break-inside:avoid">
          <!-- Day Header -->
          <div style="background:${t.headerBg};padding:12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:14px">📅</div>
              <div>
                <div style="font-weight:800;font-size:14px;color:${t.headerText}">${formatDate(r.date)}</div>
                <div style="font-size:10px;color:rgba(255,255,255,.7);margin-top:1px">${r.site.name} · ${r.site.location}</div>
              </div>
            </div>
            <div style="margin-left:auto;text-align:right">
              <div style="font-size:10px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.06em">Grand Total</div>
              <div style="font-size:18px;font-weight:900;color:#ffffff;font-variant-numeric:tabular-nums">₹${r.grandTotal.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <!-- Stat Pills -->
          <div style="display:flex;gap:6px;padding:10px 14px;background:${t.accentLight};border-bottom:1px solid ${t.cardBorder};flex-wrap:wrap">
            <div style="background:${t.cardBg};border:1px solid ${t.cardBorder};border-radius:8px;padding:5px 10px;text-align:center;min-width:70px">
              <div style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:${t.textFaint};font-weight:700">Labour</div>
              <div style="font-size:13px;font-weight:800;color:#6366f1;font-variant-numeric:tabular-nums">₹${labourDisplay.toLocaleString('en-IN')}</div>
            </div>
            <div style="background:${t.cardBg};border:1px solid ${t.cardBorder};border-radius:8px;padding:5px 10px;text-align:center;min-width:70px">
              <div style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:${t.textFaint};font-weight:700">Material</div>
              <div style="font-size:13px;font-weight:800;color:#10b981;font-variant-numeric:tabular-nums">₹${r.totalMaterial.toLocaleString('en-IN')}</div>
            </div>
            <div style="background:${t.cardBg};border:1px solid ${t.cardBorder};border-radius:8px;padding:5px 10px;text-align:center;min-width:70px">
              <div style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:${t.textFaint};font-weight:700">Other</div>
              <div style="font-size:13px;font-weight:800;color:#f59e0b;font-variant-numeric:tabular-nums">₹${otherDisplay.toLocaleString('en-IN')}</div>
            </div>
            ${r.notes ? `<div style="flex:1;background:${t.cardBg};border:1px solid ${t.cardBorder};border-radius:8px;padding:5px 10px;display:flex;align-items:center;gap:5px"><span style="font-size:10px">📝</span><span style="font-size:10px;color:${t.textMuted};font-style:italic">${r.notes}</span></div>` : ''}
          </div>

          ${(presentEntries.length > 0 || r.labourAdvances.length > 0) ? `
          ${sectionLabel('👷', 'Labour & Advances', labourDisplay, '#818cf8')}
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:${t.sectionBg}">
              <th style="padding:6px 14px;text-align:left;font-size:10px;font-weight:700;color:${t.textFaint};text-transform:uppercase;letter-spacing:.06em">Name</th>
              <th style="padding:6px 14px;text-align:left;font-size:10px;font-weight:700;color:${t.textFaint};text-transform:uppercase;letter-spacing:.06em">Designation</th>
              <th style="padding:6px 14px;text-align:left;font-size:10px;font-weight:700;color:${t.textFaint};text-transform:uppercase;letter-spacing:.06em">Status</th>
              <th style="padding:6px 14px;text-align:right;font-size:10px;font-weight:700;color:${t.textFaint};text-transform:uppercase;letter-spacing:.06em">Amount</th>
            </tr></thead>
            <tbody>${labourRows}${advanceRows}${subtotalRow('Labour + Advances Total', labourDisplay)}</tbody>
          </table>` : ''}

          ${r.materialEntries.length > 0 ? `
          ${sectionLabel('🧱', 'Materials', r.totalMaterial, '#10b981')}
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:${t.sectionBg}">
              <th style="padding:6px 14px;text-align:left;font-size:10px;font-weight:700;color:${t.textFaint};text-transform:uppercase;letter-spacing:.06em">Material</th>
              <th style="padding:6px 14px;text-align:left;font-size:10px;font-weight:700;color:${t.textFaint};text-transform:uppercase;letter-spacing:.06em">Category</th>
              <th style="padding:6px 14px;text-align:left;font-size:10px;font-weight:700;color:${t.textFaint};text-transform:uppercase;letter-spacing:.06em">Qty × Rate</th>
              <th style="padding:6px 14px;text-align:right;font-size:10px;font-weight:700;color:${t.textFaint};text-transform:uppercase;letter-spacing:.06em">Amount</th>
            </tr></thead>
            <tbody>${materialRows}${subtotalRow('Material Total', r.totalMaterial)}</tbody>
          </table>` : ''}

          ${r.otherExpenses.filter(e => e.category !== 'Advance').length > 0 ? `
          ${sectionLabel('💰', 'Other Expenses', otherDisplay, '#f59e0b')}
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:${t.sectionBg}">
              <th style="padding:6px 14px;text-align:left;font-size:10px;font-weight:700;color:${t.textFaint};text-transform:uppercase;letter-spacing:.06em">Category</th>
              <th colspan="2" style="padding:6px 14px;text-align:left;font-size:10px;font-weight:700;color:${t.textFaint};text-transform:uppercase;letter-spacing:.06em">Description</th>
              <th style="padding:6px 14px;text-align:right;font-size:10px;font-weight:700;color:${t.textFaint};text-transform:uppercase;letter-spacing:.06em">Amount</th>
            </tr></thead>
            <tbody>${otherRows}${subtotalRow('Other Total', otherDisplay)}</tbody>
          </table>` : ''}

          <!-- Recorded by -->
          <div style="padding:7px 14px;background:${t.sectionBg};border-top:1px solid ${t.cardBorder};font-size:10px;color:${t.textFaint}">
            Recorded by <strong style="color:${t.textMuted}">${r.createdBy.name}</strong>
          </div>
        </div>`
    }).join('')

    // ── Full HTML document ─────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>BK Constructions — Daily Records</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Inter',Arial,sans-serif; font-size:12px; background:${t.pageBg}; color:${t.text}; padding:28px; }
    @media print {
      body { padding:0; background:${t.pageBg}; -webkit-print-color-adjust:exact; print-color-adjust:exact; color-adjust:exact; }
      .no-print { display:none!important; }
    }
  </style>
</head>
<body>
  <!-- Top Header -->
  <div style="background:${t.headerBg};border-radius:16px;padding:20px 24px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;box-shadow:0 4px 24px rgba(79,70,229,.3)">
    <div>
      <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-.01em">🏗️ BK Constructions</div>
      <div style="font-size:12px;color:rgba(255,255,255,.7);margin-top:3px">Daily Expense Records</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:rgba(255,255,255,.6)">${siteName} &nbsp;·&nbsp; ${period}</div>
      <div style="font-size:10px;color:rgba(255,255,255,.5);margin-top:2px">Generated ${new Date().toLocaleString('en-IN')} &nbsp;·&nbsp; ${filtered.length} record(s)</div>
    </div>
  </div>

  <!-- Summary Cards -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
    ${[
      { label: 'Total Labour', value: totals.labour, icon: '👷', color: '#818cf8', bg: isLight ? '#eef2ff' : '#1e2040', border: isLight ? '#c7d2fe' : '#312e81' },
      { label: 'Total Material', value: totals.material, icon: '🧱', color: '#10b981', bg: isLight ? '#ecfdf5' : '#052e16', border: isLight ? '#a7f3d0' : '#065f46' },
      { label: 'Total Other', value: totals.other, icon: '💰', color: '#f59e0b', bg: isLight ? '#fffbeb' : '#2d2006', border: isLight ? '#fcd34d' : '#78350f' },
      { label: 'Grand Total', value: totals.grand, icon: '📊', color: t.accentMuted, bg: t.accentLight, border: t.cardBorder },
    ].map(s => `
      <div style="background:${s.bg};border:1px solid ${s.border};border-radius:12px;padding:14px 16px;box-shadow:${t.shadow}">
        <div style="font-size:18px;margin-bottom:6px">${s.icon}</div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:${t.textFaint};margin-bottom:4px">${s.label}</div>
        <div style="font-size:20px;font-weight:900;color:${s.color};font-variant-numeric:tabular-nums">₹${s.value.toLocaleString('en-IN')}</div>
      </div>`).join('')}
  </div>

  <!-- Day Records -->
  ${recordsHtml}

  <!-- Footer -->
  <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid ${t.cardBorder}">
    <p style="font-size:10px;color:${t.footerText}">BK Constructions &nbsp;·&nbsp; Printed on ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })} &nbsp;·&nbsp; Confidential</p>
  </div>
</body>
</html>`

    const w = window.open('', '_blank')
    if (!w) { toast.error('Allow popups to print'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print() }, 600)
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
              <FileText className="w-3.5 h-3.5" /> CSV
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPrintModalOpen(false)} />

          {/* Modal */}
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-sm overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Printer className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Print Options</h3>
                  <p className="text-xs text-indigo-200 mt-0.5">{filtered.length} record{filtered.length !== 1 ? 's' : ''} · Choose a theme</p>
                </div>
              </div>
            </div>

            {/* Theme choices */}
            <div className="p-5 space-y-3">
              {/* Light Theme */}
              <button
                onClick={() => { setPrintModalOpen(false); printRecords('light') }}
                className="w-full group rounded-xl border-2 border-gray-200 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all overflow-hidden text-left"
              >
                {/* Mini preview */}
                <div className="bg-gray-50 px-4 py-3 space-y-1.5">
                  <div className="h-2.5 w-2/3 rounded-sm bg-indigo-400 opacity-80" />
                  <div className="flex gap-1.5">
                    {['bg-indigo-200','bg-emerald-200','bg-amber-200','bg-violet-200'].map(c => (
                      <div key={c} className={`h-5 flex-1 rounded-md ${c}`} />
                    ))}
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded-sm bg-gray-200" />
                    <div className="h-1.5 w-5/6 rounded-sm bg-gray-200" />
                    <div className="h-1.5 w-4/6 rounded-sm bg-gray-200" />
                  </div>
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between bg-white dark:bg-slate-800">
                  <div>
                    <p className="text-xs font-bold text-gray-700 dark:text-slate-200">☀️ Light Theme</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Clean white background, ideal for printing on paper</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                </div>
              </button>

              {/* Dark Theme */}
              <button
                onClick={() => { setPrintModalOpen(false); printRecords('dark') }}
                className="w-full group rounded-xl border-2 border-gray-200 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all overflow-hidden text-left"
              >
                {/* Mini preview */}
                <div className="bg-slate-900 px-4 py-3 space-y-1.5">
                  <div className="h-2.5 w-2/3 rounded-sm bg-indigo-500 opacity-80" />
                  <div className="flex gap-1.5">
                    {['bg-indigo-900','bg-emerald-900','bg-amber-900','bg-violet-900'].map(c => (
                      <div key={c} className={`h-5 flex-1 rounded-md ${c} border border-white/10`} />
                    ))}
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded-sm bg-slate-700" />
                    <div className="h-1.5 w-5/6 rounded-sm bg-slate-700" />
                    <div className="h-1.5 w-4/6 rounded-sm bg-slate-700" />
                  </div>
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between bg-white dark:bg-slate-800">
                  <div>
                    <p className="text-xs font-bold text-gray-700 dark:text-slate-200">🌙 Dark Theme</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Deep dark background, great for digital screens</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="px-5 pb-4 flex items-center justify-between">
              <p className="text-[10px] text-gray-400 dark:text-slate-500">Opens in a new tab then prompts print dialog</p>
              <button
                onClick={() => setPrintModalOpen(false)}
                className="text-xs font-semibold text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}