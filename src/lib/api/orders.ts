// Order management API operations
import { API_ENDPOINTS } from '@/lib/constants'
import type { OrderValidation } from '@/lib/validations'

export interface OrderItem {
  itemId: string
  name: string
  price: number
  quantity: number
  variationId?: string
  variationName?: string
  customizations?: Record<string, string>
}

export interface Order {
  id: string
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  customerEmail?: string
  customerName?: string
  customerPhone?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateOrderRequest {
  items: OrderItem[]
  customerInfo?: {
    email?: string
    name?: string
    phone?: string
  }
  notes?: string
  paymentMethod: 'square' | 'cash'
  paymentDetails?: any
}

export interface OrderApiResponse {
  order?: Order
  orders?: Order[]
  error?: string
}

// Create a new order
export const createOrder = async (orderData: CreateOrderRequest): Promise<OrderApiResponse> => {
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      order: data.order,
      error: data.error
    }
  } catch (error) {
    console.error('Create order error:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to create order'
    }
  }
}

// Get order by ID
export const fetchOrder = async (orderId: string): Promise<OrderApiResponse> => {
  try {
    const response = await fetch(`/api/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      order: data.order,
      error: data.error
    }
  } catch (error) {
    console.error('Fetch order error:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch order'
    }
  }
}

// Get user's order history
export const fetchOrderHistory = async (userId?: string): Promise<OrderApiResponse> => {
  try {
    const url = userId ? `/api/orders?userId=${userId}` : '/api/orders'
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      orders: data.orders || [],
      error: data.error
    }
  } catch (error) {
    console.error('Fetch order history error:', error)
    return {
      orders: [],
      error: error instanceof Error ? error.message : 'Failed to fetch order history'
    }
  }
}

// Update order status (admin only)
export const updateOrderStatus = async (
  orderId: string, 
  status: Order['status']
): Promise<OrderApiResponse> => {
  try {
    const response = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      order: data.order,
      error: data.error
    }
  } catch (error) {
    console.error('Update order status error:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to update order status'
    }
  }
}

// Cancel order
export const cancelOrder = async (orderId: string): Promise<OrderApiResponse> => {
  return updateOrderStatus(orderId, 'cancelled')
}