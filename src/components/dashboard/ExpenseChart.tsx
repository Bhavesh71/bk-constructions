'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface ExpenseChartProps {
  data: Array<{ month: string; labour: number; material: number; other: number; total: number }>
}

const formatInr = (value: number) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`
  return `₹${value}`
}

export function ExpenseChart({ data }: ExpenseChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        No data available for chart
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id="labourGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="materialGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="otherGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatInr}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
          width={45}
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
        <Legend
          iconType="circle"
          iconSize={7}
          wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
        />
        <Area type="monotone" dataKey="labour" name="Labour" stroke="#4F46E5" strokeWidth={2} fill="url(#labourGrad)" />
        <Area type="monotone" dataKey="material" name="Material" stroke="#22C55E" strokeWidth={2} fill="url(#materialGrad)" />
        <Area type="monotone" dataKey="other" name="Other" stroke="#F59E0B" strokeWidth={2} fill="url(#otherGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
