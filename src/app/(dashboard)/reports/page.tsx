import { getSites } from '@/actions/sites'
import { getFullDailyRecords } from '@/actions/daily-records'
import { ReportsClient } from '@/components/reports/ReportsClient'

export default async function ReportsPage() {
  const [sites, records] = await Promise.all([getSites(), getFullDailyRecords({ limit: 1000 })])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-gray-900 dark:text-white text-2xl">Reports & Analytics</h2>
        <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">Filter, analyze and export your expense data</p>
      </div>

      <ReportsClient sites={sites as any} records={records as any} />
    </div>
  )
}
