'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

interface Supplier {
  id: string
  name: string
}

interface SquareSearchResult {
  itemId: string
  itemName: string
  variationId: string
  variationName: string
  sku?: string
  price?: number
  currency?: string
}

interface InventoryCreateModalProps {
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

const ITEM_TYPES: Array<{ value: 'ingredient' | 'prepackaged' | 'prepared' | 'supply'; label: string }> = [
  { value: 'ingredient', label: 'Ingredient' },
  { value: 'prepackaged', label: 'Pre-packaged' },
  { value: 'prepared', label: 'Prepared' },
  { value: 'supply', label: 'Supply' }
]

export default function InventoryCreateModal({ suppliers, isOpen, onClose }: InventoryCreateModalProps) {
  const queryClient = useQueryClient()
  const [squareResults, setSquareResults] = useState<SquareSearchResult[]>([])
  const [squareSearchLoading, setSquareSearchLoading] = useState(false)
  const [squareSearchError, setSquareSearchError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    square_item_id: '',
    item_name: '',
    current_stock: 0,
    minimum_threshold: 5,
    reorder_point: 10,
    unit_cost: 0,
    unit_type: 'each',
    is_ingredient: false,
    item_type: 'ingredient' as 'ingredient' | 'prepackaged' | 'prepared' | 'supply',
    supplier_id: '',
    location: 'main',
    notes: ''
  })

  const resetForm = () => {
    setFormData({
      square_item_id: '',
      item_name: '',
      current_stock: 0,
      minimum_threshold: 5,
      reorder_point: 10,
      unit_cost: 0,
      unit_type: 'each',
      is_ingredient: false,
      item_type: 'ingredient',
      supplier_id: '',
      location: 'main',
      notes: ''
    })
    setSquareResults([])
    setSquareSearchError(null)
  }

  const handleSquareLookup = async () => {
    const keyword = formData.item_name.trim() || formData.square_item_id.trim()
    if (keyword.length < 2) {
      toast.error('Enter at least 2 characters in the Item Name or Square ID field first')
      return
    }

    setSquareSearchLoading(true)
    setSquareSearchError(null)
    try {
      const response = await fetch(
        `/api/admin/inventory/square-search?q=${encodeURIComponent(keyword)}`
      )
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to search Square catalog')
      }
      setSquareResults(data.results || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Square catalog search failed'
      setSquareSearchError(message)
      setSquareResults([])
    } finally {
      setSquareSearchLoading(false)
    }
  }

  const handleSelectSquareResult = (result: SquareSearchResult) => {
    setFormData((prev) => ({
      ...prev,
      square_item_id: result.variationId,
      item_name: prev.item_name || result.itemName,
      unit_cost:
        prev.unit_cost && prev.unit_cost > 0
          ? prev.unit_cost
          : result.price ?? prev.unit_cost
    }))
    setSquareResults([])
    toast.success('Linked Square catalog item')
  }

  const createItemMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          supplier_id: formData.supplier_id || null,
          notes: formData.notes || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create inventory item')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Inventory item created')
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })
      resetForm()
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create inventory item')
    }
  })

  const requiresSquareId = formData.item_type !== 'ingredient'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.item_name.trim()) {
      toast.error('Item Name is required')
      return
    }

    if (requiresSquareId && !formData.square_item_id.trim()) {
      toast.error('Square Item ID is required for non-ingredient items')
      return
    }

    if (formData.current_stock < 0) {
      toast.error('Current stock cannot be negative')
      return
    }

    createItemMutation.mutate()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">Inventory</p>
            <h2 className="text-xl font-semibold text-gray-900">Add Inventory Item</h2>
          </div>
          <button
            onClick={() => {
              resetForm()
              onClose()
            }}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] space-y-5 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Square Item ID {requiresSquareId && <span className="text-red-500">*</span>}
                </label>
                <button
                  type="button"
                  onClick={handleSquareLookup}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  disabled={squareSearchLoading}
                >
                  {squareSearchLoading ? 'Searching…' : 'Lookup from Square'}
                </button>
              </div>
              <input
                type="text"
                value={formData.square_item_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, square_item_id: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder={requiresSquareId ? 'sq0idp-...' : 'Optional for ingredients'}
              />
              <p className="mt-1 text-xs text-gray-500">
                Use the Lookup button to search your Square catalog by item name.
              </p>
              {squareSearchError && (
                <p className="mt-1 text-sm text-red-600">{squareSearchError}</p>
              )}
              {squareResults.length > 0 && (
                <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/70 text-sm text-gray-900">
                  {squareResults.map((result) => (
                    <button
                      key={result.variationId}
                      type="button"
                      onClick={() => handleSelectSquareResult(result)}
                      className="flex w-full items-center justify-between border-b border-indigo-100 px-4 py-2 text-left last:border-b-0 hover:bg-indigo-100"
                    >
                      <div>
                        <p className="font-medium">{result.itemName}</p>
                        <p className="text-xs text-gray-600">
                          Variation: {result.variationName}
                          {result.sku ? ` • SKU ${result.sku}` : ''}
                        </p>
                      </div>
                      {typeof result.price === 'number' && (
                        <span className="text-xs font-semibold text-gray-800">
                          ${result.price.toFixed(2)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.item_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, item_name: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Orange Juice - Regular"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
              <input
                type="number"
                min="0"
                value={formData.current_stock}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, current_stock: parseInt(e.target.value, 10) || 0 }))
                }
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Threshold</label>
              <input
                type="number"
                min="0"
                value={formData.minimum_threshold}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, minimum_threshold: parseInt(e.target.value, 10) || 0 }))
                }
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
              <input
                type="number"
                min="0"
                value={formData.reorder_point}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, reorder_point: parseInt(e.target.value, 10) || 0 }))
                }
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))
                }
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Type</label>
              <select
                value={formData.unit_type}
                onChange={(e) => setFormData((prev) => ({ ...prev, unit_type: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {UNIT_TYPES.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, supplier_id: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
              <select
                value={formData.item_type}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, item_type: e.target.value as typeof prev.item_type }))
                }
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {ITEM_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
              <input
                id="is-ingredient"
                type="checkbox"
                checked={formData.is_ingredient}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_ingredient: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="is-ingredient" className="text-sm text-gray-700">
                This item is an ingredient
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={3}
              placeholder="Optional details, packaging info, etc."
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={() => {
                resetForm()
                onClose()
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
              disabled={createItemMutation.isPending}
            >
              {createItemMutation.isPending ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Item
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
