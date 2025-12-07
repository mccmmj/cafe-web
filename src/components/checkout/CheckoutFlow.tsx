'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Lock, CheckCircle, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useCartState } from '@/hooks/useCartData'
import { useSquareCartTotals } from '@/hooks/useSquareCartTotals'
import { toast } from 'react-hot-toast'
import SquarePaymentForm, { PaymentSuccessPayload } from '@/components/square/SquarePaymentForm'

type PaymentMethod = 'card' | 'cash' | 'mobile'

interface CustomerInfo {
  name: string
  email: string
  phone: string
  paymentMethod?: PaymentMethod
}

interface CheckoutFlowProps {
  customerInfo: CustomerInfo
  onSuccess: (paymentData: PaymentData) => void
  onCancel?: () => void
}

interface BillingAddress {
  street: string
  city: string
  state: string
  zipCode: string
}

interface PaymentForm {
  cardNumber: string
  expiryDate: string
  cvv: string
  cardholderName: string
  billingAddress: BillingAddress
  saveCard?: boolean
}

interface SavedCard {
  id: string
  last4: string
  expMonth: number
  expYear: number
  cardholderName?: string
  cardBrand?: string
}

interface PaymentData {
  paymentId: string
  orderId: string
  method: PaymentMethod
  amount: number
  status: string
  timestamp: string
  savedCardId?: string
}
export default function CheckoutFlow({ customerInfo, onSuccess, onCancel }: CheckoutFlowProps) {
  const [step, setStep] = useState<'payment' | 'processing' | 'success'>('payment')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'mobile'>('card')
  const [isProcessing, setIsProcessing] = useState(false)
  const [savedCards, setSavedCards] = useState<SavedCard[]>([])
  const [selectedSavedCard, setSelectedSavedCard] = useState<string>('')
  const [showSquareForm, setShowSquareForm] = useState(false)
  
  const { cart } = useCartState()
  const squareTotals = useSquareCartTotals(cart?.items || null)

  // Saved card management functions
  const getSavedCards = useCallback(async () => {
    try {
      const response = await fetch('/api/square/customers/cards')
      if (!response.ok) return []
      
      const result = await response.json()
      return result.cards || []
    } catch (error) {
      console.error('Error fetching saved cards:', error)
      return []
    }
  }, [])

  const loadSavedCard = useCallback((cardId: string) => {
    const card = savedCards.find((c) => c.id === cardId)
    if (card) {
      setFormData(prev => ({
        ...prev,
        cardNumber: `**** **** **** ${card.last4}`,
        expiryDate: `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`,
        cardholderName: card.cardholderName || '',
        billingAddress: {
          street: '',
          city: '',
          state: '',
          zipCode: ''
        },
        saveCard: true
      }))
      setSelectedSavedCard(cardId)
    }
  }, [savedCards])

  const handlePaymentMethodSelect = useCallback((method: PaymentMethod) => {
    setPaymentMethod(method)
    if (method !== 'card') {
      setShowSquareForm(false)
      setSelectedSavedCard('')
    }
  }, [])

  const handleSquarePaymentSuccess = useCallback(async (result: PaymentSuccessPayload) => {
    setIsProcessing(true)
    setStep('processing')

    try {
      const { token, details } = result

      // Process the payment through our API
      const response = await fetch('/api/square/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentToken: token,
          amount: squareTotals.total,
          customerInfo,
          cartItems: cart?.items.map(item => ({
            id: item.itemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            variationId: item.variationId,
            variationName: item.variationName
          })) || [],
          verifiedBuyer: details.verificationToken,
          useSavedCard: false
        })
      })

      const paymentResult = await response.json()
      
      if (!response.ok) {
        throw new Error(paymentResult.error || 'Payment failed')
      }

      // Save card if requested
      if (details.saveCard && customerInfo?.email) {
        try {
          await fetch('/api/square/customers/save-card', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentToken: token,
              customerEmail: customerInfo.email,
              customerName: customerInfo.name,
              cardholderName: customerInfo.name,
              billingAddress: details.billingAddress
            })
          })
          toast.success('Payment method saved for future use!')
        } catch (saveError) {
          console.error('Failed to save payment method:', saveError)
          // Don't fail the payment if card saving fails
        }
      }

      const paymentData: PaymentData = {
        paymentId: paymentResult.paymentId,
        orderId: paymentResult.orderId,
        method: paymentMethod,
        amount: squareTotals.total,
        status: paymentResult.status,
        timestamp: new Date().toISOString()
        ,
        savedCardId: selectedSavedCard || undefined
      }
      
      setStep('success')
      toast.success('Payment processed successfully!')
      
      setTimeout(() => {
        onSuccess(paymentData)
      }, 1000)
      
    } catch (error) {
      console.error('Payment error:', error)
      setStep('payment')
      toast.error(error instanceof Error ? error.message : 'Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [squareTotals.total, customerInfo, cart, paymentMethod, selectedSavedCard, onSuccess])

  const handleSquarePaymentError = useCallback((error: Error) => {
    console.error('Square payment error:', error)
    toast.error(error.message || 'Payment processing failed')
  }, [])
  
  const [formData, setFormData] = useState<PaymentForm>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: customerInfo?.name || '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
    saveCard: false,
  })

  useEffect(() => {
    if (customerInfo?.paymentMethod) {
      setPaymentMethod(customerInfo.paymentMethod)
    }
    
    // Load saved cards on component mount
    const loadCards = async () => {
      const cards = await getSavedCards()
      setSavedCards(cards)
    }
    loadCards()
  }, [customerInfo, getSavedCards])

  const processSquarePayment = useCallback(async () => {
    setIsProcessing(true)
    setStep('processing')
    
    try {
      if (paymentMethod !== 'card') {
        // For non-card payments, create order directly
        const paymentData = {
          paymentId: `pay_${Date.now()}`,
          orderId: '',
          method: paymentMethod,
          amount: squareTotals.total,
          status: 'completed',
          timestamp: new Date().toISOString()
        }
        
        setStep('success')
        toast.success('Order confirmed!')
        
        setTimeout(() => {
          onSuccess(paymentData)
        }, 1000)
        return
      }

      // For saved card payments
      if (selectedSavedCard) {
        const response = await fetch('/api/square/process-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentToken: selectedSavedCard, // Use saved card ID as token
            amount: squareTotals.total,
            customerInfo,
            cartItems: cart?.items.map(item => ({
              id: item.itemId,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              variationId: item.variationId,
              variationName: item.variationName
            })) || [],
            useSavedCard: true
          })
        })

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Payment failed')
        }

        const paymentData = {
          paymentId: result.paymentId,
          orderId: result.orderId,
          method: paymentMethod,
          amount: squareTotals.total,
          status: result.status,
          timestamp: new Date().toISOString(),
          savedCardId: selectedSavedCard
        }
        
        setStep('success')
        toast.success('Payment processed successfully!')
        
        setTimeout(() => {
          onSuccess(paymentData)
        }, 1000)
        return
      }

      // For new card payments - this will be implemented with Square Web Payments SDK
      throw new Error('New card payment processing not yet implemented with Square SDK')
      
    } catch (error) {
      console.error('Payment error:', error)
      setStep('payment')
      toast.error(error instanceof Error ? error.message : 'Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [paymentMethod, squareTotals.total, selectedSavedCard, customerInfo, cart, onSuccess])

  const handleSubmitPayment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (paymentMethod === 'card' && !selectedSavedCard && !showSquareForm) {
      // Show Square payment form for new cards
      setShowSquareForm(true)
      return
    }

    // Process payment for saved cards, mobile, or cash
    await processSquarePayment()
  }, [paymentMethod, selectedSavedCard, showSquareForm, processSquarePayment])

  if (step === 'processing') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md mx-auto text-center py-16"
      >
        <Card variant="default" className="p-8">
          <Loader2 className="w-16 h-16 text-primary-600 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Payment</h3>
          <p className="text-gray-600 mb-4">Please wait while we process your payment securely...</p>
          <div className="text-sm text-gray-500">This may take a few moments</div>
        </Card>
      </motion.div>
    )
  }

  if (step === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto text-center py-16"
      >
        <Card variant="default" className="p-8">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h3>
          <p className="text-gray-600 mb-4">Your order has been confirmed and payment processed.</p>
          <div className="text-sm text-gray-500">Redirecting to order confirmation...</div>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >

      {/* Order Summary */}
      <Card variant="outline" className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="font-medium text-gray-900">Total Amount</div>
            <div className="text-sm text-gray-600">{cart?.itemCount} items</div>
          </div>
          <div className="text-2xl font-bold text-primary-600">
            {squareTotals.loading ? (
              <span className="text-gray-500">Calculating...</span>
            ) : (
              `$${squareTotals.total.toFixed(2)}`
            )}
          </div>
        </div>
      </Card>

      {/* Payment Method Selection */}
      <Card variant="default" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Edit customer info
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <label className="flex flex-col items-center space-y-2 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={() => handlePaymentMethodSelect('card')}
              className="text-primary-600 focus:ring-primary-500"
            />
            <CreditCard className="w-6 h-6 text-gray-600" />
            <span className="text-sm font-medium">Credit Card</span>
          </label>
          
          <label className="flex flex-col items-center space-y-2 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="paymentMethod"
              value="mobile"
              checked={paymentMethod === 'mobile'}
              onChange={() => handlePaymentMethodSelect('mobile')}
              className="text-primary-600 focus:ring-primary-500"
            />
            <div className="text-2xl">📱</div>
            <span className="text-sm font-medium">Mobile Pay</span>
          </label>
          
          <label className="flex flex-col items-center space-y-2 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="paymentMethod"
              value="cash"
              checked={paymentMethod === 'cash'}
              onChange={() => handlePaymentMethodSelect('cash')}
              className="text-primary-600 focus:ring-primary-500"
            />
            <div className="text-2xl">💵</div>
            <span className="text-sm font-medium">Pay in Store</span>
          </label>
        </div>

        {paymentMethod === 'card' && showSquareForm ? (
          <SquarePaymentForm
            amount={squareTotals.total || 0}
            customerInfo={customerInfo}
            billingAddress={formData.billingAddress}
            saveCard={formData.saveCard || false}
            onPaymentSuccess={handleSquarePaymentSuccess}
            onError={handleSquarePaymentError}
            disabled={isProcessing}
          />
        ) : (
          <form onSubmit={handleSubmitPayment} className="space-y-6">
            {paymentMethod === 'card' && (
              <>
                {/* Saved Cards */}
                {savedCards.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Saved Payment Methods</h4>
                    <div className="space-y-2">
                      {savedCards.map((card) => (
                        <label key={card.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="savedCard"
                            value={card.id}
                            checked={selectedSavedCard === card.id}
                            onChange={() => loadSavedCard(card.id)}
                            className="text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <CreditCard className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">•••• •••• •••• {card.last4}</span>
                              <span className="text-sm text-gray-500">{card.cardBrand}</span>
                            </div>
                            <div className="text-sm text-gray-600">{card.cardholderName || 'Card on file'}</div>
                          </div>
                        </label>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSavedCard('')
                          setShowSquareForm(true)
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        + Use a different card
                      </button>
                    </div>
                  </div>
                )}

                {/* Show "Use new card" button if no saved card selected and Square form not shown */}
                {!selectedSavedCard && !showSquareForm && (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">💳</div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Pay with Credit Card</h4>
                    <p className="text-gray-600 mb-4">
                      {savedCards.length > 0 
                        ? 'Select a saved card above or use a new card'
                        : 'Enter your credit card information to complete payment'
                      }
                    </p>
                  </div>
                )}
              </>
            )}

          {paymentMethod === 'mobile' && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📱</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Mobile Payment</h4>
              <p className="text-gray-600 mb-4">
                You can pay using Apple Pay, Google Pay, or other mobile payment methods at the store.
              </p>
              <div className="text-sm text-gray-500">
                Your order will be prepared and ready for mobile payment upon pickup.
              </div>
            </div>
          )}

          {paymentMethod === 'cash' && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">💵</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Pay in Store</h4>
              <p className="text-gray-600 mb-4">
                You can pay with cash when you pick up your order at the counter.
              </p>
              <div className="text-sm text-gray-500">
                Please have the exact amount ready or we&rsquo;ll provide change.
              </div>
            </div>
          )}

            {/* Security Notice */}
            <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <Lock className="w-4 h-4" />
              <span>Your payment information is encrypted and secure</span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isProcessing}
              className="mt-6"
            >
              {paymentMethod === 'card' ? (
                selectedSavedCard ? `Pay $${squareTotals.total?.toFixed(2)} with saved card` :
                showSquareForm ? 'Loading...' : 'Enter Card Details'
              ) : 'Complete Order'}
            </Button>
          </form>
        )}
      </Card>
    </motion.div>
  )
}
