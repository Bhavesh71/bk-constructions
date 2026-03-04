export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="kpi-card">
            <div className="skeleton h-4 w-20 rounded-lg" />
            <div className="skeleton h-8 w-32 rounded-xl mt-2" />
            <div className="skeleton h-3 w-24 rounded-lg mt-1" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="skeleton h-5 w-40 rounded-lg mb-4" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
        <div className="card">
          <div className="skeleton h-5 w-40 rounded-lg mb-4" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
      </div>

      {/* Recent records */}
      <div className="card">
        <div className="skeleton h-5 w-40 rounded-lg mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-slate-700 last:border-0">
            <div className="skeleton h-4 w-24 rounded-lg" />
            <div className="skeleton h-4 w-32 rounded-lg" />
            <div className="skeleton h-4 w-20 rounded-lg ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
