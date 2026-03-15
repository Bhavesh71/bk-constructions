'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopNav } from '@/components/layout/TopNav'
import { InactivityTimer } from '@/components/layout/InactivityTimer'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen transition-colors duration-200" style={{ backgroundColor: 'var(--surface-0)' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <TopNav onMenuClick={() => setSidebarOpen(true)} />
      <InactivityTimer />

      <main className="lg:ml-[260px] pt-16 min-h-screen">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
