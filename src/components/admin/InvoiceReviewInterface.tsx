'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  CheckCircle, 
  AlertCircle, 
  Package, 
  FileText,
  RefreshCw,
  Save,
  X,
  Plus,
  Search,
  ChevronDown,
  SkipForward,
  Activity,
  Copy
} from 'lucide-react'
import { Invoice } from '@/types/invoice'

function derivePurchaseOrderNumberFromInvoiceNumber(invoiceNumber: string) {
  const trimmed = invoiceNumber.trim()
  const match = trimmed.match(/^(PO-[^-]+(?:-[^-]+)*)-(\d+)$/i)
  if (!match) return null
  return match[1] || null
}

interface ItemMatch {
  inventory_item_id: string
  inventory_item: {
    id: string
    item_name: string
    current_stock: number
    unit_cost: number
    pack_size?: number
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
  pack_size?: number
  location: string
}

interface Category {
  id: string
  name: string
  ordinal: number
}

interface CostHistoryEntry {
  id: string
  inventory_item_id: string
  previous_unit_cost: number | null
  new_unit_cost: number
  changed_at: string
  source?: string | null
}

interface NewInventoryItemForm {
  name: string
  unit_cost: number
  unit_type: string
  location: string
  minimum_threshold: number
  reorder_point: number
  category_id: string
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

const AUTO_MATCH_CONFIDENCE_THRESHOLD = 0.99

export function InvoiceReviewInterface({ invoice, onClose, onConfirm }: InvoiceReviewInterfaceProps) {
  const [activeTab, setActiveTab] = useState<'items' | 'orders'>('items')
  const [itemMatches, setItemMatches] = useState<MatchingResult[]>([])
  const [orderMatches, setOrderMatches] = useState<OrderMatch[]>([])
  const [linkedOrderMatch, setLinkedOrderMatch] = useState<OrderMatch | null>(null)
  const [showOrderSuggestions, setShowOrderSuggestions] = useState(false)
  const [linkingOrderId, setLinkingOrderId] = useState<string | null>(null)
  const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [costHistory, setCostHistory] = useState<Record<string, CostHistoryEntry[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [textPreview, setTextPreview] = useState<string>('')
  const [textPreviewLoading, setTextPreviewLoading] = useState(false)
  const [textPreviewError, setTextPreviewError] = useState<string | null>(null)
  const [showFullText, setShowFullText] = useState(false)
  const [highlightRange, setHighlightRange] = useState<{ start: number; end: number } | null>(null)
  const [copying, setCopying] = useState(false)
  const textPreviewRef = useRef<HTMLPreElement | null>(null)
  const [selectedMatches, setSelectedMatches] = useState<Record<string, string>>({})
  const [itemActions, setItemActions] = useState<Record<string, ItemAction>>({})
  const [showDropdowns, setShowDropdowns] = useState<Record<string, boolean>>({})
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({})
  const [showCreateForms, setShowCreateForms] = useState<Record<string, boolean>>({})
  const [newItemForms, setNewItemForms] = useState<Record<string, NewInventoryItemForm>>({})

  useEffect(() => {
    if (!highlightRange || !textPreviewRef.current) return
    const markEl = textPreviewRef.current.querySelector('mark')
    if (markEl) {
      markEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightRange])

  const getAutoMatchInventoryId = useCallback((result: MatchingResult): string | null => {
    const bestMatch = result.best_match
    if (!bestMatch || bestMatch.confidence < AUTO_MATCH_CONFIDENCE_THRESHOLD) {
      return null
    }

    const highConfidenceCandidates = (result.suggested_matches || []).filter(
      match => match.confidence >= AUTO_MATCH_CONFIDENCE_THRESHOLD
    )

    if (highConfidenceCandidates.length > 1) {
      // Multiple equally confident suggestions — require manual confirmation
      return null
    }

    return bestMatch.inventory_item_id
  }, [])

  const loadMatches = useCallback(async () => {
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
          let selectedInventoryId: string | null = null

          if (result.current_match_id) {
            selectedInventoryId = result.current_match_id
          } else {
            selectedInventoryId = getAutoMatchInventoryId(result)
          }

          if (selectedInventoryId) {
            currentMatches[result.invoice_item_id] = selectedInventoryId
            actions[result.invoice_item_id] = {
              type: 'match',
              inventory_item_id: selectedInventoryId
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
        setLinkedOrderMatch(orderResult.data.linked_match || null)
        setShowOrderSuggestions(!orderResult.data.linked_match)
      }

    } catch (error) {
      console.error('Error loading matches:', error)
    } finally {
      setLoading(false)
    }
  }, [getAutoMatchInventoryId, invoice.id])

  const loadAllInventoryItems = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/inventory')
      const result = await response.json()
      
      if (result.success) {
        setAllInventoryItems(result.items || [])
      }
    } catch (error) {
      console.error('Error loading inventory items:', error)
    }
  }, [])

