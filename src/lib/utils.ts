import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num)
}

// ─── Safe date parsing ─────────────────────────────────────────────────────
// Always interprets "YYYY-MM-DD" as LOCAL time (not UTC midnight).
// Avoids the IST/Windows off-by-one-day bug where new Date("2026-03-11")
// gives 2026-03-10T18:30:00Z in IST.
export function parseLocalDate(dateStr: string | Date): Date {
  // Prisma returns @db.Date fields as native Date objects — pass through directly.
  // String "YYYY-MM-DD" is parsed as UTC midnight so it matches how Prisma stores
  // @db.Date values (PostgreSQL uses UTC date component). This keeps all date
  // comparisons consistent across storage, filtering and display.
  if (dateStr instanceof Date) return dateStr
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function formatDate(date: Date | string): string {
  // If it's a plain YYYY-MM-DD string, parse locally to avoid IST shift
  const d = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? parseLocalDate(date)
    : new Date(date)
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function formatDateInput(date: Date | string): string {
  const d = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? parseLocalDate(date)
    : new Date(date)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getBudgetStatus(spent: number, total: number) {
  if (total === 0) return { label: 'No Budget', color: 'text-gray-500 dark:text-slate-400', bg: 'bg-gray-100 dark:bg-slate-700', border: 'border-gray-200 dark:border-slate-600' }
  const pct = (spent / total) * 100
  if (pct >= 100) return { label: 'Over Budget', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800/50' }
  if (pct >= 85) return { label: 'Critical', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-800/50' }
  if (pct >= 70) return { label: 'Warning', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-200 dark:border-yellow-800/50' }
  return { label: 'On Track', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-800/50' }
}

export function getSiteStatusColor(status: string) {
  switch (status) {
    case 'ACTIVE':
      return { dot: 'bg-green-500', badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50', label: 'Active' }
    case 'COMPLETED':
      return { dot: 'bg-blue-500', badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50', label: 'Completed' }
    case 'ON_HOLD':
      return { dot: 'bg-yellow-500', badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50', label: 'On Hold' }
    case 'CANCELLED':
      return { dot: 'bg-red-500', badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50', label: 'Cancelled' }
    default:
      return { dot: 'bg-gray-500', badge: 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-600', label: status }
  }
}
