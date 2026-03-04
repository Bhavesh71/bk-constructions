import { getFullDailyRecords } from '@/actions/daily-records'
import { getSites } from '@/actions/sites'
import { RecordsBrowser } from '@/components/records/RecordsBrowser'
import { History } from 'lucide-react'

interface Props {
  searchParams: { siteId?: string; dateFrom?: string; dateTo?: string }
}

export default async function RecordsPage({ searchParams }: Props) {
  const [records, sites] = await Promise.all([
    getFullDailyRecords({
      siteId: searchParams.siteId,
      dateFrom: searchParams.dateFrom,
      dateTo: searchParams.dateTo,
    }),
    getSites(),
  ])

  const simpleSites = sites.map(s => ({ id: s.id, name: s.name }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 gradient-indigo rounded-xl flex items-center justify-center">
          <History className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-display font-bold text-gray-900 text-2xl">Record History</h2>
          <p className="text-gray-500 text-sm">Browse, filter and download all expense records</p>
        </div>
      </div>

      <RecordsBrowser records={records as any} sites={simpleSites} />
    </div>
  )
}
