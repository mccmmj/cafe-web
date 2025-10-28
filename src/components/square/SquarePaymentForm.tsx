'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { CreditCard, Lock, Loader2 } from 'lucide-react'
import { useSquarePayments } from '@/providers/SquareProvider'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { toast } from 'react-hot-toast'
import type { SquareCard, SquareCardEvent, SquareTokenDetails } from '@/types/square'

interface BillingAddress {
  street: string
  city: string
  state: string
  zipCode: string
}

interface SquarePaymentFormProps {
  amount: number
  customerInfo: {
    name: string
    email: string
    phone: string
  }
  billingAddress: BillingAddress
  saveCard: boolean
  onPaymentSuccess: (result: PaymentSuccessPayload) => void
  onError: (error: Error) => void
  disabled?: boolean
}

interface PaymentSuccessDetails extends SquareTokenDetails {
  verificationToken: string | null
  saveCard: boolean
  billingAddress: BillingAddress
}

interface PaymentSuccessPayload {
  token: string
  details: PaymentSuccessDetails
}

export default function SquarePaymentForm({
  amount,
  customerInfo,
  billingAddress,
  saveCard,
  onPaymentSuccess,
  onError,
  disabled = false
}: SquarePaymentFormProps) {
  const { payments, isLoading: paymentsLoading, error: paymentsError } = useSquarePayments()
  const [card, setCard] = useState<SquareCard | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardInputErrors, setCardInputErrors] = useState<Record<string, string>>({})
  const [containerId] = useState(() => `card-container-${Math.random().toString(36).substr(2, 9)}`)
  const initializingRef = useRef(false)

  // Initialize Square Payment Form
  useEffect(() => {
    if (!payments || paymentsLoading || paymentsError) return
    
    // Check if already initialized
    if (initializingRef.current || card) {
      console.log('Square card already initialized, skipping')
      return
    }

    let isCleanedUp = false

    async function initializeCard() {
      if (isCleanedUp) return
      
      initializingRef.current = true
      console.log('Starting Square card initialization for container:', containerId)
      
      try {
        // Wait for DOM element to be available
        const waitForElement = () => {
          return new Promise<void>((resolve, reject) => {
            let attempts = 0
            const maxAttempts = 100 // 5 seconds max wait
            const checkElement = () => {
              if (isCleanedUp) {
                reject(new Error('Component cleaned up during initialization'))
                return
              }
              
              const element = document.getElementById(containerId)
              if (element) {
                resolve()
              } else if (attempts < maxAttempts) {
                attempts++
                setTimeout(checkElement, 50)
              } else {
                reject(new Error('Container element not found'))
              }
            }
            checkElement()
          })
        }

        await waitForElement()
        
        if (isCleanedUp) return

        // Clear any existing content in the container
        const container = document.getElementById(containerId)
        if (container) {
          container.innerHTML = ''
        }

        const cardInstance = await payments.card()
        
        if (isCleanedUp) {
          cardInstance.destroy()
          return
        }

        // Handle real-time validation
        cardInstance.addEventListener('cardBrandChanged', (event: SquareCardEvent) => {
          console.log('Card brand:', event.cardBrand)
        })

        cardInstance.addEventListener('errorChanged', (event: SquareCardEvent) => {
          const errors: Record<string, string> = {}
          for (const error of event.errors ?? []) {
            if (error.field) {
              errors[error.field] = error.message
            }
          }
          setCardInputErrors(errors)
        })

        cardInstance.addEventListener('postalCodeChanged', (event: SquareCardEvent) => {
          console.log('Postal code changed:', event.postalCode)
        })

        // Attach to DOM
        console.log('Attaching Square card to container:', containerId)
        await cardInstance.attach(`#${containerId}`)
        
        if (isCleanedUp) {
          cardInstance.destroy()
          return
        }
        
        setCard(cardInstance)
        console.log('Square card attached successfully')

      } catch (error) {
        console.error('Failed to initialize Square card:', error)
        initializingRef.current = false
        if (!isCleanedUp) {
          onError(new Error('Failed to initialize payment form'))
        }
      }
    }

    initializeCard()

    // Cleanup
    return () => {
      console.log('Cleaning up Square card for container:', containerId)
      isCleanedUp = true
      if (card) {
        try {
          card.destroy()
          console.log('Square card destroyed during cleanup')
        } catch (error) {
          console.error('Error destroying Square card:', error)
        }
      }
      initializingRef.current = false
    }
  }, [payments, paymentsLoading, paymentsError, onError, containerId, card])

  // Additional cleanup on unmount
  useEffect(() => {
    return () => {
      if (card) {
        try {
          card.destroy()
        } catch (error) {
          console.error('Error destroying Square card on unmount:', error)
        }
      }
    }
  }, [card])

  const handlePayment = useCallback(async () => {
    if (!card || !payments) {
      onError(new Error('Payment form not ready'))
      return
    }

    setIsProcessing(true)

    try {
      // Tokenize the payment method
      const tokenResult = await card.tokenize()

      if (tokenResult.status === 'OK') {
        const { token, details } = tokenResult

        console.log('Payment tokenized successfully:', { 
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 10) + '...',
          tokenType: typeof token,
          details: {
            card: details?.card,
            billing: details?.billing,
            digital_wallet: details?.digital_wallet
          }
        })

        // Verify buyer if needed (for SCA compliance)
        // Skip buyer verification for now to avoid issues with incomplete billing address
        const verificationToken: string | null = null
        console.log('Skipping buyer verification for now')

        // Call success handler with token and verification
        onPaymentSuccess({
          token,
          details: {
            ...(details ?? {}),
            verificationToken,
            saveCard,
            billingAddress
          }
        })

      } else {
        // Handle tokenization errors
        const errorMessages =
          tokenResult.errors?.map((tokenError) => tokenError.message).join(', ') ||
          'Payment processing failed'
        throw new Error(errorMessages)
      }

    } catch (error) {
      console.error('Payment processing error:', error)
      onError(error instanceof Error ? error : new Error('Payment processing failed'))
    } finally {
      setIsProcessing(false)
    }
  }, [card, payments, billingAddress, saveCard, onPaymentSuccess, onError])

  if (paymentsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
        <span className="ml-2 text-gray-600">Loading payment form...</span>
      </div>
    )
  }

  if (paymentsError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Payment form unavailable: {paymentsError}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Payment Amount Display */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-amber-800">Payment Amount</span>
          </div>
          <span className="text-xl font-bold text-amber-900">${amount.toFixed(2)}</span>
        </div>
      </div>

      {/* Card Input Container */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Card Information *
        </label>
        
        <div 
          id={containerId}
          className="border border-gray-300 rounded-md p-3"
          style={{ 
            borderColor: Object.keys(cardInputErrors).length > 0 ? '#EF4444' : '#D1D5DB',
            minHeight: '48px'
          }}
        >
          {/* Square Web Payments SDK will inject card inputs here */}
        </div>

        {/* Display card input errors */}
        {Object.keys(cardInputErrors).length > 0 && (
          <div className="space-y-1">
            {Object.entries(cardInputErrors).map(([field, message]) => (
              <p key={field} className="text-sm text-red-600">
                {message}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Billing Information Display */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Billing Information</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>{customerInfo.name}</p>
          {billingAddress.street && <p>{billingAddress.street}</p>}
          {(billingAddress.city || billingAddress.state || billingAddress.zipCode) && (
            <p>
              {[billingAddress.city, billingAddress.state, billingAddress.zipCode]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
          <p>{customerInfo.email}</p>
          <p>{customerInfo.phone}</p>
        </div>
      </div>

      {/* Save Card Option */}
      {saveCard && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            ✓ This payment method will be securely saved for future orders
          </p>
        </div>
      )}

      {/* Security Notice */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
        <Lock className="w-4 h-4" />
        <span>Your payment is processed securely by Square. Card details are never stored on our servers.</span>
      </div>

      {/* Payment Button */}
      <Button
        onClick={handlePayment}
        disabled={disabled || isProcessing || !card || Object.keys(cardInputErrors).length > 0}
        variant="primary"
        size="lg"
        fullWidth
        isLoading={isProcessing}
        className="mt-6"
      >
        {isProcessing ? 'Processing Payment...' : `Pay $${amount.toFixed(2)}`}
      </Button>
    </div>
  )
}
