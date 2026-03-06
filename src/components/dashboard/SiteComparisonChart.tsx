'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useTheme } from '@/lib/theme'

interface SiteComparisonChartProps {
  data: Array<{ name: string; budget: number; spent: number }>
}

const formatInr = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`
  return `₹${value}`
}

export function SiteComparisonChart({ data }: SiteComparisonChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
        No site data available
      </div>
    )
  }

  const axisColor = isDark ? '#6b7fa0' : '#9CA3AF'
  const budgetBarColor = isDark ? '#818cf8' : '#c7d2fe'

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }} barGap={4}>
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={formatInr}
          tick={{ fontSize: 11, fill: axisColor }}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip
          formatter={(value: number, name: string) => [formatInr(value), name]}
          contentStyle={{
            background: '#1e293b',
            border: 'none',
            borderRadius: '10px',
            color: '#f8fafc',
            fontSize: '12px',
          }}
          itemStyle={{ color: '#cbd5e1' }}
          labelStyle={{ color: '#fff', fontWeight: 600 }}
        />
        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
        <Bar dataKey="budget" name="Budget" fill={budgetBarColor} radius={[6, 6, 0, 0]} />
        <Bar dataKey="spent" name="Spent" fill="#4F46E5" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
