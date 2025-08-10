'use client'

import { Button } from '@/components/ui'
import { X, Package, Building2, Calendar, Truck, Clock, CheckCircle } from 'lucide-react'

interface PurchaseOrderItem {
  id: string
  inventory_item_id: string
  inventory_item_name: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  total_cost: number
  unit_type?: string
}

interface PurchaseOrder {
  id: string
  supplier_id: string
  supplier_name: string
  supplier_contact?: string
  supplier_email?: string
  supplier_phone?: string
  order_number: string
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'
  order_date: string
  expected_delivery_date?: string
  actual_delivery_date?: string
  total_amount: number
  notes?: string
  items?: PurchaseOrderItem[]
  created_at: string
  updated_at: string
}

interface PurchaseOrderViewModalProps {
  order?: PurchaseOrder | null
  isOpen: boolean
  onClose: () => void
}

const STATUS_CONFIG = {
  draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft', icon: Package },
  sent: { color: 'bg-blue-100 text-blue-800', label: 'Sent', icon: Clock },
  confirmed: { color: 'bg-yellow-100 text-yellow-800', label: 'Confirmed', icon: CheckCircle },
  received: { color: 'bg-green-100 text-green-800', label: 'Received', icon: Truck },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled', icon: X }
}

const PurchaseOrderViewModal = ({ order, isOpen, onClose }: PurchaseOrderViewModalProps) => {
  if (!isOpen || !order) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const StatusIcon = STATUS_CONFIG[order.status].icon

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-primary-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Purchase Order #{order.order_number}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[order.status].color}`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {STATUS_CONFIG[order.status].label}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Order Date</label>
                  <div className="flex items-center text-gray-900">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    {formatDate(order.order_date)}
                  </div>
                </div>

                {order.expected_delivery_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Expected Delivery</label>
                    <div className="flex items-center text-gray-900">
                      <Clock className="w-4 h-4 mr-2 text-gray-400" />
                      {formatDate(order.expected_delivery_date)}
                    </div>
                  </div>
                )}

                {order.actual_delivery_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Actual Delivery</label>
                    <div className="flex items-center text-green-600">
                      <Truck className="w-4 h-4 mr-2 text-green-500" />
                      {formatDate(order.actual_delivery_date)}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Total Amount</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Supplier Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-primary-600" />
                Supplier Information
              </h3>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Supplier Name</label>
                    <p className="text-gray-900 font-medium">{order.supplier_name}</p>
                  </div>
                  
                  {order.supplier_contact && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Contact Person</label>
                      <p className="text-gray-900">{order.supplier_contact}</p>
                    </div>
                  )}
                  
                  {order.supplier_email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                      <p className="text-gray-900">{order.supplier_email}</p>
                    </div>
                  )}
                  
                  {order.supplier_phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                      <p className="text-gray-900">{order.supplier_phone}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2 text-primary-600" />
                Order Items
              </h3>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty Ordered
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty Received
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Cost
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {order.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {item.inventory_item_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              Unit: {item.unit_type || 'each'}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {item.quantity_ordered}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <span className={item.quantity_received === item.quantity_ordered ? 'text-green-600' : 'text-gray-900'}>
                              {item.quantity_received}
                            </span>
                            {item.quantity_received < item.quantity_ordered && (
                              <span className="text-xs text-gray-500 ml-1">
                                (pending: {item.quantity_ordered - item.quantity_received})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {formatCurrency(item.unit_cost)}
                          </td>
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">
                            {formatCurrency(item.total_cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          Total Amount:
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatCurrency(order.total_amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Created:</span> {formatDateTime(order.created_at)}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span> {formatDateTime(order.updated_at)}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end pt-6 border-t border-gray-200">
              <Button
                onClick={onClose}
                className="bg-primary-600 hover:bg-primary-700"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PurchaseOrderViewModal