'use client'

import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useCartState, useUpdateCartItem, useRemoveCartItem, useClearCart } from '@/hooks/useCartData'
import { useSquareCartTotals } from '@/hooks/useSquareCartTotals'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { toast } from 'react-hot-toast'

export default function GlobalCartModal() {
  const router = useRouter()
  const { cart, isOpen, closeCart, itemCount } = useCartState()
  const squareTotals = useSquareCartTotals(cart?.items || null)
  const updateCartItem = useUpdateCartItem()
  const removeFromCart = useRemoveCartItem()
  const clearCart = useClearCart()

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId)
      return
    }

    try {
      await updateCartItem.mutateAsync({ itemId, updates: { quantity: newQuantity } })
      toast.success('Cart updated')
    } catch (error) {
      toast.error('Failed to update cart')
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeFromCart.mutateAsync(itemId)
      toast.success('Item removed from cart')
    } catch (error) {
      toast.error('Failed to remove item')
    }
  }

  const handleClearCart = async () => {
    try {
      await clearCart.mutateAsync()
      toast.success('Cart cleared')
    } catch (error) {
      toast.error('Failed to clear cart')
    }
  }

  const handleCheckout = () => {
    // Close cart modal first to prevent any state conflicts
    closeCart()
    // Use Next.js router for proper client-side navigation
    router.push('/checkout')
  }

  const formatPrice = (price: number) => price.toFixed(2)

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeCart}
      title={`Your Cart (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`}
      size="md"
    >
      {/* Cart Content */}
      {!cart || cart.items.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
          <p className="text-gray-600 mb-6">Start adding items from our menu!</p>
          <Button onClick={() => {
            closeCart()
            router.push('/menu')
          }}>
            Browse Menu
          </Button>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
            {cart.items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  {item.variationName && (
                    <p className="text-sm text-gray-600">{item.variationName}</p>
                  )}
                  <p className="text-sm font-semibold text-amber-600">
                    ${formatPrice(item.price)} each
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                    className="p-1 rounded-md hover:bg-gray-200 transition-colors"
                    disabled={updateCartItem.isPending}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    className="p-1 rounded-md hover:bg-gray-200 transition-colors"
                    disabled={updateCartItem.isPending}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-1 text-red-500 hover:text-red-700 transition-colors"
                  disabled={removeFromCart.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Cart Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${formatPrice(squareTotals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax:</span>
              <span>
                {squareTotals.loading ? (
                  <span className="text-gray-500">Calculating...</span>
                ) : (
                  `$${formatPrice(squareTotals.tax)}`
                )}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>
                {squareTotals.loading ? (
                  <span className="text-gray-500">Calculating...</span>
                ) : (
                  `$${formatPrice(squareTotals.total)}`
                )}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={handleClearCart}
              disabled={clearCart.isPending}
              className="flex-1"
            >
              Clear Cart
            </Button>
            <Button
              onClick={handleCheckout}
              className="flex-1"
            >
              Checkout
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}