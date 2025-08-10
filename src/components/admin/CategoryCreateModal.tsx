'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { X, Plus, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

interface CategoryCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateCategory: (categoryData: any) => Promise<void>
  existingCategories: Array<{ id: string; name: string; ordinal: number }>
}

const CategoryCreateModal = ({
  isOpen,
  onClose,
  onCreateCategory,
  existingCategories
}: CategoryCreateModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    ordinal: 999
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    // Check for duplicate names
    const nameExists = existingCategories.some(
      cat => cat.name.toLowerCase() === formData.name.trim().toLowerCase()
    )
    
    if (nameExists) {
      toast.error('A category with this name already exists')
      return
    }

    setIsSubmitting(true)
    
    try {
      await onCreateCategory({
        name: formData.name.trim(),
        ordinal: formData.ordinal
      })
      
      toast.success('Category created successfully')
      setFormData({ name: '', ordinal: 999 })
      onClose()
    } catch (error) {
      console.error('Failed to create category:', error)
      toast.error('Failed to create category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ name: '', ordinal: 999 })
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mt-8 mb-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Category</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* WPS Protection Notice */}
        <div className="mx-6 mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-amber-800">WPS Compliance Notice</h4>
              <p className="text-sm text-amber-700 mt-1">
                Starbucks categories are protected and pre-configured. Only create custom categories for house items.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-2">
              Category Name *
            </label>
            <input
              type="text"
              id="categoryName"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Seasonal Drinks, Local Favorites..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isSubmitting}
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.name.length}/50 characters
            </p>
          </div>

          <div>
            <label htmlFor="ordinal" className="block text-sm font-medium text-gray-700 mb-2">
              Display Order
            </label>
            <input
              type="number"
              id="ordinal"
              value={formData.ordinal}
              onChange={(e) => setFormData(prev => ({ ...prev, ordinal: parseInt(e.target.value) || 999 }))}
              min="0"
              max="9999"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Lower numbers appear first. Starbucks categories use 10-80, house categories start at 100+.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Category
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CategoryCreateModal