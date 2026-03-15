import { cn, formatCurrency } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface KPICardProps {
  label: string
  value: string | number
  icon: LucideIcon
  gradient: string
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  isCurrency?: boolean
  subtitle?: string
}

export function KPICard({ label, value, icon: Icon, gradient, change, changeType, isCurrency, subtitle }: KPICardProps) {
  const displayValue = isCurrency
    ? formatCurrency(typeof value === 'number' ? value : parseFloat(value as string))
    : value

  return (
    <div className="kpi-card group hover:shadow-card-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', gradient)}>
          <Icon className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        {change && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              changeType === 'up' && 'text-green-600 bg-green-50',
              changeType === 'down' && 'text-red-600 bg-red-50',
              changeType === 'neutral' && 'text-gray-500 bg-gray-100'
            )}
          >
            {change}
          </span>
        )}
      </div>
      <div>
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{displayValue}</p>
        {subtitle && <p className="kpi-sub mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
