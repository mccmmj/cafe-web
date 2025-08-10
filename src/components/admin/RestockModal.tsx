'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Package, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

interface InventoryItem {
  id: string
  item_name: string
  current_stock: number
  unit_type: string
  unit_cost: number
}

interface RestockModalProps {
  item: InventoryItem | null
  isOpen: boolean
  onClose: () => void
}

export default function RestockModal({ item, isOpen, onClose }: RestockModalProps) {
  const [quantity, setQuantity] = useState<number>(0)
  const [unitCost, setUnitCost] = useState<number>(0)
  const [notes, setNotes] = useState<string>('')
  const [referenceId, setReferenceId] = useState<string>('')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (item && isOpen) {
      setQuantity(0)
      setUnitCost(item.unit_cost)
      setNotes('')
      setReferenceId('')
    }
  }, [item, isOpen])

  const restockMutation = useMutation({
    mutationFn: async (data: {
      inventory_item_id: string
      quantity: number
      unit_cost: number
      notes: string
      reference_id: string
    }) => {
      const response = await fetch(`/api/admin/inventory/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to restock item')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Item restocked successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-alerts'] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restock item')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!item) return
    
    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0')
      return
    }
    
    if (unitCost < 0) {
      toast.error('Unit cost cannot be negative')
      return
    }

    restockMutation.mutate({
      inventory_item_id: item.id,
      quantity,
      unit_cost: unitCost,
      notes: notes.trim(),
      reference_id: referenceId.trim()
    })
  }

  if (!isOpen || !item) return null

  const totalCost = quantity * unitCost
  const newStockLevel = item.current_stock + quantity

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Package className="w-5 h-5 mr-2 text-primary-600" />
              Restock Item
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
          {/* Item Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">{item.item_name}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Current Stock:</span> {item.current_stock} {item.unit_type}
              </div>
              <div>
                <span className="font-medium">Current Unit Cost:</span> ${item.unit_cost.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Quantity to Add */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity to Add <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                value={quantity || ''}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0"
                required
              />
              <span className="absolute right-3 top-2 text-sm text-gray-500">
                {item.unit_type}
              </span>
            </div>
          </div>

          {/* Unit Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit Cost ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitCost || ''}
              onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          {/* Reference ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference ID
            </label>
            <input
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="PO-123, INV-456, etc."
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional reference number (Purchase Order, Invoice, etc.)
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Additional notes about this restock..."
            />
          </div>

          {/* Summary */}
          {quantity > 0 && (
            <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
              <h4 className="font-medium text-primary-900 mb-2">Restock Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-primary-700">
                  <span className="font-medium">Total Cost:</span> ${totalCost.toFixed(2)}
                </div>
                <div className="text-primary-700">
                  <span className="font-medium">New Stock Level:</span> {newStockLevel} {item.unit_type}
                </div>
              </div>
            </div>
          )}

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
              disabled={restockMutation.isPending || quantity <= 0}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              {restockMutation.isPending ? 'Adding Stock...' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}