'use client'

import { useState, useCallback, type SyntheticEvent } from 'react'
import { motion } from 'framer-motion'
import { Trash2, Plus, Minus, AlertCircle, Clock, MapPin } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useCartState } from '@/hooks/useCartData'
import { useOptimisticCart } from '@/hooks/useOptimisticCart'
import { useCartValidation } from '@/hooks/useCartData'
import Image from 'next/image'

interface CartReviewProps {
  onPrevious: () => void
  onContinue: () => void
  canContinue: boolean
}

export default function CartReview({ onPrevious, onContinue, canContinue }: CartReviewProps) {
  const { cart, isEmpty, itemCount } = useCartState()
  const { updateCartItem, removeCartItem, clearCart } = useOptimisticCart()
  const { data: validation } = useCartValidation()
  const [orderType, setOrderType] = useState<'pickup' | 'dine_in'>('pickup')
  const [specialInstructions, setSpecialInstructions] = useState('')

  const handleQuantityChange = useCallback(async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeCartItem.mutateAsync(itemId)
    } else {
      await updateCartItem.mutateAsync({
        itemId,
        updates: { quantity: newQuantity }
      })
    }
  }, [updateCartItem, removeCartItem])

  const handleRemoveItem = useCallback(async (itemId: string) => {
    await removeCartItem.mutateAsync(itemId)
  }, [removeCartItem])

  const handleClearCart = useCallback(async () => {
    if (confirm('Are you sure you want to clear your cart?')) {
      await clearCart.mutateAsync()
    }
  }, [clearCart])

  const estimatedTime = cart?.items.reduce((max) => {
    const prepTime = 5 // Default prep time, would come from item data
    return Math.max(max, prepTime)
  }, 0) || 0

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.style.display = 'none'
  }

  if (isEmpty) {
    return (
      <div className="text-center py-16">
        <Card variant="outline" className="p-8 max-w-md mx-auto">
          <div className="text-6xl mb-4">🛒</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h3>
          <p className="text-gray-600 mb-6">Add some delicious items from our menu to get started!</p>
          <Button variant="primary" onClick={onPrevious}>
            Browse Menu
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Review Your Order</h2>
        <p className="text-gray-600">Make any final adjustments before proceeding</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Validation Alerts */}
          {validation && !validation.isValid && (
            <Card variant="outline" className="p-4 border-red-200 bg-red-50">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-800 mb-2">Order Issues</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {validation && validation.warnings && validation.warnings.length > 0 && (
            <Card variant="outline" className="p-4 border-yellow-200 bg-yellow-50">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Notice</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Cart Items List */}
          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Order Items ({itemCount})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearCart}
                className="text-red-600 hover:text-red-700"
              >
                Clear Cart
              </Button>
            </div>

            <div className="space-y-4">
              {cart?.items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover rounded-lg"
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        🍽️
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                    {item.customizations && Object.keys(item.customizations).length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {Object.entries(item.customizations).map(([key, value]) => (
                          <span key={key} className="mr-2">{key}: {value}</span>
                        ))}
                      </div>
                    )}
                    {item.specialInstructions && (
                      <div className="text-xs text-gray-500 mt-1">
                        Note: {item.specialInstructions}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      disabled={updateCartItem.isPending}
                      className="w-8 h-8 p-0"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    
                    <span className="w-12 text-center font-medium">{item.quantity}</span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      disabled={updateCartItem.isPending}
                      className="w-8 h-8 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      ${item.totalPrice.toFixed(2)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={removeCartItem.isPending}
                      className="text-red-600 hover:text-red-700 mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>

        {/* Order Summary & Settings */}
        <div className="space-y-6">
          {/* Order Type */}
          <Card variant="default" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Type</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="orderType"
                  value="pickup"
                  checked={orderType === 'pickup'}
                  onChange={(e) => setOrderType(e.target.value as 'pickup' | 'dine_in')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>Pickup</span>
                </div>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="orderType"
                  value="dine_in"
                  checked={orderType === 'dine_in'}
                  onChange={(e) => setOrderType(e.target.value as 'pickup' | 'dine_in')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <div className="flex items-center space-x-2">
                  <span>🍽️</span>
                  <span>Dine In</span>
                </div>
              </label>
            </div>
          </Card>

          {/* Estimated Time */}
          <Card variant="outline" className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-primary-600" />
              <div>
                <div className="text-sm font-medium text-gray-900">Estimated Time</div>
                <div className="text-sm text-gray-600">
                  {estimatedTime + 5}-{estimatedTime + 10} minutes
                </div>
              </div>
            </div>
          </Card>

          {/* Special Instructions */}
          <Card variant="default" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Instructions</h3>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special requests or dietary notes..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-gray-500 mt-2">
              {specialInstructions.length}/500 characters
            </div>
          </Card>

          {/* Order Summary */}
          <Card variant="default" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>${cart?.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span>${cart?.tax.toFixed(2)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-primary-600">${cart?.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={onContinue}
              disabled={!canContinue || (validation && !validation.isValid)}
              className="mt-6"
            >
              Continue to Customer Info
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