  const loadCostHistory = async (itemId: string) => {
    if (!itemId || costHistory[itemId]) return
    try {
      const res = await fetch(`/api/admin/inventory/cost-history?id=${itemId}&limit=5`)
      const json = await res.json()
      if (json.success) {
        const history = (json.history || []) as CostHistoryEntry[]
        setCostHistory(prev => ({ ...prev, [itemId]: history }))
      }
    } catch (error) {
      console.error('Error loading cost history:', error)
    }
  }

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/menu/categories')
      const result = await response.json()
      
      if (result.success) {
        setCategories(result.categories || [])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }, [])

  const loadTextPreview = useCallback(async () => {
    try {
      setTextPreviewLoading(true)
      setTextPreviewError(null)
      const response = await fetch(`/api/admin/invoices/${invoice.id}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        setTextPreview(result.data.clean_text || result.data.raw_text || '')
      } else {
        throw new Error(result.error || 'Failed to load invoice text')
      }
    } catch (error) {
      console.error('Error loading text preview:', error)
      setTextPreviewError(error instanceof Error ? error.message : 'Failed to load text preview')
    } finally {
      setTextPreviewLoading(false)
    }
  }, [invoice.id])

  useEffect(() => {
    loadMatches()
    loadAllInventoryItems()
    loadCategories()
    loadTextPreview()
  }, [loadMatches, loadAllInventoryItems, loadCategories, loadTextPreview])

  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const getHighlightedPreviewHtml = () => {
    if (!textPreview) return ''
    if (!highlightRange) {
      return escapeHtml(textPreview)
    }
    const { start, end } = highlightRange
    return (
      escapeHtml(textPreview.slice(0, start)) +
      `<mark class="bg-yellow-200 text-gray-900 rounded px-1">${escapeHtml(textPreview.slice(start, end))}</mark>` +
      escapeHtml(textPreview.slice(end))
    )
  }

  const focusTextForItem = (description: string, supplierCode?: string) => {
    if (!textPreview) return
    setTextPreviewError(null)
    const candidates = [
      description?.trim(),
      supplierCode?.trim()
    ].filter(Boolean) as string[]

    for (const candidate of candidates) {
      const idx = textPreview.toLowerCase().indexOf(candidate.toLowerCase())
      if (idx !== -1) {
        setShowFullText(true)
        setHighlightRange({ start: idx, end: idx + candidate.length })
        return
      }
    }

    setHighlightRange(null)
    setTextPreviewError('Unable to locate that line inside the normalized text. Try editing manually.')
  }

  const handleCopyText = async () => {
    try {
      setCopying(true)
      const snippet = highlightRange
        ? textPreview.slice(highlightRange.start, highlightRange.end)
        : textPreview
      await navigator.clipboard.writeText(snippet)
    } catch (error) {
      console.error('Failed to copy text:', error)
      alert('Unable to copy to clipboard in this environment.')
    } finally {
      setCopying(false)
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

  const updateNewItemForm = <K extends keyof NewInventoryItemForm>(
    invoiceItemId: string,
    field: K,
    value: NewInventoryItemForm[K]
  ) => {
    const fallbackForm: NewInventoryItemForm = {
      name: '',
      unit_cost: 0,
      unit_type: 'each',
      location: 'Storage',
      minimum_threshold: 0,
      reorder_point: 0,
      category_id: ''
    }

    setNewItemForms(prev => ({
      ...prev,
      [invoiceItemId]: {
        ...(prev[invoiceItemId] ?? fallbackForm),
        [field]: value
      }
    }))
  }

  const linkOrderToInvoice = async (purchaseOrderId: string) => {
    try {
      setLinkingOrderId(purchaseOrderId)
      const response = await fetch(`/api/admin/invoices/${invoice.id}/link-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase_order_id: purchaseOrderId })
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to link invoice to purchase order')
      }
      await loadMatches()
      setShowOrderSuggestions(false)
    } catch (error) {
      console.error('Error linking invoice to purchase order:', error)
      alert(error instanceof Error ? error.message : 'Failed to link invoice to purchase order')
    } finally {
      setLinkingOrderId(null)
    }
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
              {(() => {
                const dateLabel = new Date(invoice.invoice_date).toLocaleDateString()
                const derivedPo = invoice.invoice_number ? derivePurchaseOrderNumberFromInvoiceNumber(invoice.invoice_number) : null
                if (derivedPo) {
                  return `${invoice.suppliers?.name} • Invoice: ${invoice.invoice_number} • PO: ${derivedPo} • ${dateLabel}`
                }
                return `${invoice.suppliers?.name} • ${invoice.invoice_number} • ${dateLabel}`
              })()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {invoice.text_analysis && (
          <div
            className={`mb-6 rounded-lg border p-4 ${
              invoice.text_analysis.needs_manual_review || invoice.text_analysis.needs_ocr
                ? 'border-orange-200 bg-orange-50'
                : 'border-green-200 bg-green-50'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Text analysis snapshot
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  {invoice.text_analysis.extraction_method
                    ? `Source: ${invoice.text_analysis.extraction_method.replace(/-/g, ' ')}`
                    : 'Source unknown'}
                  {' • '}
                  {invoice.text_analysis.text_length?.toLocaleString() || '0'} chars
                  {' • '}
                  {invoice.text_analysis.line_item_candidates ?? 0} line candidates
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {invoice.text_analysis.needs_ocr && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    Needs OCR review
                  </span>
                )}
                {invoice.text_analysis.needs_manual_review && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                    Keep in review queue
                  </span>
                )}
                {invoice.text_analysis.validation_confidence !== undefined && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                    Confidence {Math.round(invoice.text_analysis.validation_confidence * 100)}%
                  </span>
                )}
              </div>
            </div>

            {(invoice.text_analysis.warnings?.length || 0) > 0 && (
              <div className="mt-3 text-sm text-red-700 space-y-1">
                {invoice.text_analysis.warnings!.map((warning, index) => (
                  <div key={`review-warning-${index}`} className="flex items-start">
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-gray-900 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-gray-500" />
                Normalized text preview
              </p>
              {textPreview && (
                <button
                  onClick={handleCopyText}
                  disabled={copying}
                  className="inline-flex items-center text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  {copying ? 'Copying…' : 'Copy snippet'}
                </button>
              )}
            </div>
            {textPreview && textPreview.length > 600 && (
              <button
                onClick={() => setShowFullText(prev => !prev)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                {showFullText ? 'Collapse' : 'Expand'}
              </button>
            )}
          </div>
          {textPreviewLoading ? (
            <div className="mt-3 h-24 animate-pulse rounded bg-white" />
          ) : textPreviewError ? (
            <p className="mt-3 text-sm text-red-600">{textPreviewError}</p>
          ) : textPreview ? (
            <pre
              ref={textPreviewRef}
              className={`mt-3 whitespace-pre-wrap font-mono text-xs text-gray-700 bg-white border border-gray-200 rounded p-3 ${
                showFullText ? 'max-h-80' : 'max-h-40'
              } overflow-y-auto`}
              dangerouslySetInnerHTML={{ __html: getHighlightedPreviewHtml() }}
            />
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              No normalized text available yet. Run the parser to capture a clean text snapshot.
            </p>
          )}
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
              Order Matching ({linkedOrderMatch ? 1 : orderMatches.length})
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
                        <button
                          onClick={() => focusTextForItem(matchResult.item_description, matchResult.supplier_item_code)}
                          className="ml-3 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Find in text
                        </button>
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
                      <SkipForward className="w-3 h-3 mr-1" />
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
                          → &quot;{itemActions[matchResult.invoice_item_id].new_item_data!.name}&quot; - ${itemActions[matchResult.invoice_item_id].new_item_data!.unit_cost}/each
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
                          {match.quantity_conversion && (
                            <div className="text-xs text-indigo-600 mt-1">
                              {match.quantity_conversion.package_info}
                            </div>
                          )}
                          {match.inventory_item.pack_size && match.inventory_item.pack_size > 1 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Pack size: {match.inventory_item.pack_size}
                            </div>
                          )}
                          {match.inventory_item.id && (
                            <div className="text-xs text-blue-700 mt-1">
                              <button
                                className="underline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  loadCostHistory(match.inventory_item.id)
                                }}
                              >
                                View recent cost history
                              </button>
                              {costHistory[match.inventory_item.id] && costHistory[match.inventory_item.id].length > 0 && (
                                <div className="mt-1 space-y-1">
                                  {costHistory[match.inventory_item.id].map((h, idx) => (
                                    <div key={idx} className="text-[11px] text-gray-600">
                                      {new Date(h.changed_at).toLocaleDateString()} • {h.previous_unit_cost ?? '—'} → {h.new_unit_cost} ({h.source})
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
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
              {linkedOrderMatch ? (
                <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-green-800">
                        Linked to Order {linkedOrderMatch.purchase_order.order_number}
                      </h4>
                      <p className="text-sm text-green-700 mt-1">
                        Confidence {Math.round((linkedOrderMatch.confidence || 0.9) * 100)}% • Linked from {linkedOrderMatch.match_reasons.join(', ')}
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Order Total ${linkedOrderMatch.purchase_order.total_amount.toFixed(2)} • Amount Variance ${Math.abs(linkedOrderMatch.amount_variance).toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowOrderSuggestions(prev => !prev)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      {showOrderSuggestions ? 'Hide other options' : 'Change linked PO'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                  <h4 className="font-medium text-yellow-800">No purchase order linked yet</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Select one of the suggested orders below to link this invoice.
                  </p>
                </div>
              )}

              {(!linkedOrderMatch || showOrderSuggestions) && (
                orderMatches.length > 0 ? (
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
                      <div className="mt-4">
                        <button
                          onClick={() => { void linkOrderToInvoice(match.purchase_order_id) }}
                          disabled={linkingOrderId === match.purchase_order_id}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {linkingOrderId === match.purchase_order_id ? 'Linking…' : 'Link this PO'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4" />
                    <p>No matching purchase orders found</p>
                    <p className="text-sm">Orders are matched by supplier, date, and amount similarity</p>
                  </div>
                )
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
