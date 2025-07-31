import { requireAdmin } from '@/lib/admin/auth'
import { AdminDashboardOverview } from '@/components/admin/AdminDashboardOverview'

export default async function AdminDashboardPage() {
  // Ensure user is admin (will redirect if not)
  const { user } = await requireAdmin()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's what's happening at Little Cafe today.
        </p>
      </div>

      <AdminDashboardOverview />
    </div>
  )
}