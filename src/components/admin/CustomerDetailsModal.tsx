'use client'

import { useState, useEffect } from 'react'
import { X, User, Mail, Calendar, ShoppingBag, MapPin, Phone } from 'lucide-react'
import { Button } from '@/components/ui'

interface CustomerDetailsModalProps {
  customer: any
  isOpen: boolean
  onClose: () => void
}

interface CustomerOrder {
  id: string
  created_at: string
  total_amount: number
  status: string
  order_items: any[]
}

export function CustomerDetailsModal({ customer, isOpen, onClose }: CustomerDetailsModalProps) {
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && customer) {
      fetchCustomerOrders()
    }
  }, [isOpen, customer])

  const fetchCustomerOrders = async () => {
    if (!customer?.id) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/customers/${customer.id}/orders`)
      
      if (response.ok) {
        const data = await response.json()
        setCustomerOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Error fetching customer orders:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !customer) return null

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

  const totalSpent = customerOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
  const completedOrders = customerOrders.filter(order => order.status === 'completed').length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {customer.full_name || 'Customer Profile'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {customer.email}
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
          {/* Customer Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <User className="w-4 h-4 mr-2" />
              Customer Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <User className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">
                    {customer.full_name || 'No name provided'}
                  </span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">{customer.email}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">
                    Joined {new Date(customer.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    customer.role === 'admin' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {customer.role}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Account ID: <span className="font-mono text-xs">{customer.id}</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Statistics */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Order Statistics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{customerOrders.length}</p>
                <p className="text-sm text-blue-700">Total Orders</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{completedOrders}</p>
                <p className="text-sm text-green-700">Completed Orders</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">${formatPrice(totalSpent)}</p>
                <p className="text-sm text-purple-700">Total Spent</p>
              </div>
            </div>
          </div>

          {/* Order History */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Order History</h3>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading orders...</p>
              </div>
            ) : customerOrders.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No orders found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {customerOrders.map((order) => (
                  <div key={order.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          Order #{order.id.slice(-8)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(order.created_at)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {order.order_items?.length || 0} items
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          ${formatPrice(order.total_amount || 0)}
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Notes/Actions */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Actions</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-700">
                Additional customer management features (notes, preferences, loyalty status) coming soon.
              </p>
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