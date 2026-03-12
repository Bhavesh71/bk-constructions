import { getLabours } from '@/actions/labour'
import { getActiveSites } from '@/actions/sites'   // BUG-5 FIX: was getSites (returned all sites)
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import { Users, Wallet, CreditCard, CalendarCheck } from 'lucide-react'
import { LabourManagement } from '@/components/labour/LabourManagement'

export default async function LabourPage() {
  const [labours, sites, session] = await Promise.all([
    getLabours(),
    getActiveSites(),   // BUG-5 FIX: only active sites in attendance dropdown
    getServerSession(authOptions),
  ])
  const isAdmin = session?.user?.role === 'ADMIN'

  const activeCount = labours.filter((l) => l.active).length
  const totalPaid = labours.reduce((s, l) => s + l.totalEarnings, 0)
  const totalPendingAdvance = labours.reduce((s, l) => s + l.pendingAdvance, 0)
  const totalUnpaidWage = labours.filter((l) => l.active).reduce((s, l) => s + l.unpaidWage, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-gray-900 dark:text-white text-2xl">Labour Management</h2>
        <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">
          Track attendance, manage advances, and pay weekly salaries
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="kpi-card">
          <Users className="w-7 h-7 text-primary-500 mb-1" />
          <p className="kpi-value">{activeCount}</p>
          <p className="kpi-label">Active Workers</p>
        </div>
        <div className="kpi-card">
          <CalendarCheck className="w-7 h-7 text-blue-500 mb-1" />
          <p className="kpi-value">{formatCurrency(totalUnpaidWage)}</p>
          <p className="kpi-label">Wages Due</p>
        </div>
        <div className="kpi-card">
          <Wallet className="w-7 h-7 text-emerald-500 mb-1" />
          <p className="kpi-value">{formatCurrency(totalPaid)}</p>
          <p className="kpi-label">Total Paid</p>
        </div>
        <div className="kpi-card">
          <CreditCard className="w-7 h-7 text-red-400 mb-1" />
          <p className="kpi-value">{formatCurrency(totalPendingAdvance)}</p>
          <p className="kpi-label">Advances Pending</p>
        </div>
      </div>

      <LabourManagement
        labours={labours as any}
        sites={sites.map((s) => ({ id: s.id, name: s.name, location: s.location })) as any}
        isAdmin={isAdmin}
      />
    </div>
  )
}
