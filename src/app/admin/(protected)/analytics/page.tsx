import { requireAdmin } from '@/lib/admin/auth'
import InventoryAnalytics from '@/components/admin/InventoryAnalytics'

export default async function AdminAnalyticsPage() {
  // Ensure user is admin (will redirect if not)
  await requireAdmin()

  return (
    <div>
      <InventoryAnalytics />
    </div>
  )
}