import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getBusinessStats, getAppSettings, getSupervisorStats } from '@/actions/settings'
import { AdminSettingsClient } from '@/components/settings/AdminSettingsClient'
import { SupervisorSettingsClient } from '@/components/settings/SupervisorSettingsClient'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const isAdmin = session.user.role === 'ADMIN'

  if (isAdmin) {
    // Admin: load stats + app settings from DB in parallel
    const [stats, appSettings] = await Promise.all([
      getBusinessStats(),
      getAppSettings(),
    ])

    return (
      <div className="max-w-3xl">
        <div className="page-header">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Manage company settings, account, and preferences</p>
          </div>
        </div>
        <AdminSettingsClient
          user={{ name: session.user.name!, email: session.user.email!, role: session.user.role! }}
          stats={stats}
          appSettings={appSettings}
        />
      </div>
    )
  }

  // Supervisor: load their assigned sites + record count
  const { assignedSites, totalRecordsCreated } = await getSupervisorStats()

  return (
    <div className="max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and preferences</p>
        </div>
      </div>
      <SupervisorSettingsClient
        user={{ name: session.user.name!, email: session.user.email!, role: session.user.role! }}
        assignedSites={assignedSites}
        totalRecordsCreated={totalRecordsCreated}
      />
    </div>
  )
}
