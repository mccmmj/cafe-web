'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Package, 
  Truck, 
  RefreshCw,
  X,
  Bell,
  BellOff
} from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { useOrderUpdates } from '@/hooks/useOrderUpdates'
import { toast } from 'react-hot-toast'

interface OrderStatusTrackerProps {
  userId?: string
  showOnlyActive?: boolean
  className?: string
}

const OrderStatusTracker = ({ 
  userId, 
  showOnlyActive = true, 
  className = '' 
}: OrderStatusTrackerProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  
  const { 
    activeOrders, 
    recentUpdates, 
    isLoading, 
    isConnected, 
    refreshOrders 
  } = useOrderUpdates(userId)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-primary-500" />
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-blue-500" />
      case 'preparing':
        return <Package className="w-5 h-5 text-purple-500" />
      case 'ready':
        return <Truck className="w-5 h-5 text-green-500" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-l-primary-500 bg-primary-50'
      case 'confirmed':
        return 'border-l-blue-500 bg-blue-50'
      case 'preparing':
        return 'border-l-purple-500 bg-purple-50'
      case 'ready':
        return 'border-l-green-500 bg-green-50'
      case 'completed':
        return 'border-l-green-600 bg-green-50'
      case 'cancelled':
        return 'border-l-red-500 bg-red-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Order Received'
      case 'confirmed':
        return 'Order Confirmed'
      case 'preparing':
        return 'Being Prepared'
      case 'ready':
        return 'Ready for Pickup'
      case 'completed':
        return 'Completed'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled)
    toast.success(
      notificationsEnabled 
        ? 'Order notifications disabled' 
        : 'Order notifications enabled'
    )
  }

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-16 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  if (showOnlyActive && activeOrders.length === 0) {
    return null
  }

  const ordersToShow = showOnlyActive ? activeOrders : activeOrders.slice(0, 3)

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">
              {showOnlyActive ? 'Active Orders' : 'Recent Orders'}
            </h3>
            {activeOrders.length > 0 && (
              <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
                {activeOrders.length}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Connection Status */}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            
            {/* Notifications Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleNotifications}
              className="p-1"
            >
              {notificationsEnabled ? (
                <Bell className="w-4 h-4 text-primary-600" />
              ) : (
                <BellOff className="w-4 h-4 text-gray-400" />
              )}
            </Button>
            
            {/* Refresh */}
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshOrders}
              className="p-1"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            {/* Expand/Collapse */}
            {activeOrders.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1"
              >
                {isExpanded ? (
                  <X className="w-4 h-4" />
                ) : (
                  <span className="text-xs">View All</span>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <AnimatePresence>
        {ordersToShow.length > 0 ? (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-gray-100">
              {ordersToShow.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 border-l-4 ${getStatusColor(order.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <p className="font-medium text-gray-900">
                          Order #{order.id.slice(-8)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {getStatusText(order.status)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ${(order.total_amount / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(order.updated_at)}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar for active orders */}
                  {!['completed', 'cancelled'].includes(order.status) && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            order.status === 'pending' ? 'w-1/4 bg-primary-500' :
                            order.status === 'confirmed' ? 'w-2/4 bg-blue-500' :
                            order.status === 'preparing' ? 'w-3/4 bg-purple-500' :
                            order.status === 'ready' ? 'w-full bg-green-500' :
                            'w-full bg-gray-500'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Show recent updates when expanded */}
            {isExpanded && recentUpdates.length > 0 && (
              <div className="p-4 bg-gray-50 border-t">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Updates</h4>
                <div className="space-y-2">
                  {recentUpdates.slice(0, 5).map((update, index) => (
                    <div key={index} className="text-xs text-gray-600">
                      <span className="font-medium">#{update.orderId.slice(-8)}</span>
                      {' '}changed from{' '}
                      <span className="font-medium">{update.oldStatus}</span>
                      {' '}to{' '}
                      <span className="font-medium">{update.newStatus}</span>
                      {' '}at {formatTime(update.timestamp)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm">No active orders</p>
          </div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export default OrderStatusTracker
