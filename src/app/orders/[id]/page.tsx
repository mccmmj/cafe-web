'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Receipt, 
  Package, 
  MapPin, 
  Phone, 
  Mail,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  Copy
} from 'lucide-react'
import { Button, Card } from '@/components/ui'
import Navigation from '@/components/Navigation'
import Breadcrumbs from '@/components/layout/Breadcrumbs'
import { createClient } from '@/lib/supabase/client'
import OrderStatusTracker from '@/components/ordering/OrderStatusTracker'
import { toast } from 'react-hot-toast'

interface OrderItem {
  id: string
  square_item_id: string
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
  variations: Record<string, any>
  modifiers: Record<string, any>
}

interface Order {
  id: string
  square_order_id: string | null
  order_number: string | null
  total_amount: number
  tax_amount: number
  subtotal: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  customer_email: string | null
  customer_phone: string | null
  special_instructions: string | null
  pickup_time: string | null
  estimated_pickup_time: string | null
  created_at: string
  updated_at: string
  admin_notes: string | null
  order_items: OrderItem[]
}

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  
  const supabase = createClient()
  const orderId = params.id as string

  useEffect(() => {
    loadUserAndOrder()
  }, [orderId])

  const loadUserAndOrder = async () => {
    try {
      // Get current user first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in to view order details')
        router.push('/')
        return
      }
      
      setUser(user)
      
      // Fetch order details
      const { data: orderData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', orderId)
        .eq('user_id', user.id) // Ensure user can only see their own orders
        .single()

      if (error) {
        console.error('Error loading order:', error)
        toast.error('Order not found')
        router.push('/orders')
        return
      }

      setOrder(orderData)
    } catch (error) {
      console.error('Error loading order:', error)
      toast.error('Failed to load order details')
      router.push('/orders')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle }
      case 'cancelled':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle }
      case 'preparing':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: Loader }
      case 'ready':
        return { bg: 'bg-amber-100', text: 'text-amber-800', icon: AlertCircle }
      case 'confirmed':
        return { bg: 'bg-purple-100', text: 'text-purple-800', icon: CheckCircle }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock }
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'failed':
      case 'refunded':
        return 'text-red-600'
      case 'processing':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatPrice = (price: number) => {
    return (price / 100).toFixed(2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const copyOrderId = () => {
    navigator.clipboard.writeText(order?.id || '')
    toast.success('Order ID copied to clipboard')
  }

  const reorderItems = async () => {
    if (!order) return
    
    try {
      // This would integrate with your cart system
      toast.success('Items added to cart')
      router.push('/menu')
    } catch (error) {
      console.error('Error reordering:', error)
      toast.error('Failed to reorder items')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <Navigation />
        <Breadcrumbs />
        
        <section className="pt-16 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="min-h-screen">
        <Navigation />
        <Breadcrumbs />
        
        <section className="pt-16 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Order not found</h1>
            <p className="text-gray-600 mb-6">The order you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button onClick={() => router.push('/orders')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
          </div>
        </section>
      </main>
    )
  }

  const statusInfo = getStatusColor(order.status)
  const StatusIcon = statusInfo.icon

  return (
    <main className="min-h-screen">
      <Navigation />
      <Breadcrumbs />
      
      {/* Header */}
      <section className="pt-16 py-8 bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/orders')}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Orders
              </Button>
              
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Order #{order.order_number || order.id.slice(-8)}
                </h1>
                <p className="text-gray-600">
                  Placed on {formatDate(order.created_at)}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                ${formatPrice(order.total_amount)}
              </div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                <StatusIcon className="w-4 h-4 mr-2" />
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Order Status Tracker */}
      {user && (
        <section className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <OrderStatusTracker userId={user.id} orderId={order.id} />
          </div>
        </section>
      )}

      {/* Order Details */}
      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Order Info */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Order Items */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Order Items
                </h2>
                
                <div className="space-y-4">
                  {order.order_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.item_name}</h3>
                        {item.variations && Object.keys(item.variations).length > 0 && (
                          <div className="mt-1">
                            {Object.entries(item.variations).map(([key, value]: [string, any]) => (
                              <p key={key} className="text-sm text-gray-600">
                                {key}: {value}
                              </p>
                            ))}
                          </div>
                        )}
                        {item.modifiers && Object.keys(item.modifiers).length > 0 && (
                          <div className="mt-1">
                            {Object.entries(item.modifiers).map(([key, value]: [string, any]) => (
                              <p key={key} className="text-sm text-gray-600">
                                + {key}: {value}
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          ${formatPrice(item.unit_price)} each
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          ${formatPrice(item.total_price)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Total */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>${formatPrice(order.subtotal || (order.total_amount - (order.tax_amount || 0)))}</span>
                    </div>
                    {order.tax_amount > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Tax</span>
                        <span>${formatPrice(order.tax_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-semibold text-gray-900 pt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span>${formatPrice(order.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Special Instructions */}
              {order.special_instructions && (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Special Instructions</h2>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-md">
                    {order.special_instructions}
                  </p>
                </Card>
              )}

              {/* Admin Notes */}
              {order.admin_notes && (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Notes from Staff</h2>
                  <p className="text-gray-700 bg-blue-50 p-4 rounded-md">
                    {order.admin_notes}
                  </p>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              
              {/* Order Info */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Information</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Order ID</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono text-gray-900">
                        {order.id.slice(-12)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyOrderId}
                        className="p-1"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {order.square_order_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Square ID</span>
                      <span className="text-sm font-mono text-gray-900">
                        {order.square_order_id.slice(-12)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Payment Status</span>
                    <span className={`text-sm font-medium capitalize ${getPaymentStatusColor(order.payment_status)}`}>
                      {order.payment_status}
                    </span>
                  </div>

                  <div className="flex items-start justify-between">
                    <span className="text-gray-600">Status</span>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Pickup Information */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Pickup Information
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium text-gray-900">Little Cafe</p>
                    <p className="text-sm text-gray-600">
                      Kaiser Permanente Medical Complex<br />
                      10400 E Alameda Ave, Denver, CO
                    </p>
                  </div>

                  {order.pickup_time && (
                    <div>
                      <p className="text-sm text-gray-600">Requested Pickup Time</p>
                      <div className="flex items-center mt-1">
                        <Clock className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">
                          {formatDate(order.pickup_time)}
                        </span>
                      </div>
                    </div>
                  )}

                  {order.estimated_pickup_time && (
                    <div>
                      <p className="text-sm text-gray-600">Estimated Pickup Time</p>
                      <div className="flex items-center mt-1">
                        <Clock className="w-4 h-4 text-amber-500 mr-2" />
                        <span className="font-medium text-gray-900">
                          {formatDate(order.estimated_pickup_time)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Contact Information */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
                
                <div className="space-y-3">
                  {order.customer_email && (
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-gray-900">{order.customer_email}</span>
                    </div>
                  )}
                  
                  {order.customer_phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-gray-900">{order.customer_phone}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Actions */}
              <Card className="p-6">
                <div className="space-y-3">
                  {order.status === 'completed' && (
                    <Button
                      onClick={reorderItems}
                      className="w-full flex items-center justify-center"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reorder Items
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => window.print()}
                    className="w-full flex items-center justify-center"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Print Receipt
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}