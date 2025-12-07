'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Clock, MapPin, User } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useCartState } from '@/hooks/useCartData'
import MenuSelection from './MenuSelection'
import CartReview from './CartReview'
import CustomerInfo, { type CustomerInfoForm } from './CustomerInfo'
import OrderConfirmation, { type OrderPayload } from './OrderConfirmation'

export type OrderingStep = 'menu' | 'cart' | 'customer' | 'confirmation'

interface OrderingFlowProps {
  initialStep?: OrderingStep
  onComplete?: (order: OrderPayload) => void
  onCancel?: () => void
}

const steps = [
  { id: 'menu' as const, title: 'Menu', icon: ShoppingCart, description: 'Choose your items' },
  { id: 'cart' as const, title: 'Review', icon: Clock, description: 'Review your order' },
  { id: 'customer' as const, title: 'Details', icon: User, description: 'Customer information' },
  { id: 'confirmation' as const, title: 'Confirm', icon: MapPin, description: 'Order confirmation' },
]

export default function OrderingFlow({ initialStep = 'menu', onComplete, onCancel }: OrderingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OrderingStep>(initialStep)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfoForm | null>(null)
  const { cart, isEmpty, itemCount } = useCartState()

  const currentStepIndex = steps.findIndex(step => step.id === currentStep)

  const canProceedToCart = !isEmpty && itemCount > 0
  const canProceedToCustomer = canProceedToCart
  const canConfirmOrder = canProceedToCustomer && Boolean(customerInfo)

  const handleNext = useCallback(() => {
    switch (currentStep) {
      case 'menu':
        if (canProceedToCart) {
          setCurrentStep('cart')
        }
        break
      case 'cart':
        if (canProceedToCustomer) {
          setCurrentStep('customer')
        }
        break
      case 'customer':
        if (canConfirmOrder) {
          setCurrentStep('confirmation')
        }
        break
    }
  }, [currentStep, canProceedToCart, canProceedToCustomer, canConfirmOrder])

  const handlePrevious = useCallback(() => {
    switch (currentStep) {
      case 'cart':
        setCurrentStep('menu')
        break
      case 'customer':
        setCurrentStep('cart')
        break
      case 'confirmation':
        setCurrentStep('customer')
        break
    }
  }, [currentStep])

  const handleStepClick = useCallback((stepId: OrderingStep) => {
    switch (stepId) {
      case 'menu':
        setCurrentStep('menu')
        break
      case 'cart':
        if (canProceedToCart) {
          setCurrentStep('cart')
        }
        break
      case 'customer':
        if (canProceedToCustomer) {
          setCurrentStep('customer')
        }
        break
      case 'confirmation':
        if (canConfirmOrder) {
          setCurrentStep('confirmation')
        }
        break
    }
  }, [canProceedToCart, canProceedToCustomer, canConfirmOrder])

  const handleCustomerInfoSubmit = useCallback((info: CustomerInfoForm) => {
    setCustomerInfo(info)
    handleNext()
  }, [handleNext])

  const handleOrderConfirm = useCallback((order: OrderPayload) => {
    onComplete?.(order)
  }, [onComplete])

  const getStepStatus = (stepId: OrderingStep) => {
    const stepIndex = steps.findIndex(step => step.id === stepId)
    if (stepIndex < currentStepIndex) return 'completed'
    if (stepIndex === currentStepIndex) return 'current'
    
    switch (stepId) {
      case 'cart':
        return canProceedToCart ? 'enabled' : 'disabled'
      case 'customer':
        return canProceedToCustomer ? 'enabled' : 'disabled'
      case 'confirmation':
        return canConfirmOrder ? 'enabled' : 'disabled'
      default:
        return 'enabled'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Step Indicator */}
        <Card variant="outline" className="mb-8 p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id)
              const isClickable = status !== 'disabled'
              const Icon = step.icon

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => isClickable && handleStepClick(step.id)}
                    disabled={!isClickable}
                    className={`flex flex-col items-center space-y-2 px-4 py-2 rounded-lg transition-all ${
                      isClickable ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      status === 'current' 
                        ? 'bg-amber-600 border-amber-600 text-white' 
                        : status === 'completed'
                        ? 'bg-green-600 border-green-600 text-white'
                        : status === 'enabled'
                        ? 'border-gray-300 text-gray-600 hover:border-amber-600 hover:text-amber-600'
                        : 'border-gray-200 text-gray-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <div className={`text-sm font-medium ${
                        status === 'current' ? 'text-amber-600' : 
                        status === 'completed' ? 'text-green-600' :
                        status === 'enabled' ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-500">{step.description}</div>
                    </div>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-px mx-4 ${
                      index < currentStepIndex ? 'bg-green-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 'menu' && (
              <MenuSelection 
                onContinue={handleNext}
                canContinue={canProceedToCart}
              />
            )}
            
            {currentStep === 'cart' && (
              <CartReview 
                onPrevious={handlePrevious}
                onContinue={handleNext}
                canContinue={canProceedToCustomer}
              />
            )}
            
            {currentStep === 'customer' && (
              <CustomerInfo 
                onPrevious={handlePrevious}
                onSubmit={handleCustomerInfoSubmit}
                initialData={customerInfo ?? undefined}
              />
            )}
            
            {currentStep === 'confirmation' && customerInfo && (
              <OrderConfirmation 
                onPrevious={handlePrevious}
                onConfirm={handleOrderConfirm}
                customerInfo={customerInfo}
                cart={cart}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {currentStep !== 'confirmation' && (
          <Card variant="outline" className="mt-8 p-4">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={currentStep === 'menu' ? onCancel : handlePrevious}
                className="px-6"
              >
                {currentStep === 'menu' ? 'Cancel' : 'Previous'}
              </Button>
              
              <div className="text-center">
                <div className="text-sm text-gray-600">
                  Step {currentStepIndex + 1} of {steps.length}
                </div>
                {currentStep === 'menu' && !isEmpty && (
                  <div className="text-sm font-medium text-amber-600">
                    {itemCount} item{itemCount !== 1 ? 's' : ''} in cart
                  </div>
                )}
              </div>
              
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={
                  (currentStep === 'menu' && !canProceedToCart) ||
                  (currentStep === 'cart' && !canProceedToCustomer) ||
                  (currentStep === 'customer' && !canConfirmOrder)
                }
                className="px-6"
              >
                {currentStep === 'customer' ? 'Review Order' : 'Continue'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
