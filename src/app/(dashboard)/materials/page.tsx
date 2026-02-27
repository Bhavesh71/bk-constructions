import { getMaterialsWithStats } from '@/actions/materials'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import { Package, TrendingUp, Tag } from 'lucide-react'
import { MaterialManagement } from '@/components/materials/MaterialManagement'

export default async function MaterialsPage() {
  const [materials, session] = await Promise.all([getMaterialsWithStats(), getServerSession(authOptions)])
  const isAdmin = session?.user?.role === 'ADMIN'

  const categories = [...new Set(materials.map(m => m.category))].length
  const totalSpent = materials.reduce((s, m) => s + m.totalSpent, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-gray-900 text-2xl">Materials</h2>
        <p className="text-gray-500 text-sm mt-0.5">Track and manage construction materials</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card">
          <Package className="w-8 h-8 text-primary-500 mb-1" />
          <p className="kpi-value">{materials.length}</p>
          <p className="kpi-label">Materials</p>
        </div>
        <div className="kpi-card">
          <Tag className="w-8 h-8 text-green-500 mb-1" />
          <p className="kpi-value">{categories}</p>
          <p className="kpi-label">Categories</p>
        </div>
        <div className="kpi-card">
          <TrendingUp className="w-8 h-8 text-amber-500 mb-1" />
          <p className="kpi-value text-lg">{formatCurrency(totalSpent)}</p>
          <p className="kpi-label">Total Spent</p>
        </div>
      </div>

      <MaterialManagement materials={materials as any} isAdmin={isAdmin} />
    </div>
  )
}
