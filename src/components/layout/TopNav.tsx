'use client'

import { Menu, Sun, Moon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { BRAND } from '@/lib/brand'
import { useTheme } from '@/lib/theme'

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
  const { theme, toggleTheme } = useTheme()
  const [dateStr, setDateStr] = useState('')

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
    // Recalculate at midnight so the displayed date is always correct
    const now = new Date()
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()
    const timer = setTimeout(() => {
      updateDate()
    }, msUntilMidnight)
    return () => clearTimeout(timer)
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

      <div className="flex-1">
        <h1 className="font-display font-bold text-gray-900 dark:text-white text-lg leading-none">{title}</h1>
        {dateStr && <p className="text-gray-400 dark:text-slate-500 text-xs mt-0.5 hidden sm:block">{dateStr}</p>}
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
    </header>
  )
}
