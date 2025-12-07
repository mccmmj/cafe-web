'use client'

import { X, User, Mail, Phone, Clock, Package, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui'

interface OrderItemDetails {
  item_name?: string
  quantity?: number
  total_price?: number
  unit_price?: number
  variations?: Record<string, unknown>
  modifiers?: Record<string, unknown>
}

interface OrderDetails {
  id: string
  created_at: string
  status: string
  order_items?: OrderItemDetails[]
  profiles?: {
    full_name?: string
  } | null
  customer_email?: string
  customer_phone?: string
  special_instructions?: string
  total_amount?: number
  tax_amount?: number
  subtotal_amount?: number
  payment_status?: string
  square_order_id?: string
  updated_at?: string
}

interface OrderDetailsModalProps {
  order: OrderDetails | null
  isOpen: boolean
  onClose: () => void
}

export function OrderDetailsModal({ order, isOpen, onClose }: OrderDetailsModalProps) {
  if (!isOpen || !order) return null

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'ready': return 'bg-green-100 text-green-800 border-green-200'
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Order #{order.id.slice(-8)}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {formatDate(order.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Status</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>

          {/* Customer Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <User className="w-4 h-4 mr-2" />
              Customer Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center">
                <User className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">
                  {order.profiles?.full_name || 'Guest Customer'}
                </span>
              </div>
              {order.customer_email && (
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">{order.customer_email}</span>
                </div>
              )}
              {order.customer_phone && (
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">{order.customer_phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Package className="w-4 h-4 mr-2" />
              Order Items ({order.order_items?.length || 0})
            </h3>
            <div className="space-y-3">
              {order.order_items?.map((item: OrderItemDetails, index: number) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.item_name}</h4>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      {item.variations && Object.keys(item.variations).length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 font-medium">Selected Options:</p>
                          <div className="mt-1 space-y-1">
                            {Object.entries(item.variations).map(([key, value]) => {
                              // Format the key to be more readable
                              const formattedKey = key === 'variationId' ? 'Size/Type' :
                                key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
                              
                              // Format the value - if it's a long ID, show it as a reference
                              let formattedValue = String(value)
                              if (typeof value === 'string' && value.length > 15 && /^[A-Z0-9_]+$/.test(value)) {
                                formattedValue = `Custom Option (${value.substring(0, 6)}...)`
                              }
                              
                              return (
                                <div key={key} className="flex items-center text-xs">
                                  <span className="inline-block w-2 h-2 bg-amber-400 rounded-full mr-2"></span>
                                  <span className="text-gray-600 mr-2">{formattedKey}:</span>
                                  <span className="text-gray-800 font-medium bg-gray-100 px-2 py-1 rounded">
                                    {formattedValue}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {item.modifiers && Object.keys(item.modifiers).length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 font-medium">Add-ons & Modifications:</p>
                          <div className="mt-1 space-y-1">
                            {Object.entries(item.modifiers).map(([key, value]) => {
                              // Format the key to be more readable
                              const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
                              
                              // Format the value - handle IDs and quantities
                              let formattedValue = String(value)
                              if (typeof value === 'string' && value.length > 15 && /^[A-Z0-9_]+$/.test(value)) {
                                formattedValue = `Modifier (${value.substring(0, 6)}...)`
                              } else if (typeof value === 'number') {
                                formattedValue = `${value}x`
                              }
                              
                              return (
                                <div key={key} className="flex items-center text-xs">
                                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                                  <span className="text-gray-600 mr-2">{formattedKey}:</span>
                                  <span className="text-gray-800 font-medium bg-green-50 px-2 py-1 rounded border border-green-200">
                                    {formattedValue}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-medium text-gray-900">
                        ${formatPrice(item.total_price ?? 0)}
                      </p>
                      <p className="text-sm text-gray-600">
                        ${formatPrice(item.unit_price ?? 0)} each
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Special Instructions */}
          {order.special_instructions && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Special Instructions</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-gray-800">{order.special_instructions}</p>
              </div>
            </div>
          )}

          {/* Payment Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Payment Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="text-sm font-medium text-gray-900">
                  ${formatPrice((order.total_amount || 0) - (order.tax_amount || 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tax:</span>
                <span className="text-sm font-medium text-gray-900">
                  ${formatPrice(order.tax_amount || 0)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="text-base font-medium text-gray-900">Total:</span>
                <span className="text-base font-bold text-gray-900">
                  ${formatPrice(order.total_amount || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Payment Status:</span>
                <span className={`text-sm font-medium ${
                  order.payment_status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {order.payment_status}
                </span>
              </div>
            </div>
          </div>

          {/* Order Metadata */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Order Details
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="text-gray-900 font-mono">{order.id}</span>
              </div>
              {order.square_order_id && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Square Order ID:</span>
                  <span className="text-gray-900 font-mono">{order.square_order_id}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="text-gray-900">{formatDate(order.created_at)}</span>
              </div>
            {order.updated_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span className="text-gray-900">{formatDate(order.updated_at)}</span>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
