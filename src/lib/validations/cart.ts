import { z } from 'zod'

// Cart Item Schema
export const cartItemSchema = z.object({
  id: z.string(),
  itemId: z.string().min(1, 'Item ID is required'),
  name: z.string().min(1, 'Item name is required'),
  price: z.number().min(0, 'Price must be positive'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Quantity cannot exceed 50'),
  variationId: z.string().optional(),
  variationName: z.string().optional(),
  customizations: z.record(z.string(), z.string()).optional(),
  specialInstructions: z.string().max(200, 'Special instructions too long').optional(),
  imageUrl: z.string().url().optional(),
  totalPrice: z.number().min(0, 'Total price must be positive'),
  isAvailable: z.boolean().default(true),
})

// Add Item to Cart Schema
export const addToCartSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Quantity cannot exceed 50'),
  variationId: z.string().optional(),
  customizations: z.record(z.string(), z.string()).optional(),
  specialInstructions: z.string().max(200, 'Special instructions too long').optional(),
})

export type CartItemDetails = {
  name: string
  price: number
  imageUrl?: string
  isAvailable: boolean
}

// Update Cart Item Schema
export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Quantity cannot exceed 50').optional(),
  customizations: z.record(z.string(), z.string()).optional(),
  specialInstructions: z.string().max(200, 'Special instructions too long').optional(),
})

// Cart Schema
export const cartSchema = z.object({
  items: z.array(cartItemSchema),
  subtotal: z.number().min(0, 'Subtotal must be positive'),
  tax: z.number().min(0, 'Tax must be positive'),
  total: z.number().min(0, 'Total must be positive'),
  itemCount: z.number().int().min(0, 'Item count must be non-negative'),
  discounts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    amount: z.number(),
    type: z.enum(['percentage', 'fixed']),
  })).optional(),
  couponCode: z.string().optional(),
})

// Cart State Schema
export const cartStateSchema = z.object({
  isOpen: z.boolean(),
  isLoading: z.boolean(),
  error: z.string().optional(),
  lastUpdated: z.date().optional(),
})

// Checkout Data Schema
export const checkoutDataSchema = z.object({
  customerInfo: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().regex(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/, 'Please enter a valid phone number'),
  }),
  paymentMethod: z.enum(['card', 'cash', 'apple_pay', 'google_pay']),
  orderType: z.enum(['pickup', 'delivery', 'dine_in']),
  specialInstructions: z.string().max(500, 'Special instructions too long').optional(),
  tip: z.object({
    type: z.enum(['percentage', 'fixed', 'none']),
    amount: z.number().min(0),
  }).optional(),
})

// Cart Validation Response Schema
export const cartValidationResponseSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()).optional(),
  unavailableItems: z.array(z.string()).optional(),
  priceChanges: z.array(z.object({
    itemId: z.string(),
    oldPrice: z.number(),
    newPrice: z.number(),
  })).optional(),
})

// Type exports
export type CartItemType = z.infer<typeof cartItemSchema>
export type AddToCart = z.infer<typeof addToCartSchema>
export type UpdateCartItem = z.infer<typeof updateCartItemSchema>
export type Cart = z.infer<typeof cartSchema>
export type CartState = z.infer<typeof cartStateSchema>
export type CheckoutData = z.infer<typeof checkoutDataSchema>
export type CartValidationResponse = z.infer<typeof cartValidationResponseSchema>

// Validation helper functions
export const validateCartItem = (item: unknown) => {
  return cartItemSchema.safeParse(item)
}

export const validateAddToCart = (data: unknown) => {
  return addToCartSchema.safeParse(data)
}

export const validateCart = (cart: unknown) => {
  return cartSchema.safeParse(cart)
}

export const validateCheckoutData = (data: unknown) => {
  return checkoutDataSchema.safeParse(data)
}
