// Cart and checkout related types

export interface CartItem {
  id: string
  itemId: string
  name: string
  description?: string
  price: number
  quantity: number
  categoryId: string
  categoryName: string
  image?: string
  variation?: {
    id: string
    name: string
    price: number
  }
  customizations?: CartCustomization[]
  notes?: string
  addedAt: string
}

export interface CartCustomization {
  id: string
  name: string
  value: string
  price: number
}

export interface CartSummary {
  items: CartItem[]
  itemCount: number
  subtotal: number
  tax: number
  taxRate: number
  discount: number
  discountCode?: string
  total: number
  estimatedTime?: number // in minutes
}

export interface CartValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Checkout types
export interface CheckoutData {
  cart: CartSummary
  customer: CustomerInfo
  payment: PaymentInfo
  delivery?: DeliveryInfo
  notes?: string
}

export interface CustomerInfo {
  firstName: string
  lastName: string
  email: string
  phone?: string
  isGuest: boolean
  userId?: string
}

export interface PaymentInfo {
  method: 'square' | 'cash' | 'card'
  token?: string // For Square payments
  cardLast4?: string
  cardBrand?: string
  amount: number
}

export interface DeliveryInfo {
  type: 'pickup' | 'delivery'
  address?: {
    street: string
    city: string
    state: string
    zipCode: string
    instructions?: string
  }
  scheduledTime?: string
}

// Discount types
export interface Discount {
  id: string
  code: string
  type: 'percentage' | 'fixed' | 'bogo' | 'free_shipping'
  value: number
  description: string
  minimumAmount?: number
  maximumDiscount?: number
  validFrom: string
  validUntil: string
  usageLimit?: number
  usedCount: number
  isActive: boolean
  applicableItems?: string[] // Item IDs
  applicableCategories?: string[] // Category IDs
}

// Cart context state
export interface CartContextState {
  cart: CartSummary
  loading: boolean
  error: string | null
  addItem: (item: Omit<CartItem, 'id' | 'addedAt'>) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  updateItem: (itemId: string, updates: Partial<CartItem>) => void
  clearCart: () => void
  applyDiscount: (code: string) => Promise<boolean>
  removeDiscount: () => void
  validateCart: () => CartValidation
  getItemTotal: (item: CartItem) => number
  isItemInCart: (itemId: string, variationId?: string) => boolean
}