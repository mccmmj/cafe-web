'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { X, Trash2, AlertTriangle, Coffee } from 'lucide-react'
import { isStarbucksCategory } from '@/lib/constants/menu'
import toast from 'react-hot-toast'

interface Category {
  id: string
  name: string
  ordinal: number
  parentCategory?: string
  itemCount: number
}

interface CategoryDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onDeleteCategory: (categoryId: string) => Promise<void>
  category: Category | null
}

const CategoryDeleteModal = ({
  isOpen,
  onClose,
  onDeleteCategory,
  category
}: CategoryDeleteModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !category) return null

  const isWpsProtected = isStarbucksCategory(category.name)
  const hasItems = category.itemCount > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isWpsProtected) {
      toast.error('WPS protected categories cannot be deleted')
      return
    }

    if (hasItems) {
      toast.error('Cannot delete category with items. Move items to another category first.')
      return
    }

    setIsSubmitting(true)
    
    try {
      await onDeleteCategory(category.id)
      toast.success('Category deleted successfully')
      onClose()
    } catch (error) {
      console.error('Failed to delete category:', error)
      toast.error('Failed to delete category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mt-8 mb-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Delete Category</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Category Display */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Coffee className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900">{category.name}</h4>
                {isWpsProtected && (
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                    WPS Protected
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {category.itemCount} item{category.itemCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Warning Messages */}
          {isWpsProtected ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-800">Cannot Delete WPS Protected Category</h4>
                  <p className="text-sm text-red-700 mt-1">
                    This Starbucks category is protected and cannot be deleted to maintain We Proudly Serve compliance.
                  </p>
                </div>
              </div>
            </div>
          ) : hasItems ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-amber-800">Category Contains Items</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    This category contains {category.itemCount} menu item{category.itemCount !== 1 ? 's' : ''}. 
                    You must move or delete all items before deleting the category.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-800">Confirm Deletion</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Are you sure you want to delete this category? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          )}

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
              onClick={handleSubmit}
              disabled={isSubmitting || isWpsProtected || hasItems}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Deleting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete Category
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CategoryDeleteModal