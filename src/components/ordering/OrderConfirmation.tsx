'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { CheckCircle, Clock, MapPin, Phone, Mail, Calendar, CreditCard, Receipt, ArrowRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from 'react-hot-toast'
import type { CartItem, CartSummary } from '@/types/cart'
import type { CustomerInfoForm } from './CustomerInfo'

export interface OrderPayload {
  id: string
  customerInfo: CustomerInfoForm
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  orderType: CustomerInfoForm['orderType']
  paymentMethod: CustomerInfoForm['paymentMethod']
  status: 'pending' | 'confirmed'
  createdAt: string
  estimatedTime: string
}

interface OrderConfirmationProps {
  onPrevious: () => void
  onConfirm: (order: OrderPayload) => void
  customerInfo: CustomerInfoForm
  cart?: CartSummary
}

export default function OrderConfirmation({ onPrevious, onConfirm, customerInfo, cart }: OrderConfirmationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const handleConfirmOrder = useCallback(async () => {
    if (!agreedToTerms) {
      toast.error('Please agree to the terms and conditions')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Generate order data
      const orderData: OrderPayload = {
        id: `ORD-${Date.now()}`,
        customerInfo,
        items: cart?.items || [],
        subtotal: cart?.subtotal || 0,
        tax: cart?.tax || 0,
        total: cart?.total || 0,
        orderType: customerInfo.orderType,
        paymentMethod: customerInfo.paymentMethod,
        status: 'pending',
        createdAt: new Date().toISOString(),
      estimatedTime: customerInfo.orderType === 'pickup' && customerInfo.pickupTime
        ? new Date(customerInfo.pickupTime).toISOString()
          : new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes from now for dine-in
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      onConfirm(orderData)
      toast.success('Order placed successfully!')
    } catch (error) {
      console.error('Order confirmation failed', error)
      toast.error('Failed to place order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [customerInfo, cart, agreedToTerms, onConfirm])

  const formatPickupTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const estimatedReadyTime = customerInfo.orderType === 'pickup' && customerInfo.pickupTime
    ? formatPickupTime(customerInfo.pickupTime)
    : 'In 15-20 minutes'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Confirm Your Order</h2>
        <p className="text-gray-600">Please review all details before placing your order</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card variant="default" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Customer Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{customerInfo.email}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">{customerInfo.phone}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Order Type:</span>
                <span className="font-medium capitalize">
                  {customerInfo.orderType.replace('_', ' ')}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Payment:</span>
                <span className="font-medium capitalize">{customerInfo.paymentMethod}</span>
              </div>
              
              {customerInfo.orderType === 'pickup' && customerInfo.pickupTime && (
                <div className="flex items-center space-x-2 md:col-span-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Pickup Time:</span>
                  <span className="font-medium">{formatPickupTime(customerInfo.pickupTime)}</span>
                </div>
              )}
              
              {customerInfo.orderType === 'dine_in' && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">Table:</span>
                  <span className="font-medium">#{customerInfo.tableNumber}</span>
                </div>
              )}
              
              {customerInfo.loyaltyNumber && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">Loyalty #:</span>
                  <span className="font-medium">{customerInfo.loyaltyNumber}</span>
                </div>
              )}
            </div>
            
            {customerInfo.specialRequests && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm font-medium text-yellow-800 mb-1">Special Requests:</div>
                <div className="text-sm text-yellow-700">{customerInfo.specialRequests}</div>
              </div>
            )}
          </Card>

          {/* Order Items */}
          <Card variant="default" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Receipt className="w-5 h-5 mr-2 text-amber-600" />
              Order Items ({cart?.items?.length || 0})
            </h3>
            
            <div className="space-y-4">
              {cart?.items?.map((item) => {
                const itemTotal = item.totalPrice ?? ((item.price || 0) * (item.quantity || 1))
                return (
                  <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        🍽️
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <div className="text-sm text-gray-600">
                      ${item.price.toFixed(2)} × {item.quantity}
                    </div>
                    {item.customizations && Object.keys(item.customizations).length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {Object.entries(item.customizations).map(([key, value]) => (
                          <span key={key} className="mr-2">{key}: {String(value)}</span>
                        ))}
                      </div>
                    )}
                    {item.specialInstructions && (
                      <div className="text-xs text-gray-500 mt-1">
                        Note: {item.specialInstructions}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      ${itemTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </Card>
        </div>

        {/* Order Summary & Actions */}
        <div className="space-y-6">
          {/* Estimated Time */}
          <Card variant="outline" className="p-4">
            <div className="text-center">
              <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900 mb-1">Estimated Ready Time</div>
              <div className="text-lg font-semibold text-amber-600">{estimatedReadyTime}</div>
            </div>
          </Card>

          {/* Order Summary */}
          <Card variant="default" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>${cart?.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span>${cart?.tax?.toFixed(2)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-amber-600">${cart?.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Terms and Conditions */}
          <Card variant="outline" className="p-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <div className="text-sm text-gray-600">
                I agree to the{' '}
                <button type="button" className="text-amber-600 hover:text-amber-700 font-medium">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button type="button" className="text-amber-600 hover:text-amber-700 font-medium">
                  Privacy Policy
                </button>
              </div>
            </label>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={handleConfirmOrder}
              disabled={!agreedToTerms || isSubmitting}
              isLoading={isSubmitting}
              className="flex items-center justify-center"
            >
              {isSubmitting ? 'Placing Order...' : (
                <>
                  Place Order
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              fullWidth
              onClick={onPrevious}
              disabled={isSubmitting}
            >
              Back to Customer Info
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center text-sm text-gray-500">
            <p>Need help? Call us at <span className="font-medium">(555) 123-4567</span></p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
