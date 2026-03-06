import { getSites } from '@/actions/sites'
import { getLabours } from '@/actions/labour'
import { getMaterials } from '@/actions/materials'
import { DailyEntryForm } from '@/components/daily-entry/DailyEntryForm'

interface Props {
  searchParams: { siteId?: string; date?: string }
}

export default async function DailyEntryPage({ searchParams }: Props) {
  const [sites, labours, materials] = await Promise.all([getSites(), getLabours(), getMaterials()])

  const activeLabours = labours.filter((l) => l.active)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display font-bold text-gray-900 dark:text-white text-2xl">Daily Expense Entry</h2>
        <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">Record labour, material and other expenses for a site</p>
      </div>

      <DailyEntryForm
        sites={sites as any}
        labours={activeLabours}
        materials={materials}
        defaultSiteId={searchParams.siteId}
        defaultDate={searchParams.date || today}
      />
    </div>
  )
}
