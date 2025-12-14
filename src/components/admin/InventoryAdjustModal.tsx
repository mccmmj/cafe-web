'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Scale, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

interface InventoryItem {
  id: string
  item_name: string
  current_stock: number
  unit_type: string
  is_packaged_variant?: boolean
}

interface InventoryAdjustModalProps {
  item: InventoryItem | null
  isOpen: boolean
  onClose: () => void
}

const ADJUSTMENT_REASONS = [
  { value: 'Count correction', label: 'Inventory count correction' },
  { value: 'Waste / spoilage', label: 'Waste or spoilage' },
  { value: 'Breakage / damage', label: 'Breakage or damage' },
  { value: 'Shrinkage / theft', label: 'Shrinkage or theft' },
  { value: 'Other manual adjustment', label: 'Other reason' }
]

export default function InventoryAdjustModal({ item, isOpen, onClose }: InventoryAdjustModalProps) {
  const [targetStock, setTargetStock] = useState<number | null>(null)
  const [reason, setReason] = useState<string>(ADJUSTMENT_REASONS[0].value)
  const [notes, setNotes] = useState<string>('')
  const [referenceId, setReferenceId] = useState<string>('')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (item && isOpen) {
      setTargetStock(item.current_stock)
      setReason(ADJUSTMENT_REASONS[0].value)
      setNotes('')
      setReferenceId('')
    }
  }, [item, isOpen])

  const adjustmentMutation = useMutation({
    mutationFn: async () => {
      if (!item || targetStock === null) {
        throw new Error('Missing inventory item or target stock')
      }

      const response = await fetch('/api/admin/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_item_id: item.id,
          new_stock: Math.round(targetStock),
          reason,
          notes,
          reference_id: referenceId
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to adjust stock')
      }
      return result
    },
    onSuccess: (result) => {
      toast.success(result?.message || 'Stock adjusted')
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stock-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['admin-sales-sync-status'] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to adjust stock')
    }
  })

  const parsedChange = useMemo(() => {
    if (!item || targetStock === null || Number.isNaN(targetStock)) return null
    return Math.round(targetStock) - item.current_stock
  }, [item, targetStock])

  const isPackagedVariant = Boolean(item?.is_packaged_variant)

  const changeDescriptor = (() => {
    if (parsedChange === null) return ''
    if (parsedChange === 0) return 'No change'
    return parsedChange > 0 ? `Increase of +${parsedChange}` : `Decrease of ${parsedChange}`
  })()

  const changeColor =
    parsedChange === null || parsedChange === 0
      ? 'text-gray-600'
      : parsedChange > 0
        ? 'text-green-600'
        : 'text-red-600'

  const isSubmitDisabled =
    !item ||
    isPackagedVariant ||
    targetStock === null ||
    Number.isNaN(targetStock) ||
    targetStock < 0 ||
    parsedChange === null ||
    parsedChange === 0 ||
    adjustmentMutation.isPending

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!item) return

    if (targetStock === null || Number.isNaN(targetStock)) {
      toast.error('Enter a valid stock level')
      return
    }

    if (targetStock < 0) {
      toast.error('Stock cannot be negative')
      return
    }

    const rounded = Math.round(targetStock)
    if (rounded === item.current_stock) {
      toast.error('New stock matches current stock')
      return
    }

    adjustmentMutation.mutate()
  }

  if (!isOpen || !item) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Adjust Inventory Stock</h2>
            <p className="text-sm text-gray-500">Set a corrected quantity for {item.item_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {isPackagedVariant && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Pack variant stock is locked</p>
                  <p className="mt-1 text-sm text-amber-800">
                    This item is a pack variant. Stock is tracked on the base (single-unit) item with the same Square ID.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Stock</p>
                <p className="text-lg font-semibold text-gray-900">
                  {item.current_stock} {item.unit_type}
                </p>
              </div>
              <Scale className="w-8 h-8 text-primary-600" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Stock Level <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={targetStock ?? ''}
                onChange={(e) => {
                  const parsed = Number(e.target.value)
                  if (e.target.value === '' || Number.isNaN(parsed)) {
                    setTargetStock(null)
                  } else {
                    setTargetStock(parsed)
                  }
                }}
                disabled={isPackagedVariant}
                className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter new quantity"
              />
              <span className="absolute right-3 top-2 text-sm text-gray-500">{item.unit_type}</span>
            </div>
            <p className={`mt-2 text-sm font-medium ${changeColor}`}>{changeDescriptor}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Adjustment
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isPackagedVariant}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {ADJUSTMENT_REASONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference ID
            </label>
            <input
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              disabled={isPackagedVariant}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Optional reference or ticket number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPackagedVariant}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Add helpful context for future audits..."
            />
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Adjustments are logged to the audit trail automatically.
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-60"
            >
              {adjustmentMutation.isPending ? 'Saving...' : 'Save Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
