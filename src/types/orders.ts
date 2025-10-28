// Order related types

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  items: OrderItem[]
  customer: OrderCustomer
  payment: OrderPayment
  delivery?: OrderDelivery
  pricing: OrderPricing
  timestamps: OrderTimestamps
  notes?: string
  metadata?: Record<string, unknown>
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'refunded'

export interface OrderItem {
  id: string
  itemId: string
  name: string
  description?: string
  price: number
  quantity: number
  categoryId: string
  image?: string
  variation?: {
    id: string
    name: string
    price: number
  }
  customizations?: OrderCustomization[]
  notes?: string
  status: 'pending' | 'preparing' | 'ready' | 'unavailable'
}

export interface OrderCustomization {
  id: string
  name: string
  value: string
  price: number
}

export interface OrderCustomer {
  id?: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  isGuest: boolean
}

export interface OrderPayment {
  id: string
  method: 'square' | 'cash' | 'card'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  amount: number
  currency: 'USD'
  transactionId?: string
  cardLast4?: string
  cardBrand?: string
  processedAt?: string
  refundedAt?: string
  refundAmount?: number
}

export interface OrderDelivery {
  type: 'pickup' | 'delivery'
  status: 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered'
  address?: {
    street: string
    city: string
    state: string
    zipCode: string
    instructions?: string
  }
  scheduledTime?: string
  estimatedTime?: string
  actualTime?: string
}

export interface OrderPricing {
  subtotal: number
  tax: number
  taxRate: number
  discount: number
  discountCode?: string
  tip?: number
  total: number
}

export interface OrderTimestamps {
  createdAt: string
  updatedAt: string
  confirmedAt?: string
  preparingAt?: string
  readyAt?: string
  completedAt?: string
  cancelledAt?: string
}

// Order creation request
export interface CreateOrderRequest {
  items: Array<{
    itemId: string
    quantity: number
    variationId?: string
    customizations?: OrderCustomization[]
    notes?: string
  }>
  customer: OrderCustomer
  payment: {
    method: 'square' | 'cash'
    token?: string // For Square payments
  }
  delivery?: {
    type: 'pickup' | 'delivery'
    address?: OrderDelivery['address']
    scheduledTime?: string
  }
  discountCode?: string
  tip?: number
  notes?: string
}

// Order update request
export interface UpdateOrderRequest {
  status?: OrderStatus
  items?: OrderItem[]
  delivery?: Partial<OrderDelivery>
  notes?: string
}

// Order filters for queries
export interface OrderFilters {
  status?: OrderStatus[]
  customerId?: string
  dateFrom?: string
  dateTo?: string
  paymentMethod?: string[]
  deliveryType?: ('pickup' | 'delivery')[]
  minAmount?: number
  maxAmount?: number
  search?: string // Search in order number, customer name, items
}

// Order statistics
export interface OrderStats {
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
  ordersByStatus: Record<OrderStatus, number>
  ordersByPaymentMethod: Record<string, number>
  ordersByDeliveryType: Record<string, number>
  topItems: Array<{
    itemId: string
    name: string
    quantity: number
    revenue: number
  }>
  revenueByPeriod: Array<{
    period: string
    revenue: number
    orderCount: number
  }>
}
