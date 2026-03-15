'use client'

import { Loader2 } from 'lucide-react'

interface Props {
  label?: string
  children?: React.ReactNode
}

export function PageLoader({ label = 'Loading…', children }: Props) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top loading bar */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] overflow-hidden pointer-events-none">
        <div
          className="h-full animate-loading-bar"
          style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-light))' }}
        />
      </div>

      {/* Inline status pill */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl w-fit"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--brand)]" />
        <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      </div>

      {children}
    </div>
  )
}
