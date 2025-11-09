'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Modal } from '@/components/ui'
import { 
  ClipboardList,
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  DollarSign,
  Package,
  Eye,
  Edit,
  Send,
  Download,
  Mail
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

type PurchaseOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'received'
  | 'cancelled'
  | 'confirmed'

interface PurchaseOrder {
  id: string
  supplier_id: string
  supplier_name: string
  supplier_contact?: string
  supplier_email?: string
  supplier_phone?: string
  order_number: string
  status: PurchaseOrderStatus
  order_date: string
  expected_delivery_date?: string
  actual_delivery_date?: string
  sent_at?: string
  sent_via?: string
  sent_notes?: string
  sent_by?: string
  sent_by_profile?: {
    full_name?: string | null
    email?: string | null
  } | null
  total_amount: number
  notes?: string
  created_at: string
  updated_at: string
  items?: PurchaseOrderItem[]
  status_history?: {
    previous_status: string | null
    new_status: string
    changed_by?: string | null
    changed_at: string
    note?: string | null
  }[]
}

interface PurchaseOrdersManagementProps {
  onOrderSelect?: (order: PurchaseOrder) => void
  showCreateButton?: boolean
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: any }> = {
  draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft', icon: FileText },
  pending_approval: { color: 'bg-amber-100 text-amber-800', label: 'Pending Approval', icon: Clock },
  approved: { color: 'bg-blue-100 text-blue-800', label: 'Approved', icon: CheckCircle },
  sent: { color: 'bg-indigo-100 text-indigo-800', label: 'Sent to Supplier', icon: Send },
  received: { color: 'bg-green-100 text-green-800', label: 'Received', icon: Package },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled', icon: XCircle }
}

const getStatusConfig = (status: PurchaseOrderStatus) => {
  const canonical = status === 'confirmed' ? 'approved' : status
  return STATUS_CONFIG[canonical] || STATUS_CONFIG.draft
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
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [sendForm, setSendForm] = useState({
    method: 'email',
    notes: '',
    sent_at: new Date().toISOString().slice(0, 16)
  })
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [emailForm, setEmailForm] = useState({
    to: '',
    cc: '',
    subject: '',
    message: '',
    markAsSent: true
  })
  const [emailSending, setEmailSending] = useState(false)
  const [markingReceiptOrderId, setMarkingReceiptOrderId] = useState<string | null>(null)
  
  const queryClient = useQueryClient()

  // Fetch purchase orders
  const { 
    data: ordersData, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['admin-purchase-orders', statusFilter, dateFilter],
    queryFn: async () => {
      const url = '/api/admin/purchase-orders?'
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
    mutationFn: async ({ orderId, body }: { orderId: string; body: Record<string, unknown> }) => {
      const response = await fetch(`/api/admin/purchase-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update purchase order')
      }

      return response.json()
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

  const resetEmailForm = () => {
    setEmailForm({
      to: '',
      cc: '',
      subject: '',
      message: '',
      markAsSent: true
    })
  }

  const handleEmailSupplier = (order: PurchaseOrder) => {
    if (!order.supplier_email) {
      toast.error('Supplier email is missing. Update the supplier record before emailing.')
      return
    }

    setSelectedOrder(order)
    setEmailForm({
      to: order.supplier_email,
      cc: '',
      subject: `Purchase Order ${order.order_number}`,
      message: '',
      markAsSent: true
    })
    setEmailModalOpen(true)
  }

  const handleEmailSubmit = async () => {
    if (!selectedOrder) return

    if (!emailForm.to.trim()) {
      toast.error('Please provide at least one recipient email.')
      return
    }

    try {
      setEmailSending(true)

      const response = await fetch(`/api/admin/purchase-orders/${selectedOrder.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailForm.to,
          cc: emailForm.cc || undefined,
          subject: emailForm.subject,
          message: emailForm.message,
          markAsSent: emailForm.markAsSent
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to email purchase order')
      }

      toast.success('Purchase order emailed to supplier')
      setEmailModalOpen(false)
      setSelectedOrder(null)
      resetEmailForm()
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-orders'] })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to email purchase order'
      toast.error(message)
    } finally {
      setEmailSending(false)
    }
  }

  const handleStatusChange = async (
    order: PurchaseOrder,
    nextStatus: PurchaseOrderStatus,
    successMessage: string,
    extraBody: Record<string, unknown> = {}
  ) => {
    try {
      await updateStatusMutation.mutateAsync({
        orderId: order.id,
        body: {
          status: nextStatus,
          ...extraBody
        }
      })

      toast.success(successMessage)
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-orders'] })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update purchase order'
      toast.error(message)
    }
  }

  const getOutstandingItems = (order: PurchaseOrder) => {
    const outstanding = order.items?.map(item => {
      const remaining = (item.quantity_ordered || 0) - (item.quantity_received || 0)
      return {
        id: item.id,
        inventory_item_name: item.inventory_item_name,
        remaining
      }
    }).filter(item => (item?.remaining ?? 0) > 0)

    return outstanding || []
  }

  const handleMarkReceived = async (order: PurchaseOrder) => {
    const outstanding = getOutstandingItems(order)
    if (outstanding.length === 0) {
      toast.success('Purchase order already fully received')
      return
    }

    try {
      setMarkingReceiptOrderId(order.id)

      for (const item of outstanding) {
        const response = await fetch(`/api/admin/purchase-orders/${order.id}/receipts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            purchase_order_item_id: item.id,
            quantity: item.remaining,
            notes: `Auto receipt logged from Mark Received action for ${order.order_number}`
          })
        })

        const result = await response.json()
        if (!response.ok) {
          throw new Error(result?.error || 'Failed to log receipt')
        }
      }

      toast.success('Purchase order marked as received')
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-orders'] })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark purchase order as received'
      toast.error(message)
    } finally {
      setMarkingReceiptOrderId(null)
    }
  }

  const handleSendSubmit = async () => {
    if (!selectedOrder) return

    const sentAtIso = sendForm.sent_at
      ? new Date(sendForm.sent_at).toISOString()
      : new Date().toISOString()

    await handleStatusChange(
      selectedOrder,
      'sent',
      'Purchase order marked as sent to supplier',
      {
        sent_at: sentAtIso,
        sent_via: sendForm.method,
        sent_notes: sendForm.notes || null
      }
    )

    setSendModalOpen(false)
    setSelectedOrder(null)
  }

  const handleDownloadPdf = async (order: PurchaseOrder) => {
    try {
      const response = await fetch(`/api/admin/purchase-orders/${order.id}/pdf`)
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || 'Failed to generate purchase order PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `PO-${order.order_number}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Purchase order PDF downloaded')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download purchase order PDF'
      toast.error(message)
    }
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

  const statusCounts: Record<string, number> = {
    draft: 0,
    pending_approval: 0,
    approved: 0,
    sent: 0,
    received: 0,
    cancelled: 0,
    all: orders.length,
    overdue: 0
  }

  orders.forEach(order => {
    const canonical = order.status === 'confirmed' ? 'approved' : order.status
    if (statusCounts[canonical] !== undefined) {
      statusCounts[canonical] += 1
    }
  })

  statusCounts.overdue = orders.filter(o => isOverdue(o)).length

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
                  {config.label} ({statusCounts[status] ?? 0})
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
                  const statusConfig = getStatusConfig(order.status)
                  const StatusIcon = statusConfig.icon
                  const overdue = isOverdue(order)
                  const outstandingItems = getOutstandingItems(order)
                  const totalOrdered = order.items?.reduce((sum, item) => sum + (item.quantity_ordered || 0), 0) || 0
                  const totalReceived = order.items?.reduce((sum, item) => sum + (item.quantity_received || 0), 0) || 0
                  
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
                        {totalOrdered > 0 && totalReceived > 0 && totalReceived < totalOrdered && (
                          <div className="text-xs text-indigo-600 mt-1">
                            Partially received ({totalReceived}/{totalOrdered})
                          </div>
                        )}
                  </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>Ordered: {formatDate(order.order_date)}</div>
                        {order.expected_delivery_date && (
                          <div>Expected: {formatDate(order.expected_delivery_date)}</div>
                        )}
                        {order.sent_at && (
                          <div className="text-indigo-600">Sent: {formatDate(order.sent_at)}</div>
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
                        <div className="flex flex-wrap items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewOrder(order)}
                            className="text-primary-600"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>

                          {(order.status === 'draft' || order.status === 'pending_approval' || order.status === 'approved' || order.status === 'sent') && (
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

                          {(['approved', 'confirmed', 'sent', 'received'] as PurchaseOrderStatus[]).includes(order.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { void handleDownloadPdf(order) }}
                              className="text-indigo-600"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              PDF
                            </Button>
                          )}

                          {(['approved', 'confirmed', 'sent'] as PurchaseOrderStatus[]).includes(order.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEmailSupplier(order)}
                              className="text-indigo-600"
                              disabled={emailSending && selectedOrder?.id === order.id}
                            >
                              <Mail className="w-4 h-4 mr-1" />
                              Email
                            </Button>
                          )}

                          {order.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleStatusChange(order, 'pending_approval', 'Purchase order submitted for approval')}
                              className="text-amber-600"
                              disabled={updateStatusMutation.isPending}
                            >
                              <Clock className="w-4 h-4 mr-1" />
                              Submit for Approval
                            </Button>
                          )}

                          {order.status === 'pending_approval' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleStatusChange(order, 'approved', 'Purchase order approved')}
                              className="text-blue-600"
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          )}

                          {(order.status === 'approved' || order.status === 'confirmed') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order)
                                setSendForm({
                                  method: order.sent_via || 'email',
                                  notes: order.sent_notes || '',
                                  sent_at: (order.sent_at ? new Date(order.sent_at).toISOString() : new Date().toISOString()).slice(0, 16)
                                })
                                setSendModalOpen(true)
                              }}
                              className="text-indigo-600"
                              disabled={updateStatusMutation.isPending}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Mark Sent
                            </Button>
                          )}

                          {(order.status === 'sent' || order.status === 'approved' || order.status === 'confirmed') && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => { void handleMarkReceived(order) }}
                              className="text-green-600"
                              disabled={
                                updateStatusMutation.isPending ||
                                markingReceiptOrderId === order.id ||
                                outstandingItems.length === 0
                              }
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {markingReceiptOrderId === order.id ? 'Receiving...' : 'Mark Received'}
                            </Button>
                          )}

                          {(order.status !== 'cancelled' && order.status !== 'received') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleStatusChange(order, 'cancelled', 'Purchase order cancelled')}
                              className="text-red-600"
                              disabled={updateStatusMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Cancel
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
                {orders.filter(o => ['pending_approval', 'approved', 'sent', 'confirmed'].includes(o.status)).length}
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

      <Modal
        isOpen={sendModalOpen}
        onClose={() => {
          setSendModalOpen(false)
          setSelectedOrder(null)
          setSendForm({ method: 'email', notes: '', sent_at: new Date().toISOString().slice(0, 16) })
        }}
        title="Mark Purchase Order as Sent"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Log when and how this purchase order was issued to the supplier. This will place the order in the <strong>Sent</strong> state.
          </p>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Sent Via</label>
            <select
              value={sendForm.method}
              onChange={(e) => setSendForm(prev => ({ ...prev, method: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="portal">Supplier Portal</option>
              <option value="in_person">In Person</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Sent At</label>
            <input
              type="datetime-local"
              value={sendForm.sent_at}
              onChange={(e) => setSendForm(prev => ({ ...prev, sent_at: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
            <textarea
              rows={3}
              value={sendForm.notes}
              onChange={(e) => setSendForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Emailed PO PDF to supplier contact"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setSendModalOpen(false)
                setSelectedOrder(null)
                setSendForm({ method: 'email', notes: '', sent_at: new Date().toISOString().slice(0, 16) })
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendSubmit}
              disabled={updateStatusMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Mark as Sent
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false)
          setSelectedOrder(null)
          resetEmailForm()
        }}
        title="Email Purchase Order to Supplier"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Send the supplier a PDF copy of this purchase order. You can add optional notes that will appear in the email body.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">To *</label>
              <input
                type="text"
                value={emailForm.to}
                onChange={(e) => setEmailForm(prev => ({ ...prev, to: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="supplier@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">CC</label>
              <input
                type="text"
                value={emailForm.cc}
                onChange={(e) => setEmailForm(prev => ({ ...prev, cc: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="ops-team@example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={emailForm.subject}
              onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Message (optional)</label>
            <textarea
              rows={6}
              value={emailForm.message}
              onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Include any special instructions or delivery notes for the supplier..."
            />
          </div>
          <label className="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              checked={emailForm.markAsSent}
              onChange={(e) => setEmailForm(prev => ({ ...prev, markAsSent: e.target.checked }))}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              Automatically record this purchase order as sent after emailing
            </span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setEmailModalOpen(false)
                setSelectedOrder(null)
                resetEmailForm()
              }}
              disabled={emailSending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => { void handleEmailSubmit() }}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={emailSending}
            >
              {emailSending ? 'Sending…' : 'Send Email'}
            </Button>
          </div>
        </div>
      </Modal>

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
