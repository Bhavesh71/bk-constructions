'use client'

import { Menu, Sun, Moon, Bell, Wallet } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { BRAND } from '@/lib/brand'
import { useTheme } from '@/lib/theme'
import { getUnpaidWorkersCount } from '@/actions/labour'

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
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }))
    }
    updateDate()
    const now = new Date()
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()
    const timer = setTimeout(updateDate, msUntilMidnight)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    async function fetchCount() {
      try { const count = await getUnpaidWorkersCount(); setUnpaidCount(count) }
      catch { /* ignore */ }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    return () => clearInterval(interval)
  }, [pathname])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const title =
    Object.entries(pageTitles).find(([key]) => pathname === key || pathname.startsWith(key + '/'))?.[1] ||
    BRAND.name

  return (
    <header className="topnav fixed top-0 right-0 left-0 lg:left-[260px] z-30">
      <button onClick={onMenuClick} className="lg:hidden topnav-icon-btn mr-1" aria-label="Open menu">
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="topnav-title truncate">{title}</h1>
        {dateStr && <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5 hidden sm:block">{dateStr}</p>}
      </div>

      <div className="flex items-center gap-1">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotif(v => !v)}
            title={unpaidCount > 0 ? `${unpaidCount} workers with unpaid wages` : 'No pending payments'}
            className="topnav-icon-btn relative"
          >
            <Bell className={`w-5 h-5 ${unpaidCount > 0 ? 'text-amber-500' : ''}`} />
            {unpaidCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center leading-none shadow-sm">
                {unpaidCount > 9 ? '9+' : unpaidCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="dropdown absolute right-0 top-full w-72 animate-slide-down">
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <Bell className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Payment Reminders
                </span>
              </div>
              {unpaidCount === 0 ? (
                <div className="px-4 py-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-2">
                    <Wallet className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>All paid up!</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>No pending worker payments</p>
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
                        Remember to pay workers every Saturday. Go to Labour → Payments.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowNotif(false); router.push('/labour') }}
                    className="btn-primary w-full justify-center text-xs py-2"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Go to Labour Payments</span>
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
          className="topnav-icon-btn"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  )
}
