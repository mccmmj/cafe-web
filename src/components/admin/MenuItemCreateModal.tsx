'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { X, Plus, Trash2, DollarSign } from 'lucide-react'

interface Category {
  id: string
  name: string
}

interface NewItemVariation {
  id: string
  name: string
  price: number
}

interface NewItemData {
  name: string
  description: string
  categoryId: string
  isAvailable: boolean
  variations: NewItemVariation[]
}

interface MenuItemCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (itemData: NewItemData) => Promise<void>
  categories: Category[]
  isLoading: boolean
}

const MenuItemCreateModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  categories, 
  isLoading 
}: MenuItemCreateModalProps) => {
  const [formData, setFormData] = useState<NewItemData>({
    name: '',
    description: '',
    categoryId: '',
    isAvailable: true,
    variations: [
      { id: 'default', name: 'Regular', price: 0 }
    ]
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.categoryId || formData.variations.length === 0) {
      return
    }
    await onSubmit(formData)
  }

  const addVariation = () => {
    const newVariation: NewItemVariation = {
      id: `var-${Date.now()}`,
      name: '',
      price: 0
    }
    setFormData(prev => ({
      ...prev,
      variations: [...prev.variations, newVariation]
    }))
  }

  const removeVariation = (variationId: string) => {
    if (formData.variations.length <= 1) return
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.filter(v => v.id !== variationId)
    }))
  }

  const updateVariation = (variationId: string, field: 'name' | 'price', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.map(v => 
        v.id === variationId 
          ? { ...v, [field]: value }
          : v
      )
    }))
  }

  const isFormValid = formData.name.trim() && formData.categoryId && 
    formData.variations.every(v => v.name.trim() && v.price >= 0)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4 flex flex-col min-h-fit">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create New Menu Item</h2>
            <p className="text-sm text-gray-600 mt-1">
              Add a new item to your menu catalog
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
            
            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="text-base font-medium text-gray-900">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter item name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe this menu item..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Availability */}
            <div className="space-y-3">
              <h3 className="text-base font-medium text-gray-900">Availability</h3>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="available"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData(prev => ({ ...prev, isAvailable: e.target.checked }))}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="available" className="text-sm font-medium text-gray-700">
                  Available for ordering
                </label>
              </div>
            </div>

            {/* Size Variations & Pricing */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium text-gray-900">Size Variations & Pricing</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariation}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Size
                </Button>
              </div>
              
              <div className="space-y-3">
                {formData.variations.map((variation, index) => (
                  <div key={variation.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Size Name *
                      </label>
                      <input
                        type="text"
                        value={variation.name}
                        onChange={(e) => updateVariation(variation.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g., Small, Medium, Large"
                        required
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Price ($) *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={variation.price.toFixed(2)}
                          onChange={(e) => updateVariation(variation.id, 'price', parseFloat(e.target.value) || 0)}
                          className="pl-10 text-sm w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                    {formData.variations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariation(variation.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {isFormValid ? 'Ready to create item' : 'Please fill all required fields'}
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
                disabled={!isFormValid || isLoading}
                className="min-w-[100px] bg-primary-600 hover:bg-primary-700"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </div>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Item
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

export default MenuItemCreateModal