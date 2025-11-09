'use client'

import PurchaseOrdersManagement from '@/components/admin/PurchaseOrdersManagement'
import PurchaseOrderMetricsDashboard from '@/components/admin/PurchaseOrderMetricsDashboard'

export default function PurchaseOrdersPage() {
  return (
    <div className="space-y-10">
      <PurchaseOrderMetricsDashboard />
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Purchase Orders</h2>
          <p className="text-sm text-gray-500">Create, monitor, and update supplier orders.</p>
        </div>
        <PurchaseOrdersManagement />
      </div>
    </div>
  )
}
