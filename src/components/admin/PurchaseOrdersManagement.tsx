'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui'
import { 
  ClipboardList,
  Plus,
  Search,
  Filter,
  Calendar,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  DollarSign,
  Package,
  Eye,
  Edit,
  MoreVertical
} from 'lucide-react'
import toast from 'react-hot-toast'
import PurchaseOrderModal from './PurchaseOrderModal'
import PurchaseOrderViewModal from './PurchaseOrderViewModal'

interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  inventory_item_id: string
  inventory_item_name: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  total_cost: number
}

interface PurchaseOrder {
  id: string
  supplier_id: string
  supplier_name: string
  order_number: string
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'
  order_date: string
  expected_delivery_date?: string
  actual_delivery_date?: string
  total_amount: number
  notes?: string
  created_at: string
  updated_at: string
  items?: PurchaseOrderItem[]
}

interface PurchaseOrdersManagementProps {
  onOrderSelect?: (order: PurchaseOrder) => void
  showCreateButton?: boolean
}

const STATUS_CONFIG = {
  draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft', icon: FileText },
  sent: { color: 'bg-blue-100 text-blue-800', label: 'Sent', icon: Clock },
  confirmed: { color: 'bg-yellow-100 text-yellow-800', label: 'Confirmed', icon: CheckCircle },
  received: { color: 'bg-green-100 text-green-800', label: 'Received', icon: Package },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled', icon: XCircle }
}

const PurchaseOrdersManagement = ({ 
  onOrderSelect, 
  showCreateButton = true 
}: PurchaseOrdersManagementProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'this_week' | 'this_month' | 'overdue'>('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  
  const queryClient = useQueryClient()

  // Fetch purchase orders
  const { 
    data: ordersData, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['admin-purchase-orders', statusFilter, dateFilter],
    queryFn: async () => {
      let url = '/api/admin/purchase-orders?'
      const params = new URLSearchParams()
      
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (dateFilter !== 'all') params.append('dateFilter', dateFilter)
      
      const response = await fetch(url + params.toString())
      if (!response.ok) {
        throw new Error('Failed to fetch purchase orders')
      }
      return response.json()
    }
  })

  const orders: PurchaseOrder[] = ordersData?.orders || []

  // Filter orders based on search
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  // Update order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, deliveryDate }: { 
      orderId: string
      status: string
      deliveryDate?: string 
    }) => {
      const response = await fetch(`/api/admin/purchase-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          actual_delivery_date: deliveryDate 
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update order status')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Order status updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-orders'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update order status')
    }
  })

  const handleCreateOrder = () => {
    setSelectedOrder(null)
    setCreateModalOpen(true)
  }

  const handleViewOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order)
    setViewModalOpen(true)
  }

  const handleEditOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order)
    setEditModalOpen(true)
  }

  const handleMarkReceived = (order: PurchaseOrder) => {
    updateStatusMutation.mutate({
      orderId: order.id,
      status: 'received',
      deliveryDate: new Date().toISOString()
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const isOverdue = (order: PurchaseOrder) => {
    if (!order.expected_delivery_date || order.status === 'received' || order.status === 'cancelled') {
      return false
    }
    return new Date(order.expected_delivery_date) < new Date()
  }

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading purchase orders...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center text-red-600">
          <ClipboardList className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-medium mb-2">Failed to Load Purchase Orders</h3>
          <p className="text-red-500">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  const statusCounts = {
    all: orders.length,
    draft: orders.filter(o => o.status === 'draft').length,
    sent: orders.filter(o => o.status === 'sent').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    received: orders.filter(o => o.status === 'received').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    overdue: orders.filter(o => isOverdue(o)).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Purchase Orders</h2>
          <p className="text-gray-600 mt-1">Track purchase orders and deliveries from suppliers</p>
        </div>
        {showCreateButton && (
          <Button 
            onClick={handleCreateOrder}
            className="bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 text-sm rounded-full font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
                    statusFilter === status
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <config.icon className="w-3 h-3" />
                  {config.label} ({statusCounts[status as keyof typeof statusCounts]})
                </button>
              ))}
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 text-sm rounded-full font-medium transition-colors whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                All ({statusCounts.all})
              </button>
            </div>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchase Orders List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'No purchase orders found' 
                : 'No purchase orders yet'
              }
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first purchase order to get started'
              }
            </p>
            {showCreateButton && !searchQuery && statusFilter === 'all' && dateFilter === 'all' && (
              <Button 
                onClick={handleCreateOrder}
                className="bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Order
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  const StatusIcon = STATUS_CONFIG[order.status].icon
                  const overdue = isOverdue(order)
                  
                  return (
                    <tr key={order.id} className={`hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            #{order.order_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            Created {formatDate(order.created_at)}
                          </div>
                          {overdue && (
                            <div className="text-xs text-red-600 font-medium">
                              OVERDUE
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.supplier_name}</div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[order.status].color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {STATUS_CONFIG[order.status].label}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>Ordered: {formatDate(order.order_date)}</div>
                        {order.expected_delivery_date && (
                          <div>Expected: {formatDate(order.expected_delivery_date)}</div>
                        )}
                        {order.actual_delivery_date && (
                          <div className="text-green-600">
                            Delivered: {formatDate(order.actual_delivery_date)}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(order.total_amount)}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewOrder(order)}
                            className="text-primary-600"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          
                          {(order.status === 'draft' || order.status === 'sent') && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditOrder(order)}
                              className="text-primary-600"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          )}
                          
                          {(order.status === 'confirmed' || order.status === 'sent') && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleMarkReceived(order)}
                              className="text-green-600"
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark Received
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
            </div>
            <ClipboardList className="w-8 h-8 text-primary-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-yellow-600">
                {orders.filter(o => o.status === 'sent' || o.status === 'confirmed').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Overdue Orders</p>
              <p className="text-2xl font-bold text-red-600">
                {orders.filter(o => isOverdue(o)).length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(orders.reduce((sum, order) => sum + order.total_amount, 0))}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Modals */}
      <PurchaseOrderModal
        order={selectedOrder}
        isOpen={createModalOpen || editModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          setEditModalOpen(false)
          setSelectedOrder(null)
        }}
      />

      <PurchaseOrderViewModal
        order={selectedOrder}
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false)
          setSelectedOrder(null)
        }}
      />
    </div>
  )
}

export default PurchaseOrdersManagement