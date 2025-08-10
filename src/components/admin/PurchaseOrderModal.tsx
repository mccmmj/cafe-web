'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui'
import { X, Plus, Trash2, Package, Building2, Calendar } from 'lucide-react'
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

const PurchaseOrderModal = ({ order, isOpen, onClose }: PurchaseOrderModalProps) => {
  const [formData, setFormData] = useState({
    supplier_id: '',
    order_number: '',
    expected_delivery_date: '',
    notes: '',
    items: [] as PurchaseOrderItem[]
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
    }
  }, [isOpen, order])

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
      if (!item.inventory_item_id || item.quantity_ordered <= 0 || item.unit_cost <= 0) {
        toast.error('All items must have valid inventory item, quantity, and cost')
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
        if (field === 'quantity_ordered' || field === 'unit_cost') {
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
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

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                        <select
                          value={item.inventory_item_id}
                          onChange={(e) => updateItem(index, 'inventory_item_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                        >
                          <option value="">Select an item</option>
                          {inventoryItems.map((invItem: any) => (
                            <option key={invItem.id} value={invItem.id}>
                              {invItem.item_name} ({invItem.unit_type})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={item.quantity_ordered}
                          onChange={(e) => updateItem(index, 'quantity_ordered', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit Cost *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_cost}
                          onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
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