import { useState, useEffect, useCallback } from 'react'
import { Cart } from '@/types/cart'

interface SquareCartTotals {
  subtotal: number
  tax: number
  total: number
  loading: boolean
  error?: string
}

/**
 * Hook to get accurate cart totals from Square
 * This replaces frontend tax estimation with Square's actual calculations
 */
export function useSquareCartTotals(cart: Cart | null): SquareCartTotals {
  const [totals, setTotals] = useState<SquareCartTotals>({
    subtotal: 0,
    tax: 0,
    total: 0,
    loading: false
  })

  const fetchSquareTotals = useCallback(async (cartItems: any[]) => {
    if (!cartItems || cartItems.length === 0) {
      setTotals({
        subtotal: 0,
        tax: 0,
        total: 0,
        loading: false
      })
      return
    }

    setTotals(prev => ({ ...prev, loading: true, error: undefined }))

    try {
      // Convert cart items to the format Square expects
      const squareItems = cartItems.map(item => ({
        id: item.itemId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        variationId: item.variationId,
        variationName: item.variationName
      }))

      const response = await fetch('/api/square/order-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: squareItems }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Preview failed')
      }

      const data = await response.json()
      
      setTotals({
        subtotal: data.totals.subtotal,
        tax: data.totals.tax,
        total: data.totals.total,
        loading: false
      })

    } catch (error) {
      console.error('Failed to get Square cart totals:', error)
      
      // Fallback to frontend calculation
      const fallbackSubtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0)
      
      setTotals({
        subtotal: fallbackSubtotal,
        tax: 0, // No tax on fallback since we can't calculate it accurately
        total: fallbackSubtotal,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }, [])

  useEffect(() => {
    if (cart?.items) {
      // Debounce the API call to avoid too many requests
      const timeoutId = setTimeout(() => {
        fetchSquareTotals(cart.items)
      }, 300)

      return () => clearTimeout(timeoutId)
    } else {
      setTotals({
        subtotal: 0,
        tax: 0,
        total: 0,
        loading: false
      })
    }
  }, [cart?.items, fetchSquareTotals])

  return totals
}