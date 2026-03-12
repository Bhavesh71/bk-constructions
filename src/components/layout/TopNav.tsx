'use client'

import { Menu, Sun, Moon, Bell, Wallet } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { BRAND } from '@/lib/brand'
import { useTheme } from '@/lib/theme'
import { getUnpaidWorkersCount } from '@/actions/labour'
import { formatCurrency } from '@/lib/utils'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/sites': 'Sites',
  '/daily-entry': 'Daily Entry',
  '/records': 'Record History',
  '/labour': 'Labour',
  '/materials': 'Materials',
  '/reports': 'Reports',
  '/users': 'Users',
  '/settings': 'Settings',
}

interface TopNavProps {
  onMenuClick: () => void
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [dateStr, setDateStr] = useState('')
  const [unpaidCount, setUnpaidCount] = useState(0)
  const [showNotif, setShowNotif] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function updateDate() {
      setDateStr(new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }))
    }
    updateDate()
    const now = new Date()
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()
    const timer = setTimeout(updateDate, msUntilMidnight)
    return () => clearTimeout(timer)
  }, [])

  // Poll unpaid workers count every 60 seconds
  useEffect(() => {
    async function fetchCount() {
      try {
        const count = await getUnpaidWorkersCount()
        setUnpaidCount(count)
      } catch { /* ignore */ }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    return () => clearInterval(interval)
  }, [pathname]) // re-fetch whenever page changes

  // Close notification popup when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const title =
    Object.entries(pageTitles).find(([key]) => pathname === key || pathname.startsWith(key + '/'))?.[1] ||
    BRAND.name

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[260px] h-16 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 z-30 flex items-center px-4 lg:px-8 gap-4 transition-colors duration-200">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="font-display font-bold text-gray-900 dark:text-white text-lg leading-none truncate">{title}</h1>
        {dateStr && <p className="text-gray-400 dark:text-slate-500 text-xs mt-0.5 hidden sm:block">{dateStr}</p>}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Payment Reminder Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotif(v => !v)}
            title={unpaidCount > 0 ? `${unpaidCount} workers with unpaid wages` : 'No pending payments'}
            className="relative p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all duration-150 hover:scale-110"
          >
            <Bell className={`w-5 h-5 ${unpaidCount > 0 ? 'text-amber-500' : ''}`} />
            {unpaidCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center leading-none shadow-sm animate-pulse">
                {unpaidCount > 9 ? '9+' : unpaidCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider">Payment Reminders</span>
              </div>
              {unpaidCount === 0 ? (
                <div className="px-4 py-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-2">
                    <Wallet className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">All paid up!</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">No pending worker payments</p>
                </div>
              ) : (
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        {unpaidCount} worker{unpaidCount > 1 ? 's' : ''} awaiting payment
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        Remember to pay workers every Saturday. Go to Labour → Payments to process.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowNotif(false); router.push('/labour') }}
                    className="w-full py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    Go to Labour Payments
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all duration-150 hover:scale-110"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
      </div>
    </header>
  )
}
