'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Save, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Supplier {
  id?: string
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  payment_terms?: string
  notes?: string
  is_active?: boolean
}

interface SupplierModalProps {
  supplier?: Supplier | null
  isOpen: boolean
  onClose: () => void
}

const PAYMENT_TERMS_OPTIONS = [
  { value: '', label: 'Select payment terms...' },
  { value: 'Net 15', label: 'Net 15 days' },
  { value: 'Net 30', label: 'Net 30 days' },
  { value: 'Net 45', label: 'Net 45 days' },
  { value: 'Net 60', label: 'Net 60 days' },
  { value: 'COD', label: 'Cash on Delivery (COD)' },
  { value: '2/10 Net 30', label: '2/10 Net 30 (2% discount if paid within 10 days)' },
  { value: 'Prepaid', label: 'Payment in advance' },
  { value: 'Custom', label: 'Custom terms' },
]

export default function SupplierModal({ supplier, isOpen, onClose }: SupplierModalProps) {
  const [formData, setFormData] = useState<Supplier>({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    payment_terms: '',
    notes: '',
    is_active: true
  })
  const [customPaymentTerms, setCustomPaymentTerms] = useState('')
  
  const queryClient = useQueryClient()
  const isEditing = !!supplier?.id

  useEffect(() => {
    if (supplier && isOpen) {
      setFormData({
        name: supplier.name || '',
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        payment_terms: supplier.payment_terms || '',
        notes: supplier.notes || '',
        is_active: supplier.is_active ?? true
      })
      // Check if it's a custom payment term
      const isCustomTerm = supplier.payment_terms && 
        !PAYMENT_TERMS_OPTIONS.some(option => option.value === supplier.payment_terms)
      if (isCustomTerm) {
        setCustomPaymentTerms(supplier.payment_terms || '')
        setFormData(prev => ({ ...prev, payment_terms: 'Custom' }))
      }
    } else if (isOpen) {
      // Reset form for new supplier
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        payment_terms: '',
        notes: '',
        is_active: true
      })
      setCustomPaymentTerms('')
    }
  }, [supplier, isOpen])

  const supplierMutation = useMutation({
    mutationFn: async (data: Supplier) => {
      const payload = {
        ...data,
        payment_terms: data.payment_terms === 'Custom' ? customPaymentTerms : data.payment_terms
      }
      
      const url = isEditing 
        ? `/api/admin/suppliers/${supplier!.id}` 
        : '/api/admin/suppliers'
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `Failed to ${isEditing ? 'update' : 'create'} supplier`)
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success(`Supplier ${isEditing ? 'updated' : 'created'} successfully`)
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers-all'] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || `Failed to ${isEditing ? 'update' : 'create'} supplier`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Supplier name is required')
      return
    }

    // Email validation if provided
    if (formData.email && !isValidEmail(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    // Custom payment terms validation
    if (formData.payment_terms === 'Custom' && !customPaymentTerms.trim()) {
      toast.error('Please enter custom payment terms')
      return
    }

    supplierMutation.mutate(formData)
  }

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-primary-600" />
              {isEditing ? 'Edit Supplier' : 'Add New Supplier'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Supplier Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter supplier company name"
                    required
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Primary contact name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="supplier@company.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>

                {/* Payment Terms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Terms
                  </label>
                  <select
                    value={formData.payment_terms}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {PAYMENT_TERMS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Payment Terms Input */}
                {formData.payment_terms === 'Custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Payment Terms <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customPaymentTerms}
                      onChange={(e) => setCustomPaymentTerms(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter custom payment terms"
                      required
                    />
                  </div>
                )}

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    rows={3}
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Full address including city, state, and zip code"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
              
              {/* Status Toggle */}
              <div className="flex items-center mb-6">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                  Active supplier (can be used for new orders)
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Additional notes about this supplier (certifications, specialties, etc.)"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={supplierMutation.isPending}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {supplierMutation.isPending 
                ? (isEditing ? 'Updating...' : 'Creating...') 
                : (isEditing ? 'Update Supplier' : 'Create Supplier')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}