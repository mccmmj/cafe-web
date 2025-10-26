'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cartQueryKeys } from './useCartData'
import type { Cart, CartItemType, AddToCart, UpdateCartItem } from '@/lib/validations/cart'
import { toast } from 'react-hot-toast'

// Optimistic cart operations with immediate UI feedback
export const useOptimisticCart = () => {
  const queryClient = useQueryClient()

  const addToCartOptimistic = useMutation({
    mutationFn: async (item: AddToCart & { itemDetails: any }) => {
      // Simulate API call delay for real implementation
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // This would be the actual API call
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      
      if (!response.ok) {
        throw new Error('Failed to add item to cart')
      }
      return response.json()
    },
    onMutate: async (newItem) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cartQueryKeys.cart() })

      // Snapshot previous cart
      const previousCart = queryClient.getQueryData<Cart>(cartQueryKeys.cart())

      if (previousCart) {
        // Create optimistic cart item
        const optimisticItem: CartItemType = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          itemId: newItem.itemId,
          name: newItem.itemDetails.name,
          price: newItem.itemDetails.price,
          quantity: newItem.quantity,
          variationId: newItem.variationId,
          customizations: newItem.customizations,
          specialInstructions: newItem.specialInstructions,
          imageUrl: newItem.itemDetails.imageUrl,
          totalPrice: newItem.itemDetails.price * newItem.quantity,
          isAvailable: true,
        }

        // Check if item already exists
        const existingItemIndex = previousCart.items.findIndex(
          item => 
            item.itemId === newItem.itemId &&
            item.variationId === newItem.variationId &&
            JSON.stringify(item.customizations) === JSON.stringify(newItem.customizations)
        )

        let optimisticItems: CartItemType[]
        
        if (existingItemIndex !== -1) {
          // Update existing item
          optimisticItems = [...previousCart.items]
          optimisticItems[existingItemIndex] = {
            ...optimisticItems[existingItemIndex],
            quantity: optimisticItems[existingItemIndex].quantity + newItem.quantity,
            totalPrice: (optimisticItems[existingItemIndex].quantity + newItem.quantity) * optimisticItems[existingItemIndex].price,
          }
        } else {
          // Add new item
          optimisticItems = [...previousCart.items, optimisticItem]
        }

        // Calculate new totals (tax calculated at component level)
        const subtotal = optimisticItems.reduce((sum, item) => sum + item.totalPrice, 0)
        const tax = 0 // Tax calculated at component level with proper Square config
        const total = subtotal // Will be recalculated at component level
        const itemCount = optimisticItems.reduce((sum, item) => sum + item.quantity, 0)

        const optimisticCart: Cart = {
          ...previousCart,
          items: optimisticItems,
          subtotal,
          tax,
          total,
          itemCount,
        }

        // Optimistically update cache
        queryClient.setQueryData(cartQueryKeys.cart(), optimisticCart)

        // Show optimistic feedback
        toast.success(`${newItem.itemDetails.name} added to cart`, {
          duration: 2000,
          position: 'bottom-right',
        })
      }

      return { previousCart, newItem }
    },
    onError: (error, newItem, context) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKeys.cart(), context.previousCart)
      }
      
      // Show error feedback
      toast.error(`Failed to add ${context?.newItem.itemDetails.name} to cart`, {
        duration: 3000,
        position: 'bottom-right',
      })
      
      console.error('Add to cart error:', error)
    },
    onSuccess: (actualCart, newItem) => {
      // Update with actual server response
      queryClient.setQueryData(cartQueryKeys.cart(), actualCart)
      
      // Optional: Show success confirmation
      // toast.success(`${newItem.itemDetails.name} added successfully`)
    },
    onSettled: () => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: cartQueryKeys.cart() })
    },
  })

  const updateCartItemOptimistic = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: string; updates: UpdateCartItem }) => {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update cart item')
      }
      return response.json()
    },
    onMutate: async ({ itemId, updates }) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKeys.cart() })
      
      const previousCart = queryClient.getQueryData<Cart>(cartQueryKeys.cart())
      
      if (previousCart) {
        const itemIndex = previousCart.items.findIndex(item => item.id === itemId)
        
        if (itemIndex !== -1) {
          const optimisticItems = [...previousCart.items]
          const updatedItem = { ...optimisticItems[itemIndex], ...updates }
          
          // Recalculate total price if quantity changed
          if (updates.quantity) {
            updatedItem.totalPrice = updatedItem.price * updates.quantity
          }
          
          optimisticItems[itemIndex] = updatedItem
          
          // Recalculate cart totals (tax calculated at component level)
          const subtotal = optimisticItems.reduce((sum, item) => sum + item.totalPrice, 0)
          const tax = 0 // Tax calculated at component level with proper Square config
          const total = subtotal // Will be recalculated at component level
          const itemCount = optimisticItems.reduce((sum, item) => sum + item.quantity, 0)
          
          const optimisticCart: Cart = {
            ...previousCart,
            items: optimisticItems,
            subtotal,
            tax,
            total,
            itemCount,
          }
          
          queryClient.setQueryData(cartQueryKeys.cart(), optimisticCart)
          
          // Show feedback
          if (updates.quantity) {
            toast.success('Cart updated', { duration: 1500 })
          }
        }
      }
      
      return { previousCart }
    },
    onError: (error, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKeys.cart(), context.previousCart)
      }
      toast.error('Failed to update cart item')
      console.error('Update cart item error:', error)
    },
    onSuccess: (actualCart) => {
      queryClient.setQueryData(cartQueryKeys.cart(), actualCart)
    },
  })

  const removeCartItemOptimistic = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove cart item')
      }
      return response.json()
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKeys.cart() })
      
      const previousCart = queryClient.getQueryData<Cart>(cartQueryKeys.cart())
      
      if (previousCart) {
        const itemToRemove = previousCart.items.find(item => item.id === itemId)
        const optimisticItems = previousCart.items.filter(item => item.id !== itemId)
        
        // Recalculate cart totals (tax calculated at component level)
        const subtotal = optimisticItems.reduce((sum, item) => sum + item.totalPrice, 0)
        const tax = 0 // Tax calculated at component level with proper Square config
        const total = subtotal // Will be recalculated at component level
        const itemCount = optimisticItems.reduce((sum, item) => sum + item.quantity, 0)
        
        const optimisticCart: Cart = {
          ...previousCart,
          items: optimisticItems,
          subtotal,
          tax,
          total,
          itemCount,
        }
        
        queryClient.setQueryData(cartQueryKeys.cart(), optimisticCart)
        
        // Show undo toast
        if (itemToRemove) {
          toast.success(`${itemToRemove.name} removed from cart`, {
            duration: 4000,
          })
        }
      }
      
      return { previousCart, itemId }
    },
    onError: (error, itemId, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKeys.cart(), context.previousCart)
      }
      toast.error('Failed to remove item from cart')
      console.error('Remove cart item error:', error)
    },
    onSuccess: (actualCart) => {
      queryClient.setQueryData(cartQueryKeys.cart(), actualCart)
    },
  })

  const clearCartOptimistic = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/cart/clear', {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to clear cart')
      }
      return response.json()
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: cartQueryKeys.cart() })
      
      const previousCart = queryClient.getQueryData<Cart>(cartQueryKeys.cart())
      
      // Optimistically clear cart
      const emptyCart: Cart = {
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        itemCount: 0,
      }
      
      queryClient.setQueryData(cartQueryKeys.cart(), emptyCart)
      
      // Show feedback
      toast.success('Cart cleared', {
        duration: 4000,
      })
      
      return { previousCart }
    },
    onError: (error, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKeys.cart(), context.previousCart)
      }
      toast.error('Failed to clear cart')
      console.error('Clear cart error:', error)
    },
    onSuccess: (actualCart) => {
      queryClient.setQueryData(cartQueryKeys.cart(), actualCart)
    },
  })

  return {
    addToCart: addToCartOptimistic,
    updateCartItem: updateCartItemOptimistic,
    removeCartItem: removeCartItemOptimistic,
    clearCart: clearCartOptimistic,
  }
}