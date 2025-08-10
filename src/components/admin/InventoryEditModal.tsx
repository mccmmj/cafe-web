'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface InventoryItem {
  id: string
  square_item_id: string
  item_name: string
  current_stock: number
  minimum_threshold: number
  reorder_point: number
  unit_cost: number
  unit_type: string
  is_ingredient: boolean
  supplier_id?: string
  location: string
  notes?: string
}

interface Supplier {
  id: string
  name: string
}

interface InventoryEditModalProps {
  item: InventoryItem | null
  suppliers: Supplier[]
  isOpen: boolean
  onClose: () => void
}

const UNIT_TYPES = [
  { value: 'each', label: 'Each' },
  { value: 'lb', label: 'Pounds (lb)' },
  { value: 'oz', label: 'Ounces (oz)' },
  { value: 'gallon', label: 'Gallons' },
  { value: 'liter', label: 'Liters' },
  { value: 'ml', label: 'Milliliters (ml)' },
]

export default function InventoryEditModal({ item, suppliers, isOpen, onClose }: InventoryEditModalProps) {
  const [formData, setFormData] = useState<Partial<InventoryItem>>({})
  const queryClient = useQueryClient()

  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        item_name: item.item_name,
        minimum_threshold: item.minimum_threshold,
        reorder_point: item.reorder_point,
        unit_cost: item.unit_cost,
        unit_type: item.unit_type,
        supplier_id: item.supplier_id || '',
        location: item.location,
        notes: item.notes || '',
        is_ingredient: item.is_ingredient
      })
    }
  }, [item, isOpen])

  const updateItemMutation = useMutation({
    mutationFn: async (data: Partial<InventoryItem>) => {
      const response = await fetch(`/api/admin/inventory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item?.id,
          ...data
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update item')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Item updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update item')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.item_name?.trim()) {
      toast.error('Item name is required')
      return
    }
    
    if (formData.minimum_threshold !== undefined && formData.minimum_threshold < 0) {
      toast.error('Minimum threshold cannot be negative')
      return
    }
    
    if (formData.reorder_point !== undefined && formData.minimum_threshold !== undefined && 
        formData.reorder_point < formData.minimum_threshold) {
      toast.error('Reorder point must be greater than or equal to minimum threshold')
      return
    }

    if (formData.unit_cost !== undefined && formData.unit_cost < 0) {
      toast.error('Unit cost cannot be negative')
      return
    }

    updateItemMutation.mutate(formData)
  }

  if (!isOpen || !item) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Inventory Item
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
          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.item_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter item name"
              required
            />
          </div>

          {/* Stock Thresholds */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Threshold
              </label>
              <input
                type="number"
                min="0"
                value={formData.minimum_threshold || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, minimum_threshold: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reorder Point
              </label>
              <input
                type="number"
                min="0"
                value={formData.reorder_point || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, reorder_point: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          {/* Unit Cost and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Cost ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_cost || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Type
              </label>
              <select
                value={formData.unit_type || 'each'}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {UNIT_TYPES.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier
            </label>
            <select
              value={formData.supplier_id || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select supplier...</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Storage Location
            </label>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Storage Room, Refrigerator, Display Case"
            />
          </div>

          {/* Is Ingredient */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_ingredient"
              checked={formData.is_ingredient || false}
              onChange={(e) => setFormData(prev => ({ ...prev, is_ingredient: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="is_ingredient" className="ml-2 block text-sm text-gray-700">
              This is an ingredient (used in recipes)
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Additional notes about this item..."
            />
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
              disabled={updateItemMutation.isPending}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateItemMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}