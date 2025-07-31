'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCartModal } from '@/providers/CartProvider'
import { cartSchema, addToCartSchema, updateCartItemSchema } from '@/lib/validations'
import type { Cart, CartItemType, AddToCart, UpdateCartItem } from '@/lib/validations/cart'

// Query Keys
export const cartQueryKeys = {
  all: ['cart'] as const,
  cart: () => [...cartQueryKeys.all, 'data'] as const,
  validation: () => [...cartQueryKeys.all, 'validation'] as const,
}

// API Functions
const fetchCart = async (): Promise<Cart> => {
  // For now, use localStorage for cart data
  const cartData = localStorage.getItem('cafe-cart')
  if (!cartData) {
    return {
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      itemCount: 0,
    }
  }
  
  try {
    const parsed = JSON.parse(cartData)
    
    // Handle legacy cart data or incomplete cart data
    const normalizedCart = {
      items: parsed.items || [],
      subtotal: parsed.subtotal || 0,
      tax: parsed.tax || 0,
      total: parsed.total || 0,
      itemCount: parsed.itemCount || 0,
      discounts: parsed.discounts,
      couponCode: parsed.couponCode,
    }
    
    const result = cartSchema.safeParse(normalizedCart)
    if (!result.success) {
      console.warn('Invalid cart data found, clearing cart:', result.error)
      // Clear invalid cart data and return empty cart
      localStorage.removeItem('cafe-cart')
      return {
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        itemCount: 0,
      }
    }
    
    // If we have items but missing calculated fields, recalculate
    if (result.data.items.length > 0 && (result.data.subtotal === 0 || result.data.total === 0)) {
      const recalculatedCart = calculateBasicCartTotals(result.data)
      await saveCart(recalculatedCart)
      return recalculatedCart
    }
    
    return result.data
  } catch (error) {
    console.error('Failed to parse cart data:', error)
    localStorage.removeItem('cafe-cart')
    return {
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      itemCount: 0,
    }
  }
}

const saveCart = async (cart: Cart): Promise<Cart> => {
  const validated = cartSchema.safeParse(cart)
  if (!validated.success) {
    throw new Error('Invalid cart data')
  }
  
  localStorage.setItem('cafe-cart', JSON.stringify(validated.data))
  return validated.data
}

const addItemToCart = async (item: AddToCart & { itemDetails?: { name: string; price: number; imageUrl?: string; isAvailable: boolean } }): Promise<Cart> => {
  const validatedItem = addToCartSchema.safeParse(item)
  if (!validatedItem.success) {
    throw new Error('Invalid item data')
  }

  const currentCart = await fetchCart()
  
  // Use provided item details or fetch from API as fallback
  let itemDetails = item.itemDetails
  if (!itemDetails) {
    const response = await fetch(`/api/menu`)
    if (!response.ok) {
      throw new Error('Failed to fetch menu data')
    }
    const menuData = await response.json()
    const allItems = menuData.categories?.flatMap((cat: any) => cat.items) || []
    const foundItem = allItems.find((menuItem: any) => menuItem.id === validatedItem.data.itemId)
    if (!foundItem) {
      throw new Error('Item not found in menu')
    }
    itemDetails = {
      name: foundItem.name,
      price: foundItem.price,
      imageUrl: foundItem.imageUrl,
      isAvailable: foundItem.isAvailable
    }
  }

  // Check if item already exists in cart
  const existingItemIndex = currentCart.items.findIndex(
    cartItem => 
      cartItem.itemId === validatedItem.data.itemId &&
      cartItem.variationId === validatedItem.data.variationId &&
      JSON.stringify(cartItem.customizations) === JSON.stringify(validatedItem.data.customizations)
  )

  let updatedItems: CartItemType[]
  
  if (existingItemIndex !== -1) {
    // Update existing item quantity
    updatedItems = [...currentCart.items]
    updatedItems[existingItemIndex] = {
      ...updatedItems[existingItemIndex],
      quantity: updatedItems[existingItemIndex].quantity + validatedItem.data.quantity,
      totalPrice: (updatedItems[existingItemIndex].quantity + validatedItem.data.quantity) * updatedItems[existingItemIndex].price,
    }
  } else {
    // Add new item to cart
    const newCartItem: CartItemType = {
      id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      itemId: validatedItem.data.itemId,
      name: itemDetails.name,
      price: itemDetails.price,
      quantity: validatedItem.data.quantity,
      variationId: validatedItem.data.variationId,
      customizations: validatedItem.data.customizations,
      specialInstructions: validatedItem.data.specialInstructions,
      imageUrl: itemDetails.imageUrl,
      totalPrice: itemDetails.price * validatedItem.data.quantity,
      isAvailable: itemDetails.isAvailable,
    }
    updatedItems = [...currentCart.items, newCartItem]
  }

  const updatedCart = calculateBasicCartTotals({ ...currentCart, items: updatedItems })
  return saveCart(updatedCart)
}

