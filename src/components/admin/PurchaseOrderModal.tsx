'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui'
import { X, Plus, Trash2, Package, Building2, Calendar, Search, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { CostCalculator } from './CostCalculator'

interface PurchaseOrderItem {
  id?: string
  inventory_item_id: string
  inventory_item_name?: string
  quantity_ordered: number
  unit_cost: number
  total_cost: number
  unit_type?: string
  ordered_pack_qty?: number | null
  pack_size?: number | null
  pack_price?: number | null
  order_unit?: 'each' | 'pack'
  is_excluded?: boolean
  exclusion_reason?: string | null
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
  const [quickAddOpen, setQuickAddOpen] = useState(true)
  const [openCalc, setOpenCalc] = useState<Record<number, boolean>>({})
  const [bulkSelections, setBulkSelections] = useState<Record<string, { selected: boolean; quantity: number }>>({})

  const deriveCosts = (invItem: any) => {
    const packSize = invItem?.pack_size || 1
    let unitCost = invItem?.unit_cost || 0
    let packPrice = invItem?.pack_price ?? null

    if (packSize <= 1) {
      return { packSize, packPrice: null, unitCost: Number(unitCost.toFixed(2)) }
    }

    if (packPrice == null) {
      const candidate = Number((unitCost * packSize).toFixed(2))
      // Heuristic:
      // - If unitCost is modest and multiplying by packSize gives a plausible pack price, treat unitCost as per-unit.
      // - Otherwise assume unitCost was stored as pack price.
      if (unitCost <= 10 || candidate <= unitCost) {
        packPrice = candidate
      } else {
        packPrice = Number(unitCost.toFixed(2))
        unitCost = Number((packPrice / packSize).toFixed(2))
      }
    }

    // Final normalize
    packPrice = Number((packPrice ?? 0).toFixed(2))
    unitCost = Number(((packPrice || unitCost * packSize) / packSize).toFixed(2))

    return { packSize, packPrice, unitCost }
  }

  const computeLineTotal = (it: PurchaseOrderItem) => {
    if (it.order_unit === 'pack') {
      const packs = it.ordered_pack_qty ?? 0
      const packSize = it.pack_size || 1
      const packPrice = it.pack_price ?? it.unit_cost * packSize
      return packs * packPrice
    }
    return (it.quantity_ordered || 0) * (it.unit_cost || 0)
  }

  const normalizeItem = (it: PurchaseOrderItem) => ({
    ...it,
    total_cost: computeLineTotal(it)
  })

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

  const getRecommendedQuantity = (inventoryItemId: string) => {
    const invItem = inventoryItems.find((inv: any) => inv.id === inventoryItemId)
    if (!invItem) return 1
    const gap = (invItem.reorder_point || 0) - (invItem.current_stock || 0)
    const reorderQty = gap > 0 ? gap : invItem.reorder_point || 1
    return Math.max(1, reorderQty)
  }

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
      items: [...prev.items, normalizeItem({
        inventory_item_id: '',
        quantity_ordered: 1,
        unit_cost: 0,
        total_cost: 0,
        pack_size: 1,
        ordered_pack_qty: 1,
        pack_price: 0,
        order_unit: 'each'
      })]
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
        let updatedItem = { ...item, [field]: value }

       // Switching units
       if (field === 'order_unit') {
         const packSize = updatedItem.pack_size || 1
         if (value === 'pack') {
           const packs = Math.max(1, Math.round((updatedItem.quantity_ordered || 1) / packSize))
           updatedItem.ordered_pack_qty = packs
           updatedItem.quantity_ordered = packs * packSize
         } else {
           updatedItem.ordered_pack_qty = null
         }
       }

       // In pack mode, quantity input should be packs
       if (updatedItem.order_unit === 'pack') {
          if (field === 'quantity_ordered') {
            const packSize = updatedItem.pack_size || 1
            const packs = Number(value) || 0
            updatedItem.ordered_pack_qty = packs
            updatedItem.quantity_ordered = packs * packSize
          }
          if (field === 'ordered_pack_qty') {
            const packSize = updatedItem.pack_size || 1
            const packs = Number(value) || 0
            updatedItem.ordered_pack_qty = packs
            updatedItem.quantity_ordered = packs * packSize
          }
          if (field === 'pack_price') {
            const packSize = updatedItem.pack_size || 1
            const packPrice = Number(value) || 0
            const unit = packSize > 0 ? Number((packPrice / packSize).toFixed(2)) : updatedItem.unit_cost
            updatedItem.unit_cost = unit
            updatedItem.pack_price = Number(packPrice.toFixed(2))
          }
          if (field === 'unit_cost') {
            const packSize = updatedItem.pack_size || 1
            const unit = Number(value) || 0
            updatedItem.unit_cost = Number(unit.toFixed(2))
            updatedItem.pack_price = Number((unit * packSize).toFixed(2))
          }
        }

        // Auto-fill unit cost from inventory item
        if (field === 'inventory_item_id') {
          const inventoryItem = inventoryItems.find((inv: any) => inv.id === value)
          if (inventoryItem) {
            const recommendedQty = getRecommendedQuantity(inventoryItem.id)
            const shouldSetQuantity = item.quantity_ordered === 1 || !item.inventory_item_id
            const { packSize, packPrice, unitCost } = deriveCosts(inventoryItem)
            updatedItem.unit_cost = unitCost
            updatedItem.pack_size = packSize
            updatedItem.pack_price = packPrice
            if (packSize > 1) {
              updatedItem.order_unit = 'pack'
              updatedItem.ordered_pack_qty = 1
              updatedItem.quantity_ordered = (updatedItem.ordered_pack_qty || 1) * packSize
            } else {
              updatedItem.order_unit = 'each'
              updatedItem.ordered_pack_qty = null
              updatedItem.quantity_ordered = shouldSetQuantity ? recommendedQty : item.quantity_ordered
            }
            updatedItem.inventory_item_name = inventoryItem.item_name
            updatedItem.unit_type = inventoryItem.unit_type
          }
        }

        updatedItem.total_cost = computeLineTotal(updatedItem)
        return updatedItem
      })
    }))
  }

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + computeLineTotal(item), 0)
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
        const { packSize, packPrice, unitCost } = deriveCosts(inventoryItem)

        if (existingMap.has(itemId)) {
          const idx = existingMap.get(itemId) as number
          const existing = existingItems[idx]
          if (packSize > 1) {
            const newPacks = (existing.ordered_pack_qty || 0) + quantity
            existingItems[idx] = normalizeItem({
              ...existing,
              order_unit: 'pack',
              ordered_pack_qty: newPacks,
              quantity_ordered: newPacks * packSize,
              unit_cost: Number(((packPrice ?? 0) / packSize).toFixed(2)),
              pack_price: packPrice ?? 0
            })
          } else {
            const newQuantity = existing.quantity_ordered + quantity
            existingItems[idx] = normalizeItem({
              ...existing,
              quantity_ordered: newQuantity,
              unit_cost: Number(unitCost.toFixed(2))
            })
          }
        } else {
          const roundedUnit = Number(unitCost.toFixed(2))
          const roundedPack = Number((packPrice || roundedUnit * packSize).toFixed(2))
          if (packSize > 1) {
            existingItems.push(normalizeItem({
              inventory_item_id: itemId,
              inventory_item_name: inventoryItem.item_name,
              order_unit: 'pack',
              ordered_pack_qty: quantity,
              quantity_ordered: quantity * packSize,
              unit_cost: Number((roundedPack / packSize).toFixed(2)),
              unit_type: inventoryItem.unit_type,
              pack_size: packSize,
              pack_price: roundedPack,
              total_cost: 0
            }))
          } else {
            existingItems.push(normalizeItem({
              inventory_item_id: itemId,
              inventory_item_name: inventoryItem.item_name,
              quantity_ordered: quantity,
              unit_cost: roundedUnit,
              unit_type: inventoryItem.unit_type,
              pack_size: packSize,
              pack_price: roundedPack || null,
              total_cost: 0
            }))
          }
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
                <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50/40">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-primary-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuickAddOpen((prev) => !prev)}
                        className="text-primary-700 hover:text-primary-900"
                        aria-expanded={quickAddOpen}
                        aria-controls="quick-add-panel"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${quickAddOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      <div>
                        <p className="text-sm font-medium text-primary-700">
                          Quick add items from {selectedSupplier?.name || 'supplier'}
                        </p>
                        <p className="text-xs text-primary-700/70">
                          Select multiple items and adjust quantities before adding them to this order.
                        </p>
                      </div>
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

                  {quickAddOpen && (
                    <div id="quick-add-panel" className="p-4">
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
                                  {(() => {
                                    const { packSize, packPrice, unitCost } = deriveCosts(invItem)
                                    const displayPrice = packSize > 1 ? packPrice : unitCost
                                    return displayPrice > 0 ? (
                                      <span className="text-gray-400">
                                        ${displayPrice.toFixed(2)} {packSize > 1 ? 'per pack' : 'ea'}
                                      </span>
                                    ) : null
                                  })()}
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
                </div>
              )}

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Inventory Item *</label>
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

                      <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={
                              item.order_unit === 'pack'
                                ? (item.ordered_pack_qty ?? Math.max(1, Math.round((item.quantity_ordered || 1) / (item.pack_size || 1))))
                                : item.quantity_ordered > 0 ? item.quantity_ordered : ''
                            }
                            onChange={(e) => {
                              const raw = e.target.value
                              const parsed = raw === '' ? 0 : Number.parseInt(raw, 10)
                              const safeQty = Number.isNaN(parsed) ? 0 : parsed
                              if (item.order_unit === 'pack') {
                                updateItem(index, 'ordered_pack_qty', safeQty)
                              } else {
                                updateItem(index, 'quantity_ordered', safeQty)
                              }
                            }}
                            onBlur={() => {
                              if (item.order_unit === 'pack') {
                                if ((item.ordered_pack_qty ?? 0) < 1) updateItem(index, 'ordered_pack_qty', 1)
                              } else if (item.quantity_ordered < 1) {
                                updateItem(index, 'quantity_ordered', 1)
                              }
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            required
                          />
                          <select
                            value={item.order_unit || 'each'}
                            onChange={(e) => {
                              const nextUnit = e.target.value as 'each' | 'pack'
                              setFormData(prev => ({
                                ...prev,
                                items: prev.items.map((it, i) => {
                                  if (i !== index) return it
                                  const packSize = it.pack_size || 1
                                  const orderedPackQty = nextUnit === 'pack' ? (it.ordered_pack_qty || 1) : undefined
                                  const quantityOrdered =
                                    nextUnit === 'pack'
                                      ? (orderedPackQty || 1) * packSize
                                      : it.quantity_ordered || 1
                                  return {
                                    ...it,
                                    order_unit: nextUnit,
                                    ordered_pack_qty: orderedPackQty,
                                    quantity_ordered: quantityOrdered,
                                    total_cost: quantityOrdered * it.unit_cost
                                  }
                                })
                              }))
                            }}
                            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="each">Each</option>
                            <option value="pack">Pack of {item.pack_size || 1}</option>
                          </select>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {item.order_unit === 'pack' ? 'Pack Cost' : 'Unit Cost'}
                          </label>
                          <button
                            type="button"
                            className="text-indigo-600 underline text-xs"
                            onClick={() => setOpenCalc(prev => ({ ...prev, [index]: !prev[index] }))}
                          >
                            Calc
                          </button>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            item.order_unit === 'pack'
                              ? (item.pack_price ?? Number(((item.unit_cost || 0) * (item.pack_size || 1)).toFixed(2)))
                              : item.unit_cost
                          }
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0
                            if (item.order_unit === 'pack') {
                              updateItem(index, 'pack_price', val)
                            } else {
                              updateItem(index, 'unit_cost', val)
                            }
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        {openCalc[index] && (
                          <div className="mt-2 p-3 rounded-md border border-gray-200 bg-white shadow-sm space-y-2">
                            <label className="block text-xs font-medium text-gray-700">Pack Cost ($)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.pack_price ?? ''}
                              onChange={(e) => {
                                const packPrice = Number(e.target.value) || 0
                                setFormData(prev => ({
                                  ...prev,
                                  items: prev.items.map((it, i) => {
                                    if (i !== index) return it
                                    const packSize = it.pack_size || 1
                                    const unitCost = packSize > 0 ? packPrice / packSize : it.unit_cost
                                    const quantityOrdered = it.order_unit === 'pack'
                                      ? (it.ordered_pack_qty || 1) * packSize
                                      : it.quantity_ordered || 1
                                    return {
                                      ...it,
                                      pack_price: packPrice,
                                      unit_cost: unitCost,
                                      total_cost: quantityOrdered * unitCost
                                    }
                                  })
                                }))
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                              placeholder="4.17"
                            />
                            <CostCalculator
                              packSize={item.pack_size || 1}
                              packPrice={item.pack_price || 0}
                              onUnitCost={(val) => {
                                setFormData(prev => ({
                                  ...prev,
                                  items: prev.items.map((it, i) => {
                                    if (i !== index) return it
                                    const packSize = it.pack_size || 1
                                    const quantityOrdered = it.order_unit === 'pack'
                                      ? (it.ordered_pack_qty || 1) * packSize
                                      : it.quantity_ordered || 1
                                    const roundedUnit = Number(val.toFixed(2))
                                    const roundedPack = Number((roundedUnit * packSize).toFixed(2))
                                    return {
                                      ...it,
                                      unit_cost: roundedUnit,
                                      pack_price: roundedPack,
                                      total_cost: quantityOrdered * roundedUnit
                                    }
                                  })
                                }))
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="col-span-2 flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">Total</span>
                        </div>
                        <div className="text-lg font-semibold text-gray-900">${item.total_cost.toFixed(2)}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Remove
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
