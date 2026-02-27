import { getDashboardData } from '@/actions/daily-records'
import { KPICard } from '@/components/dashboard/KPICard'
import { formatCurrency, formatDate, getSiteStatusColor } from '@/lib/utils'
import {
  MapPin, TrendingUp, DollarSign, PiggyBank, Building2, Activity,
  Calendar, ArrowRight, AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { ExpenseChart } from '@/components/dashboard/ExpenseChart'
import { SiteComparisonChart } from '@/components/dashboard/SiteComparisonChart'

export default async function DashboardPage() {
  const data = await getDashboardData()
  const { kpi, monthlyTrend, siteComparison, recentRecords } = data

  const budgetPct = kpi.totalBudget > 0 ? (kpi.totalSpent / kpi.totalBudget) * 100 : 0
  const budgetWarning = budgetPct >= 85

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-gray-900 text-2xl">Overview</h2>
          <p className="text-gray-500 text-sm mt-0.5">Monitor your construction operations in real-time</p>
        </div>
        <Link href="/daily-entry" className="btn-primary">
          <Activity className="w-4 h-4" />
          <span>Daily Entry</span>
        </Link>
      </div>

      {budgetWarning && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            Budget alert: {budgetPct.toFixed(1)}% of total budget has been spent. Review your expenses.
          </p>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Sites"
          value={kpi.totalSites}
          icon={Building2}
          gradient="gradient-indigo"
          subtitle={`${kpi.activeSites} active`}
        />
        <KPICard
          label="Today's Expense"
          value={kpi.todayExpense}
          icon={DollarSign}
          gradient="gradient-amber"
          isCurrency
          subtitle={new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        />
        <KPICard
          label="Monthly Expense"
          value={kpi.monthlyExpense}
          icon={TrendingUp}
          gradient="gradient-rose"
          isCurrency
          subtitle={new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        />
        <KPICard
          label="Remaining Budget"
          value={Math.max(0, kpi.remainingBudget)}
          icon={PiggyBank}
          gradient="gradient-emerald"
          isCurrency
          subtitle={`${budgetPct.toFixed(0)}% spent`}
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-display font-semibold text-gray-900 text-lg mb-4">Monthly Expense Trend</h3>
          <ExpenseChart data={monthlyTrend} />
        </div>
        <div className="card">
          <h3 className="font-display font-semibold text-gray-900 text-lg mb-4">Site Budget vs Spent</h3>
          <SiteComparisonChart data={siteComparison} />
        </div>
      </div>

      {/* Budget Overview */}
      <div className="card">
        <h3 className="font-display font-semibold text-gray-900 text-lg mb-4">Budget Overview</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Total Spent vs Budget</span>
            <span className="font-semibold text-gray-800">
              {formatCurrency(kpi.totalSpent)} / {formatCurrency(kpi.totalBudget)}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${budgetPct >= 100 ? 'bg-red-500' : budgetPct >= 85 ? 'bg-orange-500' : budgetPct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, budgetPct)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{budgetPct.toFixed(1)}% used</span>
            <span>{formatCurrency(Math.max(0, kpi.remainingBudget))} remaining</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-gray-900 text-lg">Recent Activity</h3>
          <Link href="/daily-entry" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Date</th>
                <th className="hidden md:table-cell">Labour</th>
                <th className="hidden md:table-cell">Material</th>
                <th>Total</th>
                <th className="hidden sm:table-cell">By</th>
              </tr>
            </thead>
            <tbody>
              {recentRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-8">No records yet. Start by adding a daily entry.</td>
                </tr>
              ) : (
                recentRecords.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="font-medium text-gray-800">{r.site.name}</span>
                      </div>
                    </td>
                    <td className="text-gray-500">{formatDate(r.date)}</td>
                    <td className="hidden md:table-cell text-financial">{formatCurrency(r.totalLabour)}</td>
                    <td className="hidden md:table-cell text-financial">{formatCurrency(r.totalMaterial)}</td>
                    <td className="font-bold text-financial text-gray-900">{formatCurrency(r.grandTotal)}</td>
                    <td className="hidden sm:table-cell text-gray-400">{r.createdBy.name.split(' ')[0]}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