const updateCartItem = async (itemId: string, updates: UpdateCartItem): Promise<Cart> => {
  const validatedUpdates = updateCartItemSchema.safeParse(updates)
  if (!validatedUpdates.success) {
    throw new Error('Invalid update data')
  }

  const currentCart = await fetchCart()
  const itemIndex = currentCart.items.findIndex(item => item.id === itemId)
  
  if (itemIndex === -1) {
    throw new Error('Item not found in cart')
  }

  const updatedItems = [...currentCart.items]
  const updatedItem = { ...updatedItems[itemIndex], ...validatedUpdates.data }
  
  if (validatedUpdates.data.quantity) {
    updatedItem.totalPrice = updatedItem.price * validatedUpdates.data.quantity
  }
  
  updatedItems[itemIndex] = updatedItem
  const updatedCart = calculateBasicCartTotals({ ...currentCart, items: updatedItems })
  return saveCart(updatedCart)
}

const removeCartItem = async (itemId: string): Promise<Cart> => {
  const currentCart = await fetchCart()
  const updatedItems = currentCart.items.filter(item => item.id !== itemId)
  const updatedCart = calculateBasicCartTotals({ ...currentCart, items: updatedItems })
  return saveCart(updatedCart)
}

const clearCart = async (): Promise<Cart> => {
  const emptyCart: Cart = {
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    itemCount: 0,
  }
  return saveCart(emptyCart)
}

// Calculate basic cart totals without tax (tax calculated at component level)
const calculateBasicCartTotals = (cart: Cart): Cart => {
  const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0)
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  return {
    ...cart,
    subtotal,
    tax: 0, // Tax calculated at component level with proper Square config
    total: subtotal, // Will be recalculated at component level
    itemCount,
  }
}

// Calculate complete cart totals with tax rate (for component use)
export const calculateCartTotals = (cart: Cart, taxRate: number): Cart => {
  const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0)
  const tax = subtotal * taxRate
  const total = subtotal + tax
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  return {
    ...cart,
    subtotal,
    tax,
    total,
    itemCount,
  }
}

// Custom Hooks
export const useCart = () => {
  return useQuery({
    queryKey: cartQueryKeys.cart(),
    queryFn: fetchCart,
    staleTime: 0, // Always fresh
    gcTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useAddToCart = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addItemToCart,
    onMutate: async (newItem) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cartQueryKeys.cart() })

      // Snapshot previous value
      const previousCart = queryClient.getQueryData<Cart>(cartQueryKeys.cart())

      // Optimistically update cart
      if (previousCart) {
        const optimisticCart = { ...previousCart }
        // Add optimistic logic here if needed
        queryClient.setQueryData(cartQueryKeys.cart(), optimisticCart)
      }

      return { previousCart }
    },
    onError: (error, newItem, context) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKeys.cart(), context.previousCart)
      }
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(cartQueryKeys.cart(), updatedCart)
    },
  })
}

export const useUpdateCartItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: UpdateCartItem }) =>
      updateCartItem(itemId, updates),
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(cartQueryKeys.cart(), updatedCart)
    },
  })
}

export const useRemoveCartItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeCartItem,
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(cartQueryKeys.cart(), updatedCart)
    },
  })
}

export const useClearCart = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: clearCart,
    onSuccess: (emptyCart) => {
      queryClient.setQueryData(cartQueryKeys.cart(), emptyCart)
    },
  })
}

// Cart state management hook
export const useCartState = () => {
  const { data: cart, isLoading, error } = useCart()
  const { isOpen, openCart, closeCart, toggleCart } = useCartModal()

  return {
    cart,
    isOpen,
    isLoading,
    error,
    openCart,
    closeCart,
    toggleCart,
    isEmpty: cart?.items.length === 0,
    itemCount: cart?.itemCount ?? 0,
    total: cart?.total ?? 0,
  }
}

// Cart validation hook
export const useCartValidation = () => {
  const { data: cart } = useCart()

  return useQuery({
    queryKey: cartQueryKeys.validation(),
    queryFn: async () => {
      if (!cart || cart.items.length === 0) {
        return { isValid: true, errors: [], warnings: [] }
      }

      // Validate item availability
      const unavailableItems: string[] = []
      const priceChanges: Array<{ itemId: string; oldPrice: number; newPrice: number }> = []

      for (const item of cart.items) {
        try {
          const response = await fetch(`/api/menu/items/${item.itemId}`)
          if (response.ok) {
            const currentItem = await response.json()
            
            if (!currentItem.isAvailable) {
              unavailableItems.push(item.name)
            }
            
            if (currentItem.price !== item.price) {
              priceChanges.push({
                itemId: item.id,
                oldPrice: item.price,
                newPrice: currentItem.price,
              })
            }
          }
        } catch (error) {
          console.error(`Failed to validate item ${item.itemId}:`, error)
        }
      }

      const errors: string[] = []
      const warnings: string[] = []

      if (unavailableItems.length > 0) {
        errors.push(`These items are no longer available: ${unavailableItems.join(', ')}`)
      }

      if (priceChanges.length > 0) {
        warnings.push(`Prices have changed for ${priceChanges.length} item(s)`)
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        unavailableItems,
        priceChanges,
      }
    },
    enabled: !!cart && cart.items.length > 0,
    staleTime: 1000 * 30, // 30 seconds
  })
}