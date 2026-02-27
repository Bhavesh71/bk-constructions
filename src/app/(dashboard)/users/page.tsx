import { getUsers } from '@/actions/users'
import { UsersManagement } from '@/components/users/UsersManagement'
import { Shield } from 'lucide-react'

export default async function UsersPage() {
  const users = await getUsers()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-gray-900 text-2xl">User Management</h2>
        <p className="text-gray-500 text-sm mt-0.5">Manage team access and permissions</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <div className="kpi-card">
          <Shield className="w-8 h-8 text-primary-500 mb-1" />
          <p className="kpi-value">{users.filter(u => u.role === 'ADMIN').length}</p>
          <p className="kpi-label">Admins</p>
        </div>
        <div className="kpi-card">
          <Shield className="w-8 h-8 text-green-500 mb-1" />
          <p className="kpi-value">{users.filter(u => u.role === 'SUPERVISOR').length}</p>
          <p className="kpi-label">Supervisors</p>
        </div>
      </div>

      <UsersManagement users={users as any} />
    </div>
  )
}
