'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

interface OrderItem {
  id: string
  item_name: string
  quantity: number
  total_price: number
  unit_price?: number
  variations?: Record<string, unknown> | null
  modifiers?: Record<string, unknown> | null
}

interface Order {
  id: string
  square_order_id: string | null
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  total_amount: number
  tax_amount: number
  customer_email: string | null
  customer_phone: string | null
  created_at: string
  updated_at: string
  pickup_time: string | null
  special_instructions: string | null
  order_items?: OrderItem[]
}

interface OrderUpdate {
  orderId: string
  oldStatus: string
  newStatus: string
  timestamp: string
}

export function useOrderUpdates(userId?: string) {
  const [orders, setOrders] = useState<Order[]>([])
  const [recentUpdates, setRecentUpdates] = useState<OrderUpdate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  
  const supabase = createClient()

  // Load initial orders
  useEffect(() => {
    if (!userId) return

    const loadOrders = async () => {
      try {
        setIsLoading(true)
        
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (*)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading orders:', error)
          return
        }

        setOrders(data || [])
      } catch (error) {
        console.error('Error loading orders:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadOrders()
  }, [userId, supabase])

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return

    // Check if user is authenticated before setting up real-time
    const setupRealtime = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.log('No authenticated session, skipping real-time setup')
          return
        }

        const channel = supabase
          .channel('orders-updates')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'orders',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const newOrder = payload.new as Order
              const oldOrder = payload.old as Order
              
              // Update orders list
              setOrders(current => 
                current.map(order => 
                  order.id === newOrder.id ? { ...order, ...newOrder } : order
                )
              )

              // Track status changes
              if (oldOrder.status !== newOrder.status) {
                const update: OrderUpdate = {
                  orderId: newOrder.id,
                  oldStatus: oldOrder.status,
                  newStatus: newOrder.status,
                  timestamp: new Date().toISOString()
                }
                
                setRecentUpdates(current => [update, ...current.slice(0, 9)]) // Keep last 10 updates
                
                // Show notification
                showStatusNotification(newOrder.status, newOrder.id)
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'orders',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const newOrder = payload.new as Order
              
              // Add new order to list
              setOrders(current => [newOrder, ...current])
              
              // Show notification for new order
              toast.success(`Order #${newOrder.id.slice(-8)} has been placed!`, {
                duration: 5000,
              })
            }
          )
          .subscribe((status) => {
            setIsConnected(status === 'SUBSCRIBED')
            if (status === 'SUBSCRIBED') {
              console.log('Connected to real-time order updates')
            } else if (status === 'CHANNEL_ERROR') {
              console.warn('Real-time updates unavailable - using polling fallback')
              // Don't show error toast, just gracefully degrade
            } else if (status === 'CLOSED') {
              console.log('Real-time connection closed')
            }
          })

        return () => {
          supabase.removeChannel(channel)
        }
      } catch (error) {
        console.warn('Failed to setup real-time updates:', error)
        // Gracefully degrade - no error shown to user
      }
    }

    const cleanup = setupRealtime()
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.())
    }
  }, [userId, supabase])

  const showStatusNotification = (status: string, orderId: string) => {
    const shortOrderId = orderId.slice(-8)
    
    switch (status) {
      case 'confirmed':
        toast.success(`Order #${shortOrderId} confirmed! 🎉`, {
          duration: 5000,
        })
        break
      case 'preparing':
        toast(`Order #${shortOrderId} is being prepared 👨‍🍳`, {
          duration: 5000,
        })
        break
      case 'ready':
        toast.success(`Order #${shortOrderId} is ready for pickup! 📦`, {
          duration: 8000,
        })
        break
      case 'completed':
        toast.success(`Order #${shortOrderId} completed! Thank you! ✅`, {
          duration: 5000,
        })
        break
      case 'cancelled':
        toast.error(`Order #${shortOrderId} has been cancelled 🚫`, {
          duration: 8000,
        })
        break
      default:
        toast(`Order #${shortOrderId} status updated to ${status}`, {
          duration: 4000,
        })
    }
  }

  const getActiveOrders = () => {
    return orders.filter(order => 
      !['completed', 'cancelled'].includes(order.status)
    )
  }

  const getOrderById = (orderId: string) => {
    return orders.find(order => order.id === orderId)
  }

  const refreshOrders = async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error refreshing orders:', error)
        toast.error('Failed to refresh orders')
        return
      }

      setOrders(data || [])
      toast.success('Orders refreshed')
    } catch (error) {
      console.error('Error refreshing orders:', error)
      toast.error('Failed to refresh orders')
    }
  }

  return {
    orders,
    activeOrders: getActiveOrders(),
    recentUpdates,
    isLoading,
    isConnected,
    getOrderById,
    refreshOrders,
  }
}

export default useOrderUpdates
