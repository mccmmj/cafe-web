import { z } from 'zod'

// Order Item Schema
export const orderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  squareItemId: z.string(),
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  totalPrice: z.number().min(0, 'Total price must be positive'),
  variations: z.record(z.string(), z.unknown()).optional(),
  modifiers: z.record(z.string(), z.unknown()).optional(),
  specialInstructions: z.string().max(200, 'Special instructions too long').optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// Order Status Schema
export const orderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
  'refunded'
])

// Payment Status Schema
export const paymentStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'partially_refunded'
])

// Order Type Schema
export const orderTypeSchema = z.enum(['pickup', 'delivery', 'dine_in'])

// Order Schema
export const orderSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  squareOrderId: z.string().optional(),
  status: orderStatusSchema.default('pending'),
  paymentStatus: paymentStatusSchema.default('pending'),
  orderType: orderTypeSchema.default('pickup'),
  totalAmount: z.number().min(0, 'Total amount must be positive'),
  taxAmount: z.number().min(0, 'Tax amount must be non-negative').default(0),
  tipAmount: z.number().min(0, 'Tip amount must be non-negative').default(0),
  customerEmail: z.string().email('Please enter a valid email address').optional(),
  customerPhone: z.string().regex(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/, 'Please enter a valid phone number').optional(),
  customerName: z.string().min(1, 'Customer name is required').optional(),
  specialInstructions: z.string().max(500, 'Special instructions too long').optional(),
  estimatedReadyTime: z.string().datetime().optional(),
  actualReadyTime: z.string().datetime().optional(),
  items: z.array(orderItemSchema).min(1, 'Order must contain at least one item'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// Create Order Schema
export const createOrderSchema = z.object({
  userId: z.string().optional(),
  orderType: orderTypeSchema.default('pickup'),
  customerEmail: z.string().email('Please enter a valid email address').optional(),
  customerPhone: z.string().regex(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/, 'Please enter a valid phone number').optional(),
  customerName: z.string().min(1, 'Customer name is required').optional(),
  specialInstructions: z.string().max(500, 'Special instructions too long').optional(),
  tipAmount: z.number().min(0, 'Tip amount must be non-negative').default(0),
  items: z.array(z.object({
    squareItemId: z.string().min(1, 'Square item ID is required'),
    itemName: z.string().min(1, 'Item name is required'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().min(0, 'Unit price must be positive'),
    totalPrice: z.number().min(0, 'Total price must be positive'),
    variations: z.record(z.string(), z.unknown()).optional(),
    modifiers: z.record(z.string(), z.unknown()).optional(),
    specialInstructions: z.string().max(200, 'Special instructions too long').optional(),
  })).min(1, 'Order must contain at least one item'),
})

// Update Order Schema
export const updateOrderSchema = z.object({
  status: orderStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  estimatedReadyTime: z.string().datetime().optional(),
  actualReadyTime: z.string().datetime().optional(),
  specialInstructions: z.string().max(500, 'Special instructions too long').optional(),
})

// Order Filter Schema
export const orderFilterSchema = z.object({
  status: z.array(orderStatusSchema).optional(),
  paymentStatus: z.array(paymentStatusSchema).optional(),
  orderType: z.array(orderTypeSchema).optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
})

// Order Search Schema
export const orderSearchSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty').max(100, 'Search query too long'),
  filters: orderFilterSchema.optional(),
  sortBy: z.enum(['createdAt', 'totalAmount', 'status', 'customerName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

// Order Analytics Schema
export const orderAnalyticsSchema = z.object({
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  metrics: z.array(z.enum(['revenue', 'orders', 'average_order_value', 'items_sold'])).default(['revenue', 'orders']),
})

// Square Webhook Event Schema
export const squareWebhookEventSchema = z.object({
  merchant_id: z.string(),
  location_id: z.string(),
  event_id: z.string(),
  created_at: z.string().datetime(),
  event_type: z.string(),
  entity_id: z.string(),
  data: z.record(z.string(), z.unknown()),
})

// Type exports
export type OrderItem = z.infer<typeof orderItemSchema>
export type OrderStatus = z.infer<typeof orderStatusSchema>
export type PaymentStatus = z.infer<typeof paymentStatusSchema>
export type OrderType = z.infer<typeof orderTypeSchema>
export type Order = z.infer<typeof orderSchema>
export type CreateOrder = z.infer<typeof createOrderSchema>
export type UpdateOrder = z.infer<typeof updateOrderSchema>
export type OrderFilter = z.infer<typeof orderFilterSchema>
export type OrderSearch = z.infer<typeof orderSearchSchema>
export type OrderAnalytics = z.infer<typeof orderAnalyticsSchema>
export type SquareWebhookEvent = z.infer<typeof squareWebhookEventSchema>

// Validation helper functions
export const validateOrder = (order: unknown) => {
  return orderSchema.safeParse(order)
}

export const validateCreateOrder = (data: unknown) => {
  return createOrderSchema.safeParse(data)
}

export const validateUpdateOrder = (data: unknown) => {
  return updateOrderSchema.safeParse(data)
}

export const validateOrderSearch = (data: unknown) => {
  return orderSearchSchema.safeParse(data)
}

export const validateSquareWebhook = (data: unknown) => {
  return squareWebhookEventSchema.safeParse(data)
}