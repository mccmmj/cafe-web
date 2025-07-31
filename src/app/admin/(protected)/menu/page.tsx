import { requireAdmin } from '@/lib/admin/auth'

export default async function AdminMenuPage() {
  // Ensure user is admin (will redirect if not)
  await requireAdmin()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
        <p className="text-gray-600 mt-2">
          Manage menu items, categories, pricing, and availability.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Menu Management Coming Soon</h3>
          <p className="text-gray-600 mb-6">
            This feature will allow you to manage your Square menu items, update prices, 
            control availability, and organize categories directly from the admin panel.
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
            <h4 className="font-medium text-amber-800 mb-2">Planned Features:</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Add/edit/delete menu items</li>
              <li>• Update pricing and descriptions</li>
              <li>• Manage item availability (enable/disable)</li>
              <li>• Organize menu categories</li>
              <li>• Upload item images</li>
              <li>• Sync with Square Catalog</li>
            </ul>
          </div>
          
          <div className="mt-6">
            <p className="text-sm text-gray-500">
              For now, menu changes need to be made directly in your Square Dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}