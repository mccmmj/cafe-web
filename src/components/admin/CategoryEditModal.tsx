'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { X, Save, AlertTriangle } from 'lucide-react'
import { isStarbucksCategory } from '@/lib/constants/menu'
import toast from 'react-hot-toast'

interface Category {
  id: string
  name: string
  ordinal: number
  parentCategory?: string
  itemCount: number
}

interface CategoryEditModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdateCategory: (categoryId: string, updateData: { name: string; ordinal: number }) => Promise<void>
  category: Category | null
  existingCategories: Array<{ id: string; name: string; ordinal: number }>
}

const CategoryEditModal = ({
  isOpen,
  onClose,
  onUpdateCategory,
  category,
  existingCategories
}: CategoryEditModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    ordinal: 999
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        ordinal: category.ordinal
      })
    }
  }, [category])

  if (!isOpen || !category) return null

  const isWpsProtected = isStarbucksCategory(category.name)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    // Check for duplicate names (excluding current category)
    const nameExists = existingCategories.some(
      cat => cat.id !== category.id && cat.name.toLowerCase() === formData.name.trim().toLowerCase()
    )
    
    if (nameExists) {
      toast.error('A category with this name already exists')
      return
    }

    setIsSubmitting(true)
    
    try {
      await onUpdateCategory(category.id, {
        name: formData.name.trim(),
        ordinal: formData.ordinal
      })
      
      toast.success('Category updated successfully')
      onClose()
    } catch (error) {
      console.error('Failed to update category:', error)
      toast.error('Failed to update category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: category?.name || '',
        ordinal: category?.ordinal || 999
      })
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mt-8 mb-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Category</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* WPS Protection Warning for Protected Categories */}
        {isWpsProtected && (
          <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800">WPS Protected Category</h4>
                <p className="text-sm text-red-700 mt-1">
                  This Starbucks category cannot be modified to maintain We Proudly Serve compliance.
                </p>
              </div>
            </div>
          </div>
        )}

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
              placeholder="Category name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isSubmitting || isWpsProtected}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isSubmitting || isWpsProtected}
            />
            <p className="text-xs text-gray-500 mt-1">
              Lower numbers appear first in the menu.
            </p>
          </div>

          {/* Category Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Category Information</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Items:</span> {category.itemCount} item{category.itemCount !== 1 ? 's' : ''}</p>
              <p><span className="font-medium">ID:</span> {category.id}</p>
              {category.parentCategory && (
                <p><span className="font-medium">Parent:</span> {category.parentCategory}</p>
              )}
            </div>
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
              disabled={isSubmitting || !formData.name.trim() || isWpsProtected}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Update Category
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CategoryEditModal
