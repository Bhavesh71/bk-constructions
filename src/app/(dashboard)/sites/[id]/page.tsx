import { getSiteById } from '@/actions/sites'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { formatCurrency, formatDate, getSiteStatusColor, getBudgetStatus } from '@/lib/utils'
import { ArrowLeft, MapPin, Calendar, TrendingUp, Plus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteTabs } from '@/components/sites/SiteTabs'

interface Props {
  params: { id: string }
}

export default async function SiteDetailPage({ params }: Props) {
  try {
    const [site, session] = await Promise.all([getSiteById(params.id), getServerSession(authOptions)])
    const isAdmin = session?.user?.role === 'ADMIN'
    const status = getSiteStatusColor(site.status)
    const budget = getBudgetStatus(site.totalSpent, site.totalBudget)
    const pct = site.totalBudget > 0 ? Math.min(100, (site.totalSpent / site.totalBudget) * 100) : 0

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Link href="/sites" className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors mt-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-display font-bold text-gray-900 text-2xl">{site.name}</h2>
              <span className={`badge ${status.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-400 flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{site.location}</span>
              {site.startDate && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Started {formatDate(site.startDate)}</span>}
            </div>
          </div>
          <Link href={`/daily-entry?siteId=${site.id}`} className="btn-primary">
            <Plus className="w-4 h-4" />
            Daily Entry
          </Link>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Budget', value: formatCurrency(site.totalBudget), className: 'text-gray-900' },
            { label: 'Total Spent', value: formatCurrency(site.totalSpent), className: 'text-gray-900' },
            { label: 'Remaining', value: formatCurrency(Math.max(0, site.remainingBudget)), className: site.remainingBudget < 0 ? 'text-red-600' : 'text-green-600' },
            { label: 'Expected Revenue', value: site.expectedRevenue ? formatCurrency(site.expectedRevenue) : 'N/A', className: 'text-gray-900' },
          ].map((item) => (
            <div key={item.label} className="card py-4">
              <p className="text-xs text-gray-400 mb-1">{item.label}</p>
              <p className={`font-display font-bold text-xl ${item.className}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Budget progress */}
        <div className="card">
          <div className="flex justify-between text-sm mb-2">
            <div>
              <span className="font-semibold text-gray-700">Budget Progress</span>
              <span className={`ml-2 badge ${budget.bg} ${budget.color}`}>{budget.label}</span>
            </div>
            <span className="text-gray-500">{pct.toFixed(1)}% used</span>
          </div>
          <div className="progress-bar h-3">
            <div
              className={`progress-fill ${pct >= 100 ? 'bg-red-500' : pct >= 85 ? 'bg-orange-400' : pct >= 70 ? 'bg-yellow-400' : 'bg-green-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatCurrency(site.totalSpent)} spent</span>
            <span>{formatCurrency(site.totalBudget)} total</span>
          </div>
        </div>

        {/* Tabs */}
        <SiteTabs site={site as any} isAdmin={isAdmin} />
      </div>
    )
  } catch {
    notFound()
  }
}
