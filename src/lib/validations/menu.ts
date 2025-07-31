// Menu validation schemas
import { z } from 'zod'
import type { MenuCategory, MenuItem } from '@/types/menu'

// Zod Schemas for type-safe validation
export const cartItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Quantity cannot exceed 50'),
  variationId: z.string().optional(),
  customizations: z.record(z.string(), z.string()).optional(),
  unitPrice: z.number().min(0).optional(),
  totalPrice: z.number().min(0).optional(),
})

export const orderSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Order must contain at least one item'),
  customerEmail: z.string().email('Please enter a valid email address').optional(),
  customerName: z.string().min(1, 'Customer name is required').optional(),
  customerPhone: z.string().regex(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/, 'Please enter a valid phone number').optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  totalAmount: z.number().min(0, 'Total amount must be positive').optional(),
  taxAmount: z.number().min(0).optional(),
})

export const menuItemUpdateSchema = z.object({
  name: z.string().min(1, 'Item name is required').optional(),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive').max(1000, 'Price cannot exceed $1000').optional(),
  isAvailable: z.boolean().optional(),
  stockLevel: z.number().int().min(0).optional(),
  preparationTime: z.number().int().min(0).optional(),
})

export const searchQuerySchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty').max(100, 'Search query too long'),
  categories: z.array(z.string()).optional(),
  priceRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
  }).optional(),
  sortBy: z.enum(['name', 'price', 'popularity', 'prep_time']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// Legacy interfaces for backwards compatibility
export interface CartItemValidation {
  itemId: string
  quantity: number
  variationId?: string
  customizations?: Record<string, string>
}

export interface OrderValidation {
  items: CartItemValidation[]
  customerEmail?: string
  customerName?: string
  customerPhone?: string
  notes?: string
}

// Type exports from Zod schemas
export type CartItem = z.infer<typeof cartItemSchema>
export type Order = z.infer<typeof orderSchema>
export type MenuItemUpdate = z.infer<typeof menuItemUpdateSchema>
export type SearchQuery = z.infer<typeof searchQuerySchema>

// Menu item validation
export const isValidMenuItem = (item: MenuItem): boolean => {
  return !!(
    item.id &&
    item.name &&
    item.price &&
    item.price > 0 &&
    item.categoryId
  )
}

// Menu category validation
export const isValidMenuCategory = (category: MenuCategory): boolean => {
  return !!(
    category.id &&
    category.name &&
    Array.isArray(category.items)
  )
}

// Cart item validation
export const validateCartItem = (item: CartItemValidation): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!item.itemId || typeof item.itemId !== 'string') {
    errors.push('Item ID is required')
  }

  if (!item.quantity || item.quantity < 1 || item.quantity > 50) {
    errors.push('Quantity must be between 1 and 50')
  }

  if (item.quantity !== Math.floor(item.quantity)) {
    errors.push('Quantity must be a whole number')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Order validation
export const validateOrder = (order: OrderValidation): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}

  if (!order.items || order.items.length === 0) {
    errors.items = 'Order must contain at least one item'
  } else {
    // Validate each cart item
    order.items.forEach((item, index) => {
      const itemValidation = validateCartItem(item)
      if (!itemValidation.isValid) {
        errors[`item_${index}`] = itemValidation.errors.join(', ')
      }
    })
  }

  if (order.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.customerEmail)) {
    errors.customerEmail = 'Please enter a valid email address'
  }

  if (order.customerPhone && !/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(order.customerPhone)) {
    errors.customerPhone = 'Please enter a valid phone number'
  }

  if (order.notes && order.notes.length > 500) {
    errors.notes = 'Notes must be less than 500 characters'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Price validation
export const isValidPrice = (price: number): boolean => {
  return typeof price === 'number' && price >= 0 && price <= 1000 && Number.isFinite(price)
}

// Search query validation
export const validateSearchQuery = (query: string): { isValid: boolean; sanitizedQuery: string } => {
  if (typeof query !== 'string') {
    return { isValid: false, sanitizedQuery: '' }
  }

  // Remove special characters and limit length
  const sanitized = query
    .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
    .trim()
    .slice(0, 100) // Limit length

  return {
    isValid: sanitized.length >= 1,
    sanitizedQuery: sanitized
  }
}