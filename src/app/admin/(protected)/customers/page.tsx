import { requireAdmin } from '@/lib/admin/auth'
import { CustomersManagement } from '@/components/admin/CustomersManagement'

export default async function AdminCustomersPage() {
  // Ensure user is admin (will redirect if not)
  await requireAdmin()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
        <p className="text-gray-600 mt-2">
          View and manage customer accounts, order history, and preferences.
        </p>
      </div>

      <CustomersManagement />
    </div>
  )
}