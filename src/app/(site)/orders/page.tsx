'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, Receipt, RefreshCw, ChevronRight, Package } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import Navigation from '@/components/Navigation'
import Breadcrumbs from '@/components/layout/Breadcrumbs'
import { createClient } from '@/lib/supabase/client'
import { useCartState } from '@/hooks/useCartData'
import { useOrderUpdates } from '@/hooks/useOrderUpdates'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

interface OrderItem {
  id: string
  square_item_id: string
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
  variations?: Record<string, unknown> | null
  modifiers?: Record<string, unknown> | null
}

interface Order {
  id: string
  square_order_id: string | null
  total_amount: number
  tax_amount: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  customer_email: string | null
  customer_phone: string | null
  special_instructions: string | null
  pickup_time: string | null
  created_at: string
  updated_at: string
  order_items: OrderItem[]
}

export default function OrdersPage() {
  const [user, setUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  const router = useRouter()
  const { openCart } = useCartState()
  
  // Use the real-time order updates hook
  const { orders, isLoading, refreshOrders } = useOrderUpdates(user?.id)
  
  useEffect(() => {
    const supabaseClient = createClient()

    const fetchUser = async () => {
      try {
        // Get current user
        const { data: { user: currentUser } } = await supabaseClient.auth.getUser()
        if (!currentUser) {
          toast.error('Please sign in to view your orders')
          window.location.href = '/auth'
          return
        }
        
        setUser(currentUser)
      } catch (error) {
        console.error('Error loading user:', error)
        toast.error('Failed to load user')
      }
    }

    void fetchUser()
  }, [])

  const filteredOrders = useMemo(() => {
    let filtered = orders

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(query) ||
        order.order_items?.some(item => 
          item.item_name.toLowerCase().includes(query)
        )
      )
    }

    return filtered
  }, [orders, searchQuery, statusFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'preparing':
        return 'bg-blue-100 text-blue-800'
      case 'ready':
        return 'bg-amber-100 text-amber-800'
      case 'confirmed':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const reorderItems = async (order: Order) => {
    try {
      // Add each item from the order to the cart
      for (const item of order.order_items) {
        // This would integrate with your cart system
        // For now, we'll show a toast
        toast.success(`Added ${item.item_name} to cart`)
      }
      
      // Navigate to cart
      openCart()
      
    } catch (error) {
      console.error('Error reordering:', error)
      toast.error('Failed to reorder items')
    }
  }

  const formatPrice = (price: number) => {
    return (price / 100).toFixed(2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <main className="min-h-screen">
        <Navigation />
        <Breadcrumbs />
        
        <section className="pt-16 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <Navigation />
      <Breadcrumbs />
      
      {/* Hero Section */}
      <section className="pt-16 py-12 bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Order <span className="text-amber-600">History</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Track your orders and reorder your favorites with ease
            </p>
          </div>
        </div>
      </section>

      {/* Orders Section */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Active Orders Summary */}
          {user && filteredOrders.filter(order => !['completed', 'cancelled'].includes(order.status)).length > 0 && (
            <div className="mb-8">
              <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-amber-900">Active Orders</h3>
                    <p className="text-amber-700 text-sm">
                      You have {filteredOrders.filter(order => !['completed', 'cancelled'].includes(order.status)).length} active orders
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={refreshOrders}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </Card>
            </div>
          )}
          
          {/* Filters */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search orders or items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <Card className="p-12 text-center">
              <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {orders.length === 0 ? 'No orders yet' : 'No orders found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {orders.length === 0 
                  ? 'Start by placing your first order!' 
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
              {orders.length === 0 && (
                <Button onClick={() => window.location.href = '/menu'}>
                  Browse Menu
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group"
                >
                  <Card className="p-6 hover:shadow-lg transition-shadow">
                    
                    {/* Order Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.id.slice(-8)}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(order.created_at)}
                          </div>
                          {order.pickup_time && (
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              Pickup: {formatDate(order.pickup_time)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">
                          ${formatPrice(order.total_amount)}
                        </div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-2 mb-4">
                      {order.order_items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                          <div className="flex items-center">
                            <Package className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-gray-600">
                              {item.quantity}x {item.item_name}
                            </span>
                          </div>
                          <span className="font-medium">
                            ${formatPrice(item.total_price)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Special Instructions */}
                    {order.special_instructions && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-600">
                          <strong>Special instructions:</strong> {order.special_instructions}
                        </p>
                      </div>
                    )}

                    {/* Order Actions */}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-4">
                        {order.payment_status && (
                          <span className="text-sm text-gray-500">
                            Payment: {order.payment_status}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        {order.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reorderItems(order)}
                            className="flex items-center"
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Reorder
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center"
                          onClick={() => router.push(`/orders/${order.id}`)}
                        >
                          View Details
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
