import { requireAdmin } from '@/lib/admin/auth'
import MenuManagementContainer from '@/components/admin/MenuManagementContainer'

export default async function AdminMenuPage() {
  // Ensure user is admin (will redirect if not)
  await requireAdmin()

  return <MenuManagementContainer />
}