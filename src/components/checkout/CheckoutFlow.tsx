'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Lock, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { useCartState } from '@/hooks/useCartData'
import { useSquareCartTotals } from '@/hooks/useSquareCartTotals'
import { toast } from 'react-hot-toast'
import { z } from 'zod'
import SquarePaymentForm from '@/components/square/SquarePaymentForm'

interface CheckoutFlowProps {
  customerInfo: any
  onSuccess: (paymentData: any) => void
  onCancel: () => void
}

const paymentSchema = z.object({
  cardNumber: z.string().regex(/^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/, 'Please enter a valid card number'),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Please enter a valid expiry date (MM/YY)'),
  cvv: z.string().regex(/^\d{3,4}$/, 'Please enter a valid CVV'),
  cardholderName: z.string().min(2, 'Please enter the cardholder name'),
  billingAddress: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required'),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  }),
  saveCard: z.boolean().optional(),
})

type PaymentForm = z.infer<typeof paymentSchema>

export default function CheckoutFlow({ customerInfo, onSuccess, onCancel }: CheckoutFlowProps) {
  const [step, setStep] = useState<'payment' | 'processing' | 'success'>('payment')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'mobile'>('card')
  const [isProcessing, setIsProcessing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [savedCards, setSavedCards] = useState<any[]>([])
  const [selectedSavedCard, setSelectedSavedCard] = useState<string>('')
  const [showSquareForm, setShowSquareForm] = useState(false)
  
  const { cart } = useCartState()
  const squareTotals = useSquareCartTotals(cart)

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

  const savePaymentCard = useCallback(async (paymentToken: string, cardData: PaymentForm) => {
    if (!cardData.saveCard || !customerInfo?.email) return

    try {
      const response = await fetch('/api/square/customers/save-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentToken,
          customerEmail: customerInfo.email,
          customerName: customerInfo.name,
          cardholderName: cardData.cardholderName,
          billingAddress: {
            street: cardData.billingAddress.street,
            city: cardData.billingAddress.city,
            state: cardData.billingAddress.state,
            zipCode: cardData.billingAddress.zipCode
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save payment method')
      }

      // Refresh saved cards
      const cards = await getSavedCards()
      setSavedCards(cards)
      
      toast.success('Payment method saved successfully!')
    } catch (error) {
      console.error('Error saving payment method:', error)
      toast.error('Failed to save payment method')
    }
  }, [customerInfo]) // Removed getSavedCards from dependency array to prevent infinite loop

  const loadSavedCard = useCallback((cardId: string) => {
    const card = savedCards.find((c: any) => c.id === cardId)
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

  const handleSquarePaymentSuccess = useCallback(async (result: { token: string, details: any }) => {
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

      const paymentData = {
        paymentId: paymentResult.paymentId,
        orderId: paymentResult.orderId,
        method: paymentMethod,
        amount: squareTotals.total,
        status: paymentResult.status,
        timestamp: new Date().toISOString()
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
  }, [squareTotals.total, customerInfo, cart, paymentMethod, onSuccess])

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
  }, [customerInfo]) // Removed getSavedCards from dependency array to prevent infinite loop

  const handleInputChange = useCallback((field: string, value: string | boolean) => {
    if (field.startsWith('billingAddress.')) {
      const addressField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          [addressField]: value,
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }, [errors])

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\D/g, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    handleInputChange('cardNumber', formatted)
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value)
    handleInputChange('expiryDate', formatted)
  }

  const processSquarePayment = useCallback(async () => {
    setIsProcessing(true)
    setStep('processing')
    
    try {
      if (paymentMethod !== 'card') {
        // For non-card payments, create order directly
        const paymentData = {
          paymentId: `pay_${Date.now()}`,
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
    setErrors({})

    if (paymentMethod === 'card' && !selectedSavedCard && !showSquareForm) {
      // Show Square payment form for new cards
      setShowSquareForm(true)
      return
    }

    // Process payment for saved cards, mobile, or cash
    await processSquarePayment()
  }, [paymentMethod, selectedSavedCard, showSquareForm, processSquarePayment])

  const getCardType = (number: string) => {
    const num = number.replace(/\s/g, '')
    if (/^4/.test(num)) return 'visa'
    if (/^5[1-5]/.test(num)) return 'mastercard'
    if (/^3[47]/.test(num)) return 'amex'
    if (/^6/.test(num)) return 'discover'
    return 'unknown'
  }

  if (step === 'processing') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md mx-auto text-center py-16"
      >
        <Card variant="default" className="p-8">
          <Loader2 className="w-16 h-16 text-amber-600 animate-spin mx-auto mb-4" />
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
          <div className="text-2xl font-bold text-amber-600">
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <label className="flex flex-col items-center space-y-2 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="text-amber-600 focus:ring-amber-500"
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
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="text-amber-600 focus:ring-amber-500"
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
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="text-amber-600 focus:ring-amber-500"
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
                      {savedCards.map((card: any) => (
                        <label key={card.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="savedCard"
                            value={card.id}
                            checked={selectedSavedCard === card.id}
                            onChange={() => loadSavedCard(card.id)}
                            className="text-amber-600 focus:ring-amber-500"
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
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
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
                Please have the exact amount ready or we'll provide change.
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