'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Package, 
  DollarSign, 
  User,
  FileText,
  ArrowRight,
  RefreshCw,
  Save,
  X,
  Plus,
  Search,
  ChevronDown,
  Skip
} from 'lucide-react'
import { Invoice } from '@/types/invoice'

interface ItemMatch {
  inventory_item_id: string
  inventory_item: {
    id: string
    item_name: string
    current_stock: number
    unit_cost: number
  }
  confidence: number
  match_reasons: string[]
  match_method: string
  quantity_conversion?: {
    invoice_quantity: number
    inventory_quantity: number
    conversion_factor: number
    package_info: string
  }
}

interface MatchingResult {
  invoice_item_id: string
  item_description: string
  supplier_item_code?: string
  quantity: number
  unit_price: number
  package_size?: string
  unit_type?: string
  current_match_id?: string
  current_confidence?: number
  suggested_matches: ItemMatch[]
  best_match?: ItemMatch | null
}

interface OrderMatch {
  purchase_order_id: string
  purchase_order: {
    order_number: string
    order_date: string
    total_amount: number
    status: string
  }
  confidence: number
  match_reasons: string[]
  quantity_variance: number
  amount_variance: number
  matched_items: number
  total_items: number
}

interface InvoiceReviewInterfaceProps {
  invoice: Invoice
  onClose: () => void
  onConfirm: () => void
}

interface InventoryItem {
  id: string
  item_name: string
  current_stock: number
  unit_cost: number
  unit_type: string
  location: string
}

interface Category {
  id: string
  name: string
  ordinal: number
}

interface ItemAction {
  type: 'match' | 'create' | 'skip'
  inventory_item_id?: string
  new_item_data?: {
    name: string
    unit_cost: number
    unit_type: string
    location: string
    minimum_threshold: number
    reorder_point: number
    category_id?: string
  }
}

