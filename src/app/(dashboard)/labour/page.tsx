import { getLabours } from '@/actions/labour'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import { Users, CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import { LabourManagement } from '@/components/labour/LabourManagement'

export default async function LabourPage() {
  const [labours, session] = await Promise.all([getLabours(), getServerSession(authOptions)])
  const isAdmin = session?.user?.role === 'ADMIN'

  const activeCount = labours.filter(l => l.active).length
  const totalEarnings = labours.reduce((s, l) => s + l.totalEarnings, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-gray-900 dark:text-white text-2xl">Labour Management</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">Manage your workforce and track earnings</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="kpi-card">
          <Users className="w-8 h-8 text-primary-500 mb-1" />
          <p className="kpi-value">{labours.length}</p>
          <p className="kpi-label">Total Workers</p>
        </div>
        <div className="kpi-card">
          <CheckCircle className="w-8 h-8 text-green-500 mb-1" />
          <p className="kpi-value">{activeCount}</p>
          <p className="kpi-label">Active</p>
        </div>
        <div className="kpi-card col-span-2 sm:col-span-1">
          <TrendingUp className="w-8 h-8 text-amber-500 mb-1" />
          <p className="kpi-value">{formatCurrency(totalEarnings)}</p>
          <p className="kpi-label">Total Paid</p>
        </div>
      </div>

      <LabourManagement labours={labours as any} isAdmin={isAdmin} />
    </div>
  )
}
