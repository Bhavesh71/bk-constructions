import { PageLoader } from '@/components/layout/PageLoader'
import { GenericSkeleton } from '@/components/layout/GenericSkeleton'

export default function Loading() {
  return <PageLoader label="Loading data…"><GenericSkeleton /></PageLoader>
}
