import { requireAdmin } from '@/lib/admin/auth'
import { OrdersManagement } from '@/components/admin/OrdersManagement'

export default async function AdminOrdersPage() {
  // Ensure user is admin (will redirect if not)
  await requireAdmin()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-600 mt-2">
          View and manage all customer orders in real-time.
        </p>
      </div>

      <OrdersManagement />
    </div>
  )
}