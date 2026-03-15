export function GenericSkeleton() {
  return (
    <div className="space-y-5">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-7 w-48 rounded-xl" />
          <div className="skeleton h-4 w-32 rounded-lg" />
        </div>
        <div className="skeleton h-9 w-28 rounded-xl" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card space-y-3">
            <div className="flex items-center justify-between">
              <div className="skeleton h-3 w-16 rounded-lg" />
              <div className="skeleton w-9 h-9 rounded-xl" />
            </div>
            <div className="skeleton h-7 w-28 rounded-xl" />
            <div className="skeleton h-3 w-20 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Main content area skeleton */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="skeleton h-5 w-36 rounded-lg" />
          <div className="skeleton h-8 w-24 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="skeleton w-8 h-8 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-4 w-2/5 rounded-lg" />
                <div className="skeleton h-3 w-1/4 rounded-lg" />
              </div>
              <div className="skeleton h-4 w-20 rounded-lg" />
              <div className="skeleton h-4 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
