import { requireAdmin } from '@/lib/admin/auth'
import InventoryManagement from '@/components/admin/InventoryManagement'

export default async function AdminInventoryPage() {
  // Ensure user is admin (will redirect if not)
  await requireAdmin()

  return <InventoryManagement />
}