import { getSites } from '@/actions/sites'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { formatCurrency, getSiteStatusColor, getBudgetStatus } from '@/lib/utils'
import { Plus, MapPin, TrendingUp, Building2 } from 'lucide-react'
import Link from 'next/link'
import { SiteActions } from '@/components/sites/SiteActions'
import { CreateSiteModal } from '@/components/sites/CreateSiteModal'

export default async function SitesPage() {
  const [sites, session] = await Promise.all([getSites(), getServerSession(authOptions)])
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-gray-900 dark:text-white text-2xl">Construction Sites</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">{sites.length} total site{sites.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && <CreateSiteModal />}
      </div>

      {sites.length === 0 ? (
        <div className="card text-center py-16">
          <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-500 mb-1">No sites yet</h3>
          <p className="text-gray-400 text-sm">Create your first construction site to get started.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sites.map((site) => {
            const status = getSiteStatusColor(site.status)
            const budget = getBudgetStatus(site.totalSpent, site.totalBudget)
            const pct = site.totalBudget > 0 ? Math.min(100, (site.totalSpent / site.totalBudget) * 100) : 0

            return (
              <div key={site.id} className="card hover:shadow-card-md transition-all duration-200 hover:-translate-y-0.5 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <Link href={`/sites/${site.id}`}>
                      <h3 className="font-display font-semibold text-gray-900 dark:text-white text-base hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer truncate">
                        {site.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-1.5 mt-1 text-gray-400 text-xs">
                      <MapPin className="w-3 h-3" />
                      <span>{site.location}</span>
                    </div>
                  </div>
                  <span className={`badge ${status.badge} ml-2 flex-shrink-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-500">Budget utilization</span>
                      <span className={`font-semibold ${budget.color}`}>{budget.label}</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${pct >= 100 ? 'bg-red-500' : pct >= 85 ? 'bg-orange-400' : pct >= 70 ? 'bg-yellow-400' : 'bg-green-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-slate-700/60 rounded-xl p-3">
                      <p className="text-xs text-gray-400 dark:text-slate-400 mb-0.5">Budget</p>
                      <p className="font-display font-semibold text-gray-900 dark:text-white text-sm">{formatCurrency(site.totalBudget)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-700/60 rounded-xl p-3">
                      <p className="text-xs text-gray-400 dark:text-slate-400 mb-0.5">Spent</p>
                      <p className="font-display font-semibold text-gray-900 dark:text-white text-sm">{formatCurrency(site.totalSpent)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                      <TrendingUp className="w-3 h-3" />
                      <span>{(site as any).recordCount || 0} daily records</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link href={`/sites/${site.id}`} className="btn-secondary text-xs py-1.5 px-3">
                        View
                      </Link>
                      {isAdmin && <SiteActions siteId={site.id} siteName={site.name} />}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
