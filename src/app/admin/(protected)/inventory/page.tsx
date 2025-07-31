import { requireAdmin } from '@/lib/admin/auth'

export default async function AdminInventoryPage() {
  // Ensure user is admin (will redirect if not)
  await requireAdmin()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-gray-600 mt-2">
          Track stock levels, manage supplies, and monitor ingredient usage.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Inventory Management Coming Soon</h3>
          <p className="text-gray-600 mb-6">
            This feature will help you track stock levels, manage supplies, 
            and get alerts when items are running low.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h4 className="font-medium text-blue-800 mb-2">Planned Features:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Track stock levels for all items</li>
              <li>• Low stock alerts and notifications</li>
              <li>• Supplier management and reorder points</li>
              <li>• Ingredient usage tracking</li>
              <li>• Cost analysis and profitability reports</li>
              <li>• Automatic stock deduction based on sales</li>
            </ul>
          </div>
          
          <div className="mt-6">
            <p className="text-sm text-gray-500">
              Currently, inventory management needs to be done manually or through Square's inventory features.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}