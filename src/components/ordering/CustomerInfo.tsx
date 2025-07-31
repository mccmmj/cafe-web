'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, MapPin, Calendar, CreditCard } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PhoneInput from '@/components/ui/PhoneInput'
import { Card } from '@/components/ui/Card'
import { z } from 'zod'
import { toast } from 'react-hot-toast'

interface CustomerInfoProps {
  onPrevious: () => void
  onSubmit: (data: any) => void
  initialData?: any
}

const customerInfoSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().regex(/^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$/, 'Please enter a valid phone number in format (555) 123-4567'),
  orderType: z.enum(['pickup', 'dine_in']),
  pickupTime: z.string().optional(),
  tableNumber: z.string().optional(),
  loyaltyNumber: z.string().optional(),
  paymentMethod: z.enum(['card', 'cash', 'mobile']),
  specialRequests: z.string().max(500, 'Special requests must be less than 500 characters').optional(),
})

type CustomerInfoForm = z.infer<typeof customerInfoSchema>

export default function CustomerInfo({ onPrevious, onSubmit, initialData }: CustomerInfoProps) {
  const [formData, setFormData] = useState<CustomerInfoForm>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    orderType: initialData?.orderType || 'pickup',
    pickupTime: initialData?.pickupTime || '',
    tableNumber: initialData?.tableNumber || '',
    loyaltyNumber: initialData?.loyaltyNumber || '',
    paymentMethod: initialData?.paymentMethod || 'card',
    specialRequests: initialData?.specialRequests || '',
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = useCallback((field: keyof CustomerInfoForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }, [errors])

  const generatePickupTimes = () => {
    const times = []
    const now = new Date()
    const startTime = new Date(now.getTime() + 15 * 60000) // 15 minutes from now
    
    for (let i = 0; i < 12; i++) {
      const time = new Date(startTime.getTime() + i * 15 * 60000) // 15-minute intervals
      const timeString = time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      times.push({
        value: time.toISOString(),
        label: timeString
      })
    }
    return times
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    try {
      const validatedData = customerInfoSchema.parse(formData)
      
      // Additional validation based on order type
      if (validatedData.orderType === 'pickup' && !validatedData.pickupTime) {
        setErrors({ pickupTime: 'Please select a pickup time' })
        return
      }
      
      if (validatedData.orderType === 'dine_in' && !validatedData.tableNumber) {
        setErrors({ tableNumber: 'Please specify your table number' })
        return
      }

      onSubmit(validatedData)
      toast.success('Customer information saved!')
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(fieldErrors)
        toast.error('Please fix the form errors')
      } else {
        toast.error('An error occurred. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, onSubmit])

  const pickupTimes = generatePickupTimes()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Customer Information</h2>
        <p className="text-gray-600">We need a few details to complete your order</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card variant="default" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-amber-600" />
            Personal Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={errors.name}
                required
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10"
                  error={errors.email}
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                <PhoneInput
                  value={formData.phone}
                  onChange={(value) => handleInputChange('phone', value)}
                  className="pl-10"
                  placeholder="(555) 123-4567"
                  required
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="loyaltyNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Loyalty Number (Optional)
              </label>
              <Input
                id="loyaltyNumber"
                type="text"
                placeholder="Enter loyalty card number"
                value={formData.loyaltyNumber}
                onChange={(e) => handleInputChange('loyaltyNumber', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Order Details */}
        <Card variant="default" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-amber-600" />
            Order Details
          </h3>
          
          <div className="space-y-4">
            {/* Order Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Type *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="orderType"
                    value="pickup"
                    checked={formData.orderType === 'pickup'}
                    onChange={(e) => handleInputChange('orderType', e.target.value)}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="font-medium">Pickup</div>
                    <div className="text-sm text-gray-600">Ready for pickup</div>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="orderType"
                    value="dine_in"
                    checked={formData.orderType === 'dine_in'}
                    onChange={(e) => handleInputChange('orderType', e.target.value)}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="font-medium">Dine In</div>
                    <div className="text-sm text-gray-600">Enjoy at the cafe</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Conditional Fields */}
            {formData.orderType === 'pickup' && (
              <div>
                <label htmlFor="pickupTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Pickup Time *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    id="pickupTime"
                    value={formData.pickupTime}
                    onChange={(e) => handleInputChange('pickupTime', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select pickup time</option>
                    {pickupTimes.map((time) => (
                      <option key={time.value} value={time.value}>
                        {time.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.pickupTime && (
                  <p className="text-red-600 text-sm mt-1">{errors.pickupTime}</p>
                )}
              </div>
            )}

            {formData.orderType === 'dine_in' && (
              <div>
                <label htmlFor="tableNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Table Number *
                </label>
                <Input
                  id="tableNumber"
                  type="text"
                  placeholder="Enter your table number"
                  value={formData.tableNumber}
                  onChange={(e) => handleInputChange('tableNumber', e.target.value)}
                  error={errors.tableNumber}
                  required
                />
              </div>
            )}
          </div>
        </Card>

        {/* Payment Method */}
        <Card variant="default" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-amber-600" />
            Payment Method
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                value="card"
                checked={formData.paymentMethod === 'card'}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className="text-amber-600 focus:ring-amber-500"
              />
              <div className="text-center">
                <div className="text-2xl mb-1">💳</div>
                <div className="text-sm font-medium">Card</div>
              </div>
            </label>
            
            <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                value="cash"
                checked={formData.paymentMethod === 'cash'}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className="text-amber-600 focus:ring-amber-500"
              />
              <div className="text-center">
                <div className="text-2xl mb-1">💵</div>
                <div className="text-sm font-medium">Cash</div>
              </div>
            </label>
            
            <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                value="mobile"
                checked={formData.paymentMethod === 'mobile'}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className="text-amber-600 focus:ring-amber-500"
              />
              <div className="text-center">
                <div className="text-2xl mb-1">📱</div>
                <div className="text-sm font-medium">Mobile</div>
              </div>
            </label>
          </div>
        </Card>

        {/* Special Requests */}
        <Card variant="default" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Special Requests (Optional)
          </h3>
          
          <textarea
            value={formData.specialRequests}
            onChange={(e) => handleInputChange('specialRequests', e.target.value)}
            placeholder="Any special dietary requirements, allergies, or other requests..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            rows={4}
            maxLength={500}
          />
          <div className="text-xs text-gray-500 mt-2">
            {formData.specialRequests?.length || 0}/500 characters
          </div>
          {errors.specialRequests && (
            <p className="text-red-600 text-sm mt-1">{errors.specialRequests}</p>
          )}
        </Card>

        {/* Form Actions */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            className="px-8"
          >
            Previous
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className="px-8"
          >
            Review Order
          </Button>
        </div>
      </form>
    </motion.div>
  )
}