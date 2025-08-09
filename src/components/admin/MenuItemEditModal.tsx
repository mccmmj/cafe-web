'use client'

import { useState, useEffect } from 'react'
import { X, Save, DollarSign, Coffee, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { formatPrice } from '@/lib/utils'
import { isStarbucksCategory } from '@/lib/constants/menu'

interface MenuItem {
  id: string
  name: string
  description: string
  categoryId?: string
  categoryName: string
  isAvailable: boolean
  variations: Array<{
    id: string
    name: string
    price: number
    currency: string
    isDefault: boolean
  }>
  imageUrl?: string
  ordinal: number
  lastUpdated: string
  version: number
}

interface UpdateItemData {
  name?: string
  description?: string
  isAvailable?: boolean
  variations?: Array<{
    id: string
    name: string
    price: number
  }>
}

interface MenuItemEditModalProps {
  item: MenuItem
  onClose: () => void
  onSave: (updateData: UpdateItemData) => void
  isLoading: boolean
}

const MenuItemEditModal = ({ item, onClose, onSave, isLoading }: MenuItemEditModalProps) => {
  const [formData, setFormData] = useState({
    name: item.name,
    description: item.description,
    isAvailable: item.isAvailable,
    variations: item.variations.map(v => ({
      id: v.id,
      name: v.name,
      price: v.price / 100 // Convert cents to dollars
    }))
  })

  const [hasChanges, setHasChanges] = useState(false)
  const isStarbucks = isStarbucksCategory(item.categoryName)

  useEffect(() => {
    // Check if form data has changed from original item data
    const nameChanged = formData.name !== item.name
    const descriptionChanged = formData.description !== item.description
    const availabilityChanged = formData.isAvailable !== item.isAvailable
    
    // Check if any variation prices or names have changed
    const variationsChanged = formData.variations.some(formVariation => {
      const originalVariation = item.variations.find(v => v.id === formVariation.id)
      if (!originalVariation) return true
      
      const originalPrice = originalVariation.price / 100 // Convert cents to dollars
      const priceChanged = Math.abs(formVariation.price - originalPrice) > 0.001
      const nameChanged = formVariation.name !== originalVariation.name
      
      return priceChanged || nameChanged
    })

    const hasDataChanged = nameChanged || descriptionChanged || availabilityChanged || variationsChanged
    
    console.log('Change detection:', {
      nameChanged,
      descriptionChanged, 
      availabilityChanged,
      variationsChanged,
      hasDataChanged,
      formData: {
        name: formData.name,
        description: formData.description,
        isAvailable: formData.isAvailable,
        variations: formData.variations.map(v => ({ id: v.id, name: v.name, price: v.price }))
      },
      original: {
        name: item.name,
        description: item.description,
        isAvailable: item.isAvailable,
        variations: item.variations.map(v => ({ id: v.id, name: v.name, price: v.price / 100 }))
      }
    })

    setHasChanges(hasDataChanged)
  }, [formData, item])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const updateData: UpdateItemData = {}
    
    // Only include changed fields
    if (formData.name !== item.name && !isStarbucks) {
      updateData.name = formData.name
    }
    if (formData.description !== item.description && !isStarbucks) {
      updateData.description = formData.description
    }
    if (formData.isAvailable !== item.isAvailable) {
      updateData.isAvailable = formData.isAvailable
    }
    
    // Convert variations back to cents
    const variationsChanged = JSON.stringify(formData.variations) !== 
      JSON.stringify(item.variations.map(v => ({ id: v.id, name: v.name, price: v.price / 100 })))
    
    if (variationsChanged) {
      updateData.variations = formData.variations.map(v => ({
        id: v.id,
        name: v.name,
        price: Math.round(v.price * 100) // Convert to cents
      }))
    }
    
    onSave(updateData)
  }

  const updateVariationPrice = (variationId: string, newPrice: number) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.map(v => 
        v.id === variationId ? { ...v, price: newPrice } : v
      )
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4 flex flex-col min-h-fit">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit Menu Item</h2>
            <p className="text-sm text-gray-600 mt-1">
              Update item details, pricing, and availability
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-4 space-y-4">
            
            {/* WPS Compliance Warning */}
            {isStarbucks && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-800">WPS Starbucks Item</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Item name and description are protected by WPS guidelines and cannot be modified. 
                      You can update pricing and availability only.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="text-base font-medium text-gray-900">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter item name"
                  disabled={isStarbucks}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    isStarbucks ? 'bg-gray-50' : ''
                  }`}
                />
                {isStarbucks && (
                  <p className="text-xs text-gray-500 mt-1">Protected by WPS guidelines</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter item description"
                  rows={3}
                  disabled={isStarbucks}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none ${
                    isStarbucks ? 'bg-gray-50' : ''
                  }`}
                />
                {isStarbucks && (
                  <p className="text-xs text-gray-500 mt-1">Protected by WPS guidelines</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-900">{item.categoryName}</span>
                  {isStarbucks && (
                    <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                      Starbucks
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Availability */}
            <div className="space-y-3">
              <h3 className="text-base font-medium text-gray-900">Availability</h3>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="availability"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData(prev => ({ ...prev, isAvailable: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="availability" className="text-sm font-medium text-gray-700">
                  Available for ordering
                </label>
              </div>
            </div>

            {/* Variations & Pricing */}
            <div className="space-y-3">
              <h3 className="text-base font-medium text-gray-900">Size Variations & Pricing</h3>
              
              <div className="space-y-3">
                {formData.variations.map((variation, index) => (
                  <div key={variation.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Size Name
                      </label>
                      <input
                        type="text"
                        value={variation.name}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          variations: prev.variations.map(v => 
                            v.id === variation.id ? { ...v, name: e.target.value } : v
                          )
                        }))}
                        placeholder="Size name"
                        disabled={isStarbucks}
                        className={`text-sm w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          isStarbucks ? 'bg-gray-50' : ''
                        }`}
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Price ($)
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={variation.price.toFixed(2)}
                          onChange={(e) => updateVariationPrice(variation.id, parseFloat(e.target.value) || 0)}
                          className="pl-10 text-sm w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {hasChanges ? 'You have unsaved changes' : 'No changes made'}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!hasChanges || isLoading}
                className="min-w-[100px]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </div>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MenuItemEditModal