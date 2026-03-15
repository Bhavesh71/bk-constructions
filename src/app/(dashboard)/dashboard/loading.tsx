import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { PageLoader } from '@/components/layout/PageLoader'

export default function DashboardLoading() {
  return <PageLoader label="Loading dashboard…"><DashboardSkeleton /></PageLoader>
}