export function InvoiceReviewInterface({ invoice, onClose, onConfirm }: InvoiceReviewInterfaceProps) {
  const [activeTab, setActiveTab] = useState<'items' | 'orders'>('items')
  const [itemMatches, setItemMatches] = useState<MatchingResult[]>([])
  const [orderMatches, setOrderMatches] = useState<OrderMatch[]>([])
  const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedMatches, setSelectedMatches] = useState<Record<string, string>>({})
  const [itemActions, setItemActions] = useState<Record<string, ItemAction>>({})
  const [showDropdowns, setShowDropdowns] = useState<Record<string, boolean>>({})
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({})
  const [showCreateForms, setShowCreateForms] = useState<Record<string, boolean>>({})
  const [newItemForms, setNewItemForms] = useState<Record<string, any>>({})

  useEffect(() => {
    loadMatches()
    loadAllInventoryItems()
    loadCategories()
  }, [invoice.id])

  const loadMatches = async () => {
    try {
      setLoading(true)
      
      // Load item matches
      const itemResponse = await fetch(`/api/admin/invoices/${invoice.id}/match-items`, {
        method: 'POST'
      })
      const itemResult = await itemResponse.json()
      
      if (itemResult.success) {
        setItemMatches(itemResult.data.matching_results || [])
        
        // Pre-select current matches and set actions
        const currentMatches: Record<string, string> = {}
        const actions: Record<string, ItemAction> = {}
        
        itemResult.data.matching_results.forEach((result: MatchingResult) => {
          if (result.current_match_id) {
            currentMatches[result.invoice_item_id] = result.current_match_id
            actions[result.invoice_item_id] = {
              type: 'match',
              inventory_item_id: result.current_match_id
            }
          }
        })
        
        setSelectedMatches(currentMatches)
        setItemActions(actions)
      }

      // Load order matches
      const orderResponse = await fetch(`/api/admin/invoices/${invoice.id}/match-orders`, {
        method: 'POST'
      })
      const orderResult = await orderResponse.json()
      
      if (orderResult.success) {
        setOrderMatches(orderResult.data.order_matches || [])
      }

    } catch (error) {
      console.error('Error loading matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAllInventoryItems = async () => {
    try {
      const response = await fetch('/api/admin/inventory')
      const result = await response.json()
      
      if (result.success) {
        setAllInventoryItems(result.items || [])
      }
    } catch (error) {
      console.error('Error loading inventory items:', error)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/admin/menu/categories')
      const result = await response.json()
      
      if (result.success) {
        setCategories(result.categories || [])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleItemMatchSelect = (invoiceItemId: string, inventoryItemId: string) => {
    setSelectedMatches(prev => ({
      ...prev,
      [invoiceItemId]: inventoryItemId
    }))
    
    setItemActions(prev => ({
      ...prev,
      [invoiceItemId]: {
        type: 'match',
        inventory_item_id: inventoryItemId
      }
    }))
    
    // Close dropdown
    setShowDropdowns(prev => ({
      ...prev,
      [invoiceItemId]: false
    }))
  }

  const handleSetAction = (invoiceItemId: string, action: ItemAction) => {
    setItemActions(prev => ({
      ...prev,
      [invoiceItemId]: action
    }))
    
    if (action.type === 'match' && action.inventory_item_id) {
      setSelectedMatches(prev => ({
        ...prev,
        [invoiceItemId]: action.inventory_item_id!
      }))
    } else {
      // Remove from selected matches if not matching
      setSelectedMatches(prev => {
        const newMatches = { ...prev }
        delete newMatches[invoiceItemId]
        return newMatches
      })
    }
  }

  const toggleDropdown = (invoiceItemId: string) => {
    setShowDropdowns(prev => ({
      ...prev,
      [invoiceItemId]: !prev[invoiceItemId]
    }))
  }

  const toggleCreateForm = (invoiceItemId: string) => {
    setShowCreateForms(prev => ({
      ...prev,
      [invoiceItemId]: !prev[invoiceItemId]
    }))
    
    // Initialize form data if opening
    if (!showCreateForms[invoiceItemId]) {
      const matchResult = itemMatches.find(m => m.invoice_item_id === invoiceItemId)
      setNewItemForms(prev => ({
        ...prev,
        [invoiceItemId]: {
          name: matchResult?.item_description || '',
          unit_cost: matchResult?.unit_price || 0,
          unit_type: matchResult?.unit_type || 'each',
          location: 'Storage',
          minimum_threshold: 5,
          reorder_point: 10,
          category_id: categories.length > 0 ? categories[0].id : ''
        }
      }))
    }
  }

  const updateNewItemForm = (invoiceItemId: string, field: string, value: any) => {
    setNewItemForms(prev => ({
      ...prev,
      [invoiceItemId]: {
        ...prev[invoiceItemId],
        [field]: value
      }
    }))
  }

  const confirmCreateNew = (invoiceItemId: string) => {
    const formData = newItemForms[invoiceItemId]
    if (!formData.name || formData.unit_cost <= 0 || !formData.category_id) {
      alert('Please fill in all required fields (Name, Unit Cost, and Category)')
      return
    }
    
    handleSetAction(invoiceItemId, {
      type: 'create',
      new_item_data: formData
    })
    
    setShowCreateForms(prev => ({
      ...prev,
      [invoiceItemId]: false
    }))
  }

  const getFilteredInventoryItems = (invoiceItemId: string) => {
    const searchTerm = searchTerms[invoiceItemId] || ''
    return allInventoryItems.filter(item => 
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const saveMatches = async () => {
    try {
      setSaving(true)
      
      // Process all item actions
      for (const [invoiceItemId, action] of Object.entries(itemActions)) {
        console.log(`Processing action for ${invoiceItemId}:`, action)
        
        if (action.type === 'match' && action.inventory_item_id) {
          // Match to existing inventory item
          const matchResult = itemMatches.find(m => m.invoice_item_id === invoiceItemId)
          const selectedMatch = matchResult?.suggested_matches.find(m => m.inventory_item_id === action.inventory_item_id)
          const confidence = selectedMatch?.confidence || 0.5 // Default confidence for manual matches
          
          const response = await fetch(`/api/admin/invoices/items/${invoiceItemId}/match`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              matched_item_id: action.inventory_item_id,
              match_confidence: confidence,
              match_method: 'manual'
            })
          })
          
          if (!response.ok) {
            console.error('Failed to save match for item:', invoiceItemId)
          }
        } 
        else if (action.type === 'create' && action.new_item_data) {
          // Create new inventory item and match
          const response = await fetch(`/api/admin/invoices/items/${invoiceItemId}/create-and-match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              new_item_data: action.new_item_data,
              match_method: 'manual_create'
            })
          })
          
          if (!response.ok) {
            console.error('Failed to create and match item:', invoiceItemId)
          }
        }
        else if (action.type === 'skip') {
          // Mark item as skipped
          const response = await fetch(`/api/admin/invoices/items/${invoiceItemId}/skip`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              skip_reason: 'manual_skip'
            })
          })
          
          if (!response.ok) {
            console.error('Failed to skip item:', invoiceItemId)
          }
        }
      }
      
      // Mark invoice as confirmed if all items are processed
      const allItemsProcessed = itemMatches.length === Object.keys(itemActions).length
      if (allItemsProcessed) {
        const response = await fetch(`/api/admin/invoices/${invoice.id}/confirm`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (!response.ok) {
          console.error('Failed to confirm invoice')
        }
      }
      
      // Refresh the parent component
      onConfirm()
      
    } catch (error) {
      console.error('Error saving matches:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4" />
    if (confidence >= 0.6) return <AlertCircle className="w-4 h-4" />
    return <X className="w-4 h-4" />
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="ml-3 text-lg">Loading matches...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-7xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Review Invoice Matches
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {invoice.suppliers?.name} • {invoice.invoice_number} • {new Date(invoice.invoice_date).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('items')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'items'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Item Matching ({itemMatches.length})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Order Matching ({orderMatches.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="min-h-96 max-h-[60vh] overflow-y-auto">
          {activeTab === 'items' && (
            <div className="space-y-4">
              {itemMatches.map((matchResult) => (
                <div key={matchResult.invoice_item_id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {matchResult.item_description}
                      </h4>
                      
                      {/* Raw Invoice Data */}
                      <div className="text-sm text-gray-700 mt-2 space-y-1 bg-gray-50 p-2 rounded">
                        <div className="flex items-center gap-4">
                          <span><strong>Quantity:</strong> {matchResult.quantity}</span>
                          <span><strong>Unit Price:</strong> ${matchResult.unit_price?.toFixed(2) || 'N/A'}</span>
                          {matchResult.unit_type && (
                            <span><strong>Unit:</strong> {matchResult.unit_type}</span>
                          )}
                        </div>
                        {(matchResult.supplier_item_code || matchResult.package_size) && (
                          <div className="flex items-center gap-4">
                            {matchResult.supplier_item_code && (
                              <span><strong>Item Code:</strong> {matchResult.supplier_item_code}</span>
                            )}
                            {matchResult.package_size && (
                              <span><strong>Package:</strong> {matchResult.package_size}</span>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-blue-600">
                          <strong>Total Line Value:</strong> ${((matchResult.quantity || 0) * (matchResult.unit_price || 0)).toFixed(2)}
                        </div>
                      </div>

                      <div className="text-sm text-gray-500 mt-2">
                        {matchResult.suggested_matches.length > 0 ? (
                          <span className="text-green-600">
                            {matchResult.suggested_matches.length} matches found
                          </span>
                        ) : (
                          <span className="text-red-600">No matches found</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => toggleDropdown(matchResult.invoice_item_id)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Browse All Items
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </button>
                    
                    <button
                      onClick={() => toggleCreateForm(matchResult.invoice_item_id)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Item
                    </button>
                    
                    <button
                      onClick={() => handleSetAction(matchResult.invoice_item_id, { type: 'skip' })}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Skip Item
                    </button>
                  </div>

                  {/* Current Action Display */}
                  {itemActions[matchResult.invoice_item_id] && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm font-medium text-blue-900">
                        Action: {itemActions[matchResult.invoice_item_id].type === 'match' && 'Match to Existing Item'}
                        {itemActions[matchResult.invoice_item_id].type === 'create' && 'Create New Item'}
                        {itemActions[matchResult.invoice_item_id].type === 'skip' && 'Skip This Item'}
                      </div>
                      {itemActions[matchResult.invoice_item_id].type === 'match' && itemActions[matchResult.invoice_item_id].inventory_item_id && (
                        <div className="text-sm text-blue-700 mt-1">
                          → {allInventoryItems.find(item => item.id === itemActions[matchResult.invoice_item_id].inventory_item_id)?.item_name || 'Unknown Item'}
                        </div>
                      )}
                      {itemActions[matchResult.invoice_item_id].type === 'create' && itemActions[matchResult.invoice_item_id].new_item_data && (
                        <div className="text-sm text-blue-700 mt-1">
                          → "{itemActions[matchResult.invoice_item_id].new_item_data!.name}" - ${itemActions[matchResult.invoice_item_id].new_item_data!.unit_cost}/each
                        </div>
                      )}
                    </div>
                  )}

                  {/* Browse All Items Dropdown */}
                  {showDropdowns[matchResult.invoice_item_id] && (
                    <div className="mb-4 border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="mb-3">
                        <input
                          type="text"
                          placeholder="Search inventory items..."
                          value={searchTerms[matchResult.invoice_item_id] || ''}
                          onChange={(e) => setSearchTerms(prev => ({
                            ...prev,
                            [matchResult.invoice_item_id]: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {getFilteredInventoryItems(matchResult.invoice_item_id).map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-3 border rounded cursor-pointer transition-colors ${
                              selectedMatches[matchResult.invoice_item_id] === item.id
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleItemMatchSelect(matchResult.invoice_item_id, item.id)}
                          >
                            <div className="flex-1">
                              <div className="font-medium">{item.item_name}</div>
                              <div className="text-sm text-gray-500">
                                Stock: {item.current_stock} • Cost: ${item.unit_cost.toFixed(2)} • {item.location}
                              </div>
                            </div>
                            <div className="ml-4">
                              {selectedMatches[matchResult.invoice_item_id] === item.id ? (
                                <CheckCircle className="w-5 h-5 text-indigo-600" />
                              ) : (
                                <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Create New Item Form */}
                  {showCreateForms[matchResult.invoice_item_id] && (
                    <div className="mb-4 border border-gray-200 rounded-lg p-4 bg-white">
                      <h6 className="font-medium text-gray-900 mb-3">Create New Inventory Item</h6>
                      
                      {/* Invoice Data Reference */}
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                        <div className="font-medium text-blue-900 mb-1">📋 From Invoice:</div>
                        <div className="text-blue-800 space-y-1">
                          <div><strong>Description:</strong> {matchResult.item_description}</div>
                          <div className="flex gap-4">
                            <span><strong>Qty:</strong> {matchResult.quantity}</span>
                            <span><strong>Unit Price:</strong> ${matchResult.unit_price?.toFixed(2) || 'N/A'}</span>
                            {matchResult.package_size && <span><strong>Package:</strong> {matchResult.package_size}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                          <input
                            type="text"
                            value={newItemForms[matchResult.invoice_item_id]?.name || ''}
                            onChange={(e) => updateNewItemForm(matchResult.invoice_item_id, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Enter item name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={newItemForms[matchResult.invoice_item_id]?.unit_cost || ''}
                            onChange={(e) => updateNewItemForm(matchResult.invoice_item_id, 'unit_cost', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                          <select
                            value={newItemForms[matchResult.invoice_item_id]?.category_id || ''}
                            onChange={(e) => updateNewItemForm(matchResult.invoice_item_id, 'category_id', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Select a category...</option>
                            {categories.map(category => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Type</label>
                          <select
                            value={newItemForms[matchResult.invoice_item_id]?.unit_type || 'each'}
                            onChange={(e) => updateNewItemForm(matchResult.invoice_item_id, 'unit_type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="each">Each</option>
                            <option value="lb">Pounds</option>
                            <option value="oz">Ounces</option>
                            <option value="box">Box</option>
                            <option value="case">Case</option>
                            <option value="pack">Pack</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                          <input
                            type="text"
                            value={newItemForms[matchResult.invoice_item_id]?.location || 'Storage'}
                            onChange={(e) => updateNewItemForm(matchResult.invoice_item_id, 'location', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Storage location"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          onClick={() => toggleCreateForm(matchResult.invoice_item_id)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => confirmCreateNew(matchResult.invoice_item_id)}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                        >
                          Create Item
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Suggested Matches (AI-generated) */}
                  {matchResult.suggested_matches.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">AI Suggested Matches:</h5>
                      {matchResult.suggested_matches.map((match) => (
                        <div
                          key={match.inventory_item_id}
                          className={`flex items-center justify-between p-3 border rounded cursor-pointer transition-colors ${
                            selectedMatches[matchResult.invoice_item_id] === match.inventory_item_id
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleItemMatchSelect(matchResult.invoice_item_id, match.inventory_item_id)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className="font-medium">{match.inventory_item.item_name}</span>
                              <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(match.confidence)}`}>
                                {getConfidenceIcon(match.confidence)}
                                <span className="ml-1">{Math.round(match.confidence * 100)}%</span>
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              Stock: {match.inventory_item.current_stock} • 
                              Cost: ${match.inventory_item.unit_cost.toFixed(2)} • 
                              {match.match_reasons.join(', ')}
                            </div>
                            {match.quantity_conversion && match.quantity_conversion.conversion_factor > 1 && (
                              <div className="text-sm text-blue-600 mt-1">
                                📦 {match.quantity_conversion.package_info}
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            {selectedMatches[matchResult.invoice_item_id] === match.inventory_item_id ? (
                              <CheckCircle className="w-5 h-5 text-indigo-600" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orderMatches.length > 0 ? (
                orderMatches.map((match) => (
                  <div key={match.purchase_order_id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h4 className="font-medium text-gray-900">
                            Order {match.purchase_order.order_number}
                          </h4>
                          <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(match.confidence)}`}>
                            {getConfidenceIcon(match.confidence)}
                            <span className="ml-1">{Math.round(match.confidence * 100)}%</span>
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-2 space-y-1">
                          <div>Order Date: {new Date(match.purchase_order.order_date).toLocaleDateString()}</div>
                          <div>Order Total: ${match.purchase_order.total_amount.toFixed(2)}</div>
                          <div>Amount Variance: ${Math.abs(match.amount_variance).toFixed(2)}</div>
                          <div>Items Matched: {match.matched_items}/{match.total_items}</div>
                        </div>
                        <div className="text-sm text-blue-600 mt-2">
                          {match.match_reasons.join(' • ')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4" />
                  <p>No matching purchase orders found</p>
                  <p className="text-sm">Orders are matched by supplier, date, and amount similarity</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div className="text-sm text-gray-600">
            {activeTab === 'items' && (
              <span>
                {Object.keys(itemActions).length}/{itemMatches.length} items processed
                ({Object.values(itemActions).filter(a => a.type === 'match').length} matched, 
                {Object.values(itemActions).filter(a => a.type === 'create').length} create new, 
                {Object.values(itemActions).filter(a => a.type === 'skip').length} skipped)
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={saveMatches}
              disabled={saving || Object.keys(itemActions).length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? 'Saving...' : 'Confirm Invoice Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}