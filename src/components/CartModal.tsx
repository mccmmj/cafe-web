'use client'

import { useState } from 'react'
import { X, Plus, Minus, ShoppingCart, Trash2 } from 'lucide-react'
import type { MenuItem, MenuCategory } from '@/types/menu'
import CheckoutModal from './CheckoutModal'
import { useTaxInfo, calculateCartTotals } from '@/lib/tax-service'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  variationId?: string
  variationName?: string
  variationPrice?: number
}

interface CartModalProps {
  isOpen: boolean
  onClose: () => void
  cart: Record<string, { itemId: string; variationId?: string; quantity: number }>
  categories: MenuCategory[]
  selectedVariations: Record<string, string>
  onUpdateQuantity: (cartKey: string, quantity: number) => void
  onRemoveItem: (cartKey: string) => void
  onClearCart: () => void
}

export default function CartModal({
  isOpen,
  onClose,
  cart,
  categories,
  selectedVariations,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart
}: CartModalProps) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const { taxInfo, loading: taxLoading, error: taxError } = useTaxInfo()
  
  if (!isOpen) return null

  // Helper function to find item by ID across all categories
  const findItemById = (itemId: string): MenuItem | null => {
    for (const category of categories) {
      const item = category.items?.find(item => item.id === itemId)
      if (item) return item
    }
    return null
  }


  // Helper function to calculate item price with variation
  const getItemPrice = (item: MenuItem, variationId?: string) => {
    if (variationId && item.variations) {
      const variation = item.variations.find(v => v.id === variationId)
      if (variation) {
        return item.price + variation.priceDifference
      }
    }
    return item.price
  }

  // Convert cart to structured cart items
  const cartItems: (CartItem & { cartKey: string })[] = Object.entries(cart).map(([cartKey, cartData]) => {
    const item = findItemById(cartData.itemId)
    if (!item) return null

    // Use the variation from cart data directly
    const variation = cartData.variationId ? 
      item.variations?.find(v => v.id === cartData.variationId) : null
    const itemPrice = getItemPrice(item, cartData.variationId)

    return {
      cartKey,
      id: cartData.itemId,
      name: item.name,
      price: itemPrice,
      quantity: cartData.quantity,
      variationId: cartData.variationId,
      variationName: variation?.name,
      variationPrice: itemPrice
    }
  }).filter(Boolean) as (CartItem & { cartKey: string })[]

  // Calculate totals using Square tax configuration
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const taxRate = taxInfo?.enabled ? taxInfo.rate : 0 // Use Square tax rate if available and enabled
  const { tax, total } = calculateCartTotals(subtotal, taxRate)

  const formatPrice = (price: number) => `$${price.toFixed(2)}`

  // Validate cart items
  const validateCart = () => {
    const invalidItems = cartItems.filter(cartItem => {
      const item = findItemById(cartItem.id)
      if (!item) return true // Item no longer exists
      
      // Check if selected variation still exists
      if (cartItem.variationId) {
        const variation = item.variations?.find(v => v.id === cartItem.variationId)
        if (!variation) return true // Variation no longer exists
      }
      
      return false
    })
    
    return {
      isValid: invalidItems.length === 0,
      invalidItems
    }
  }

  const { isValid: isCartValid, invalidItems } = validateCart()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Your Cart
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-500">Add some delicious items to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((cartItem) => {
                const item = findItemById(cartItem.id)
                if (!item) return null

                return (
                  <div key={cartItem.cartKey} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{cartItem.name}</h4>
                        {cartItem.variationName && (
                          <p className="text-sm text-gray-600">Size: {cartItem.variationName}</p>
                        )}
                        <p className="text-lg font-bold text-amber-600 mt-1">
                          {formatPrice(cartItem.price)}
                        </p>
                      </div>
                      <button
                        onClick={() => onRemoveItem(cartItem.cartKey)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Variation Info (read-only in cart) */}
                    {cartItem.variationName && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">Selected Size:</p>
                        <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                          {cartItem.variationName}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          To change size, remove this item and add it again with your preferred size.
                        </p>
                      </div>
                    )}

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onUpdateQuantity(cartItem.cartKey, cartItem.quantity - 1)}
                          className="bg-gray-600 text-white p-2 rounded-full hover:bg-gray-700 transition-colors"
                          disabled={cartItem.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-lg font-medium min-w-[40px] text-center">
                          {cartItem.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(cartItem.cartKey, cartItem.quantity + 1)}
                          className="bg-amber-600 text-white p-2 rounded-full hover:bg-amber-700 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Line Total</p>
                        <p className="text-lg font-bold text-gray-900">
                          {formatPrice(cartItem.price * cartItem.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer with totals and checkout */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            {/* Validation warnings */}
            {!isCartValid && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium mb-1">
                  Cart validation issues detected:
                </p>
                <ul className="text-xs text-red-700 space-y-1">
                  {invalidItems.map((item, index) => (
                    <li key={index}>
                      • {item.name} - Item or selected variation is no longer available
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-red-600 mt-2">
                  Please update or remove these items before checkout.
                </p>
              </div>
            )}
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  {taxInfo?.name || 'Tax'}
                  {taxInfo?.enabled && taxInfo.rate > 0 && (
                    <span className="text-xs text-gray-500">
                      ({(taxInfo.rate * 100).toFixed(2)}%)
                    </span>
                  )}
                  {taxInfo?.error && (
                    <span className="text-xs text-red-500" title={taxInfo.error}>
                      ⚠️
                    </span>
                  )}
                </span>
                <span className="font-medium">
                  {taxInfo?.enabled === false ? (
                    <span className="text-gray-500 text-xs">N/A</span>
                  ) : (
                    formatPrice(tax)
                  )}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                <span>Total</span>
                <span className="text-amber-600">{formatPrice(total)}</span>
              </div>
            </div>
            <button 
              disabled={!isCartValid}
              onClick={() => setIsCheckoutOpen(true)}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                isCartValid 
                  ? 'bg-amber-600 text-white hover:bg-amber-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isCartValid ? 'Proceed to Checkout' : 'Fix Cart Issues to Continue'}
            </button>
          </div>
        )}

        {/* Checkout Modal */}
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          cart={cart}
          categories={categories}
          subtotal={subtotal}
          tax={tax}
          total={total}
          onPaymentSuccess={() => {
            onClearCart()
            setIsCheckoutOpen(false)
            onClose()
          }}
        />
      </div>
    </div>
  )
}