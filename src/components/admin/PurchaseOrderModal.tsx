'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui'
import { X, Plus, Trash2, Package, Building2, Calendar, Search, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

interface PurchaseOrderItem {
  id?: string
  inventory_item_id: string
  inventory_item_name?: string
  quantity_ordered: number
  unit_cost: number
  total_cost: number
  unit_type?: string
}

interface PurchaseOrder {
  id?: string
  supplier_id: string
  supplier_name?: string
  order_number: string
  status?: string
  order_date?: string
  expected_delivery_date?: string
  total_amount?: number
  notes?: string
  items?: PurchaseOrderItem[]
}

interface PurchaseOrderModalProps {
  order?: PurchaseOrder | null
  isOpen: boolean
  onClose: () => void
}

interface SearchableDropdownProps {
  items: any[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}

const SearchableDropdown = ({ items, value, onChange, placeholder, className }: SearchableDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter items based on search term
  const filteredItems = items.filter(item =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get selected item display name
  const selectedItem = items.find(item => item.id === value)
  const displayValue = selectedItem ? `${selectedItem.item_name} (${selectedItem.unit_type})` : ''

  const handleSelect = (item: any) => {
    onChange(item.id)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
          !value ? 'text-gray-500' : 'text-gray-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="truncate">
            {displayValue || placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                autoFocus
              />
            </div>
          </div>

          {/* Items List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                {searchTerm ? 'No items match your search' : 'No items available'}
              </div>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                    item.id === value ? 'bg-primary-50 text-primary-700' : 'text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.item_name}</span>
                    <span className="text-xs text-gray-500">({item.unit_type})</span>
                  </div>
                  {item.unit_cost > 0 && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      ${item.unit_cost.toFixed(2)} per {item.unit_type}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const PurchaseOrderModal = ({ order, isOpen, onClose }: PurchaseOrderModalProps) => {
  const [formData, setFormData] = useState({
    supplier_id: '',
    order_number: '',
    expected_delivery_date: '',
    notes: '',
    items: [] as PurchaseOrderItem[]
  })
  const [bulkSelections, setBulkSelections] = useState<Record<string, { selected: boolean; quantity: number }>>({})

  const queryClient = useQueryClient()

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['admin-suppliers'],
    queryFn: async () => {
      const response = await fetch('/api/admin/suppliers')
      if (!response.ok) {
        throw new Error('Failed to fetch suppliers')
      }
      return response.json()
    },
    enabled: isOpen
  })

  // Fetch inventory items
  const { data: inventoryData } = useQuery({
    queryKey: ['admin-inventory-for-orders'],
    queryFn: async () => {
      const response = await fetch('/api/admin/inventory')
      if (!response.ok) {
        throw new Error('Failed to fetch inventory items')
      }
      return response.json()
    },
    enabled: isOpen
  })

  const suppliers = suppliersData?.suppliers || []
  const inventoryItems = inventoryData?.items || []
  const selectedSupplier = suppliers.find((supplier: any) => supplier.id === formData.supplier_id)

  const orderableItems = useMemo(() => {
    if (!formData.supplier_id) return []
    return inventoryItems
      .filter((invItem: any) => invItem.supplier_id === formData.supplier_id && invItem.item_type !== 'prepared')
      .map((invItem: any) => ({
        ...invItem,
        recommendedQuantity: Math.max(1, (invItem.reorder_point || 0) - (invItem.current_stock || 0))
      }))
      .sort((a: any, b: any) => {
        const aGap = (a.reorder_point || 0) - (a.current_stock || 0)
        const bGap = (b.reorder_point || 0) - (b.current_stock || 0)
        return bGap - aGap
      })
  }, [inventoryItems, formData.supplier_id])

  // Reset form when modal opens/closes or order changes
  useEffect(() => {
    if (isOpen) {
      if (order) {
        // Editing existing order
        setFormData({
          supplier_id: order.supplier_id,
          order_number: order.order_number,
          expected_delivery_date: order.expected_delivery_date?.split('T')[0] || '',
          notes: order.notes || '',
          items: order.items || []
        })
      } else {
        // Creating new order
        const orderNumber = `PO-${Date.now().toString().slice(-6)}`
        setFormData({
          supplier_id: '',
          order_number: orderNumber,
          expected_delivery_date: '',
          notes: '',
          items: []
        })
      }
      setBulkSelections({})
    }
  }, [isOpen, order])

  useEffect(() => {
    setBulkSelections({})
  }, [formData.supplier_id])

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const url = order?.id 
        ? `/api/admin/purchase-orders/${order.id}`
        : '/api/admin/purchase-orders'
      
      const method = order?.id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save purchase order')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success(order?.id ? 'Purchase order updated successfully' : 'Purchase order created successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-orders'] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save purchase order')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.supplier_id) {
      toast.error('Please select a supplier')
      return
    }

    if (!formData.order_number.trim()) {
      toast.error('Please enter an order number')
      return
    }

    if (formData.items.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    // Validate all items
    for (const item of formData.items) {
      if (!item.inventory_item_id || item.quantity_ordered <= 0) {
        toast.error('All items must have valid inventory item and quantity')
        return
      }
    }

    saveMutation.mutate(formData)
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        inventory_item_id: '',
        quantity_ordered: 1,
        unit_cost: 0,
        total_cost: 0
      }]
    }))
  }

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== index) return item
        
        const updatedItem = { ...item, [field]: value }
        
        // Auto-calculate total cost
        if (field === 'quantity_ordered') {
          updatedItem.total_cost = updatedItem.quantity_ordered * updatedItem.unit_cost
        }
        
        // Auto-fill unit cost from inventory item
        if (field === 'inventory_item_id') {
          const inventoryItem = inventoryItems.find((inv: any) => inv.id === value)
          if (inventoryItem) {
            updatedItem.unit_cost = inventoryItem.unit_cost
            updatedItem.total_cost = updatedItem.quantity_ordered * inventoryItem.unit_cost
            updatedItem.inventory_item_name = inventoryItem.item_name
            updatedItem.unit_type = inventoryItem.unit_type
          }
        }
        
        return updatedItem
      })
    }))
  }

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + item.total_cost, 0)
  }

  const toggleBulkSelection = (itemId: string, recommended: number) => {
    setBulkSelections(prev => {
      const current = prev[itemId]
      const selected = !(current?.selected)
      return {
        ...prev,
        [itemId]: {
          selected,
          quantity: current?.quantity || recommended || 1
        }
      }
    })
  }

  const updateBulkQuantity = (itemId: string, quantity: number) => {
    setBulkSelections(prev => ({
      ...prev,
      [itemId]: {
        selected: prev[itemId]?.selected ?? true,
        quantity
      }
    }))
  }

  const addBulkSelectedItems = () => {
    const selections = Object.entries(bulkSelections).filter(([, data]) => data.selected && data.quantity > 0)
    if (selections.length === 0) {
      toast.error('Select at least one item to add')
      return
    }

    setFormData(prev => {
      const existingItems = [...prev.items]
      const existingMap = new Map(existingItems.map((item, index) => [item.inventory_item_id, index]))

      selections.forEach(([itemId, data]) => {
        const inventoryItem = orderableItems.find((item: any) => item.id === itemId)
        if (!inventoryItem) return
        const quantity = data.quantity || 1
        const unitCost = inventoryItem.unit_cost || 0

        if (existingMap.has(itemId)) {
          const idx = existingMap.get(itemId) as number
          const existing = existingItems[idx]
          const newQuantity = existing.quantity_ordered + quantity
          existingItems[idx] = {
            ...existing,
            quantity_ordered: newQuantity,
            unit_cost: unitCost,
            total_cost: newQuantity * unitCost
          }
        } else {
          existingItems.push({
            inventory_item_id: itemId,
            inventory_item_name: inventoryItem.item_name,
            quantity_ordered: quantity,
            unit_cost: unitCost,
            total_cost: quantity * unitCost,
            unit_type: inventoryItem.unit_type
          })
        }
      })

      return { ...prev, items: existingItems }
    })

    setBulkSelections({})
    toast.success('Selected items added to the purchase order')
  }

  const hasBulkSelection = useMemo(() => {
    return Object.values(bulkSelections).some(entry => entry.selected && entry.quantity > 0)
  }, [bulkSelections])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {order?.id ? 'Edit Purchase Order' : 'Create Purchase Order'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Order Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Order Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="text-primary-600 border-primary-600 hover:bg-primary-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {formData.supplier_id && orderableItems.length > 0 && (
                <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50/40 p-4 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary-700">
                        Quick add items from {selectedSupplier?.name || 'supplier'}
                      </p>
                      <p className="text-xs text-primary-700/70">
                        Select multiple items and adjust quantities before adding them to this order.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={addBulkSelectedItems}
                      disabled={!hasBulkSelection}
                      className="bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Selected Items
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {orderableItems.slice(0, 18).map((invItem: any) => {
                      const selection = bulkSelections[invItem.id] || { selected: false, quantity: invItem.recommendedQuantity }
                      const quantityValue = selection.quantity ?? invItem.recommendedQuantity ?? 1
                      const reorderGap = (invItem.reorder_point || 0) - (invItem.current_stock || 0)
                      return (
                        <label
                          key={invItem.id}
                          className={`flex items-start gap-3 rounded-md border p-3 text-sm shadow-sm transition-colors ${
                            selection.selected ? 'border-primary-300 bg-white' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={selection.selected}
                            onChange={() => toggleBulkSelection(invItem.id, invItem.recommendedQuantity)}
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-gray-900">{invItem.item_name}</span>
                              <span className="text-xs text-gray-500">{invItem.unit_type}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Stock: {invItem.current_stock ?? 0}{' '}
                              {typeof invItem.reorder_point === 'number' && (
                                <>| Reorder at {invItem.reorder_point}</>
                              )}
                              {reorderGap > 0 && (
                                <span className="ml-2 text-primary-600">Needs +{reorderGap}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span>Quantity:</span>
                              <input
                                type="number"
                                min="1"
                                value={quantityValue > 0 ? quantityValue : ''}
                                disabled={!selection.selected}
                                onChange={(e) => {
                                  if (!selection.selected) return
                                  const raw = e.target.value
                                  if (raw === '') {
                                    updateBulkQuantity(invItem.id, 0)
                                    return
                                  }
                                  const parsed = Number.parseInt(raw, 10)
                                  updateBulkQuantity(invItem.id, Number.isNaN(parsed) ? 0 : parsed)
                                }}
                                onBlur={(e) => {
                                  if (!selection.selected) return
                                  const raw = e.target.value
                                  let parsed = Number.parseInt(raw, 10)
                                  if (Number.isNaN(parsed) || parsed < 1) {
                                    parsed = 1
                                  }
                                  updateBulkQuantity(invItem.id, parsed)
                                }}
                                className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
                              />
                              {invItem.unit_cost > 0 && (
                                <span className="text-gray-400">${invItem.unit_cost.toFixed(2)} ea</span>
                              )}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                    {orderableItems.length > 18 && (
                      <div className="text-xs text-gray-500">
                        Showing top 18 items. Use "Add Item" to select others.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Inventory Item *
                        </label>
                        {formData.supplier_id ? (
                          <SearchableDropdown
                            items={orderableItems}
                            value={item.inventory_item_id}
                            onChange={(value) => updateItem(index, 'inventory_item_id', value)}
                            placeholder="Search and select an item"
                            className="w-full"
                          />
                        ) : (
                          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                            Select a supplier first
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity_ordered > 0 ? item.quantity_ordered : ''}
                          onChange={(e) => {
                            const raw = e.target.value
                            if (raw === '') {
                              updateItem(index, 'quantity_ordered', 0)
                              return
                            }
                            const parsed = Number.parseInt(raw, 10)
                            updateItem(index, 'quantity_ordered', Number.isNaN(parsed) ? 0 : parsed)
                          }}
                          onBlur={() => {
                            if (item.quantity_ordered < 1) {
                              updateItem(index, 'quantity_ordered', 1)
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit Cost
                        </label>
                        <input
                          type="text"
                          value={`$${item.unit_cost.toFixed(2)}`}
                          readOnly
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600 cursor-not-allowed"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total
                          </label>
                          <span className="text-lg font-semibold text-gray-900">
                            ${item.total_cost.toFixed(2)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {formData.items.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">No items added yet</p>
                    <p className="text-sm">Use the button above to add items from the selected supplier.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Supplier *
                </label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map((supplier: any) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Number *
                </label>
                <input
                  type="text"
                  value={formData.order_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, order_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount
                </label>
                <input
                  type="text"
                  value={`$${calculateTotal().toFixed(2)}`}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Add any notes about this purchase order..."
              />
            </div>

            {/* Items Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Order Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="text-primary-600 border-primary-600 hover:bg-primary-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Inventory Item *
                        </label>
                        {formData.supplier_id ? (
                          <SearchableDropdown
                            items={inventoryItems.filter((invItem: any) => 
                              invItem.supplier_id === formData.supplier_id &&
                              invItem.item_type !== 'prepared'
                            )}
                            value={item.inventory_item_id}
                            onChange={(value) => updateItem(index, 'inventory_item_id', value)}
                            placeholder="Search and select an item"
                            className="w-full"
                          />
                        ) : (
                          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                            Select a supplier first
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity_ordered > 0 ? item.quantity_ordered : ''}
                          onChange={(e) => {
                            const raw = e.target.value
                            if (raw === '') {
                              updateItem(index, 'quantity_ordered', 0)
                              return
                            }
                            const parsed = Number.parseInt(raw, 10)
                            updateItem(index, 'quantity_ordered', Number.isNaN(parsed) ? 0 : parsed)
                          }}
                          onBlur={() => {
                            if (item.quantity_ordered < 1) {
                              updateItem(index, 'quantity_ordered', 1)
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit Cost
                        </label>
                        <input
                          type="text"
                          value={`$${item.unit_cost.toFixed(2)}`}
                          readOnly
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600 cursor-not-allowed"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total
                          </label>
                          <span className="text-lg font-semibold text-gray-900">
                            ${item.total_cost.toFixed(2)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {formData.items.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">No items added yet</p>
                    <p>Click "Add Item" to start building your purchase order</p>
                  </div>
                )}
              </div>

              {formData.items.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total Amount:</span>
                    <span className="text-xl font-bold text-primary-600">
                      ${calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving...' : (order?.id ? 'Update Order' : 'Create Order')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PurchaseOrderModal
