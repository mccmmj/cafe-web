'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { MenuItem, MenuCategory } from '@/types/menu'
import { Modal, Button } from '@/components/ui'
import CartItem, { CartItemData } from './CartItem'
import CartSummary from './CartSummary'
import CartEmptyState from './CartEmptyState'
import CheckoutModal from '../CheckoutModal'
import { useTaxInfo, calculateCartTotals } from '@/lib/tax-service'

interface CartContainerProps {
  isOpen: boolean
  onClose: () => void
  cart: Record<string, { itemId: string; variationId?: string; quantity: number }>
  categories: MenuCategory[]
  onUpdateQuantity: (cartKey: string, quantity: number) => void
  onRemoveItem: (cartKey: string) => void
  onClearCart: () => void
}

const CartContainer = ({
  isOpen,
  onClose,
  cart,
  categories,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart
}: CartContainerProps) => {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const { taxInfo } = useTaxInfo()

  // Helper function to find item by ID across all categories
  const findItemById = (itemId: string): MenuItem | null => {
    for (const category of categories) {
      const item = category.items?.find(item => item.id === itemId)
      if (item) return item
    }
    return null
  }

  // Convert cart to displayable items
  const cartItems: CartItemData[] = Object.entries(cart).map(([cartKey, cartData]) => {
    const item = findItemById(cartData.itemId)
    if (!item) {
      return {
        id: cartKey,
        name: 'Unknown Item',
        price: 0,
        quantity: cartData.quantity
      }
    }

    // Find the selected variation
    let variation = null
    if (cartData.variationId && item.variations) {
      variation = item.variations.find(v => v.id === cartData.variationId)
    }

    const displayPrice = variation ? item.price + variation.priceDifference : item.price

    return {
      id: cartKey,
      name: item.name,
      price: item.price,
      quantity: cartData.quantity,
      variationId: cartData.variationId,
      variationName: variation?.name,
      variationPrice: displayPrice
    }
  })

  // Calculate totals using Square tax configuration
  const subtotal = cartItems.reduce((sum, item) => sum + (item.variationPrice || item.price) * item.quantity, 0)
  const taxRate = taxInfo?.enabled ? taxInfo.rate : 0 // Use Square tax rate if available and enabled
  const { tax, total } = calculateCartTotals(subtotal, taxRate)
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const handleContinueShopping = () => {
    onClose()
  }

  const handleProceedToCheckout = () => {
    setIsCheckoutOpen(true)
  }

  const handleCloseCheckout = () => {
    setIsCheckoutOpen(false)
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Your Cart"
        size="lg"
      >
        {cartItems.length === 0 ? (
          <CartEmptyState onContinueShopping={handleContinueShopping} />
        ) : (
          <div className="space-y-6">
            {/* Cart Items */}
            <div className="max-h-96 overflow-y-auto">
              {cartItems.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemoveItem={onRemoveItem}
                />
              ))}
            </div>

            {/* Cart Summary */}
            <CartSummary
              subtotal={subtotal}
              tax={tax}
              total={total}
              itemCount={itemCount}
              taxInfo={taxInfo || undefined}
            />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={onClearCart}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear Cart
              </Button>
              
              <Button
                onClick={handleContinueShopping}
                variant="secondary"
                className="flex-1"
              >
                Continue Shopping
              </Button>
              
              <Button
                onClick={handleProceedToCheckout}
                className="flex-1"
              >
                Proceed to Checkout
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={handleCloseCheckout}
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
      )}
    </>
  )
}

export default CartContainer
