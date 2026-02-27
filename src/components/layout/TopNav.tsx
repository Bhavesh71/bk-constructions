'use client'

import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { BRAND } from '@/lib/brand'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/sites': 'Sites',
  '/daily-entry': 'Daily Entry',
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

  const title = Object.entries(pageTitles).find(([key]) => pathname === key || pathname.startsWith(key + '/'))?.[1] || BRAND.name

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[260px] h-16 bg-white border-b border-gray-100 z-30 flex items-center px-4 lg:px-8 gap-4">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1">
        <h1 className="font-display font-bold text-gray-900 text-lg leading-none">{title}</h1>
        <p className="text-gray-400 text-xs mt-0.5 hidden sm:block">{dateStr}</p>
      </div>
    </header>
  )
}
