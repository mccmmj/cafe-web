export interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  categoryId: string
  imageUrl?: string
  variations?: MenuItemVariation[]
  isAvailable: boolean
  stockLevel?: number
  modifiers?: MenuModifier[]
}

export interface MenuItemVariation {
  id: string
  name: string
  priceDifference: number
}

export interface MenuModifier {
  id: string
  name: string
  price: number
  type: 'selection' | 'quantity'
  options?: ModifierOption[]
}

export interface ModifierOption {
  id: string
  name: string
  price: number
}

export interface MenuCategory {
  id: string
  name: string
  description?: string
  items: MenuItem[]
  sortOrder?: number
}

export interface CartItem extends MenuItem {
  quantity: number
  selectedVariations?: Record<string, string>
  selectedModifiers?: Record<string, number>
  totalPrice: number
}

export interface Order {
  id: string
  userId?: string
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  createdAt: Date
  squareOrderId?: string
}

export interface UserProfile {
  id: string
  email: string
  fullName?: string
  phone?: string
  createdAt: Date
  updatedAt: Date
}