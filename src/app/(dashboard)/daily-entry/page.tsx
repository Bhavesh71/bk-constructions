import { getSites } from '@/actions/sites'
import { getMaterials } from '@/actions/materials'
import { getCustomCategories } from '@/actions/settings'
import { DailyEntryForm } from '@/components/daily-entry/DailyEntryForm'

interface Props {
  searchParams: { siteId?: string; date?: string }
}

export default async function DailyEntryPage({ searchParams }: Props) {
  const [sites, materials, customCategories] = await Promise.all([
    getSites(),
    getMaterials(),
    getCustomCategories(),
  ])

  // Use IST-aware today so the date input defaults to the correct local date
  // regardless of what timezone the server is running in.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display font-bold text-gray-900 dark:text-white text-2xl">Daily Expense Entry</h2>
        <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">
          Record materials and other site expenses. Labour attendance is tracked in the{' '}
          <a href="/labour" className="text-primary-600 hover:underline font-medium">Labour page</a>.
        </p>
      </div>

      <DailyEntryForm
        sites={sites as any}
        materials={materials}
        customCategories={customCategories}
        defaultSiteId={searchParams.siteId}
        defaultDate={searchParams.date || today}
      />
    </div>
  )
}
