'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button, Modal } from '@/components/ui'
import { X, Package, Building2, Calendar, Truck, Clock, CheckCircle, Send, Paperclip, Upload, Trash2, FileText, Link2, Unlink, ExternalLink, Eye } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { InvoiceUploadModal } from './InvoiceUploadModal'
import { InvoiceDetailsModal } from './InvoiceDetailsModal'
import type { Invoice, InvoiceStatus } from '@/types/invoice'
import { usePurchaseOrderMetrics } from '@/hooks/usePurchaseOrderMetrics'

interface PurchaseOrderItem {
  id: string
  inventory_item_id: string
  inventory_item_name: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  total_cost: number
  is_excluded?: boolean
  exclusion_reason?: string | null
  unit_type?: string
  ordered_pack_qty?: number | null
  pack_size?: number | null
}

type PurchaseOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'received'
  | 'cancelled'
  | 'confirmed'

interface StatusHistoryEntry {
  previous_status: string | null
  new_status: string
  changed_by?: string | null
  changed_at: string
  note?: string | null
}

interface PurchaseOrder {
  id: string
  supplier_id: string
  supplier_name: string
  supplier_contact?: string
  supplier_email?: string
  supplier_phone?: string
  order_number: string
  status: PurchaseOrderStatus
  order_date: string
  expected_delivery_date?: string
  actual_delivery_date?: string
  sent_at?: string
  sent_via?: string
  sent_notes?: string
  sent_by_profile?: {
    full_name?: string | null
    email?: string | null
  } | null
  total_amount: number
  notes?: string
  items?: PurchaseOrderItem[]
  created_at: string
  updated_at: string
  status_history?: StatusHistoryEntry[]
  pack_size?: number | null
}

interface PurchaseOrderAttachment {
  id: string
  file_name: string
  file_url: string
  storage_path: string
  file_type?: string | null
  file_size?: number | null
  uploaded_by?: string | null
  uploaded_by_profile?: {
    full_name?: string | null
    email?: string | null
  } | null
  uploaded_at: string
  notes?: string | null
}

interface PurchaseOrderReceipt {
  id: string
  purchase_order_id: string
  purchase_order_item_id: string
  quantity_received: number
  weight?: number | null
  weight_unit?: string | null
  notes?: string | null
  photo_url?: string | null
  photo_path?: string | null
  received_by?: string | null
  received_by_profile?: {
    full_name?: string | null
    email?: string | null
  } | null
  received_at: string
  purchase_order_items?: {
    id: string
    inventory_item_id: string
    quantity_ordered: number
    quantity_received: number
    inventory_items?: {
      item_name: string
      unit_type?: string | null
    } | null
  } | null
}

interface PurchaseOrderInvoiceMatch {
  id: string
  invoice_id: string
  match_confidence: number
  match_method: string
  status: string
  quantity_variance?: number | null
  amount_variance?: number | null
  variance_notes?: string | null
  created_at: string
  invoices?: {
    id: string
    invoice_number: string
    invoice_date: string
    due_date?: string | null
    total_amount: number
    status: string
    parsing_confidence?: number | null
    file_url?: string | null
    file_name?: string | null
    suppliers?: {
      id: string
      name: string
    } | null
  } | null
}

interface AvailableInvoiceSummary {
  id: string
  invoice_number: string
  invoice_date: string
  total_amount: number
  status: string
  parsing_confidence?: number | null
  file_url?: string | null
  file_name?: string | null
  created_at?: string
}

interface PurchaseOrderViewModalProps {
  order?: PurchaseOrder | null
  isOpen: boolean
  onClose: () => void
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: LucideIcon }> = {
  draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft', icon: Package },
  pending_approval: { color: 'bg-amber-100 text-amber-800', label: 'Pending Approval', icon: Clock },
  approved: { color: 'bg-blue-100 text-blue-800', label: 'Approved', icon: CheckCircle },
  sent: { color: 'bg-indigo-100 text-indigo-800', label: 'Sent to Supplier', icon: Send },
  received: { color: 'bg-green-100 text-green-800', label: 'Received', icon: Truck },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled', icon: X },
  confirmed: { color: 'bg-emerald-100 text-emerald-800', label: 'Confirmed', icon: CheckCircle }
}

const PurchaseOrderViewModal = ({ order, isOpen, onClose }: PurchaseOrderViewModalProps) => {
  const queryClient = useQueryClient()
  const [orderState, setOrderState] = useState<PurchaseOrder | null>(order || null)
  const [attachments, setAttachments] = useState<PurchaseOrderAttachment[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState<File | null>(null)
  const [attachmentNotes, setAttachmentNotes] = useState('')
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [removingAttachmentId, setRemovingAttachmentId] = useState<string | null>(null)
  const [invoiceMatches, setInvoiceMatches] = useState<PurchaseOrderInvoiceMatch[]>([])
  const [availableInvoices, setAvailableInvoices] = useState<AvailableInvoiceSummary[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [invoiceError, setInvoiceError] = useState<string | null>(null)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')
  const [linkingInvoice, setLinkingInvoice] = useState(false)
  const [showInvoiceUploadModal, setShowInvoiceUploadModal] = useState(false)
  const [detailsInvoice, setDetailsInvoice] = useState<Invoice | null>(null)
  const [receipts, setReceipts] = useState<PurchaseOrderReceipt[]>([])
  const [loadingReceipts, setLoadingReceipts] = useState(false)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [logReceiptModalOpen, setLogReceiptModalOpen] = useState(false)
  const [loggingReceipt, setLoggingReceipt] = useState(false)
  const [receiptForm, setReceiptForm] = useState<{
    purchase_order_item_id: string
    quantity: number
    notes: string
    weight: string
    weight_unit: string
    file: File | null
  }>({
    purchase_order_item_id: '',
    quantity: 1,
    notes: '',
    weight: '',
    weight_unit: '',
    file: null
  })
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null)

  const supplierRange = useMemo(() => {
    if (!orderState?.supplier_id) return null
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(endDate.getMonth() - 6 + 1)
    return {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    }
  }, [orderState?.supplier_id])

  const {
    data: supplierScorecardData,
    isLoading: supplierScorecardLoading
  } = usePurchaseOrderMetrics({
    start: supplierRange?.start,
    end: supplierRange?.end,
    supplierId: orderState?.supplier_id,
    enabled: Boolean(orderState?.supplier_id && supplierRange)
  })

  const supplierScorecardSummary = supplierScorecardData?.summary

  useEffect(() => {
    if (order) {
      setOrderState(order)
    }
  }, [order])

  const toggleItemExclusion = async (itemId: string, nextExcluded: boolean) => {
    if (!orderState) return
    try {
      setTogglingItemId(itemId)
      const response = await fetch(`/api/admin/purchase-orders/${orderState.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_excluded: nextExcluded,
          phase: 'post_send',
          reason: nextExcluded ? 'Marked out-of-stock after approval' : null
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to update item')
      }

      const updatedItem = result.item
      setOrderState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          total_amount: result.total_amount ?? prev.total_amount,
          items: prev.items?.map((item) => (item.id === itemId ? { ...item, ...updatedItem } : item))
        }
      })

      toast.success(nextExcluded ? 'Item marked out-of-stock' : 'Item re-included')
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-orders'] })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update item'
      toast.error(msg)
    } finally {
      setTogglingItemId(null)
    }
  }

  useEffect(() => {
    if (!isOpen || !orderState?.id) return

    const controller = new AbortController()

    const loadAttachments = async () => {
      setLoadingAttachments(true)
      setAttachmentError(null)
      try {
        const response = await fetch(`/api/admin/purchase-orders/${orderState.id}/attachments`, {
          signal: controller.signal
        })
        if (!response.ok) {
          const result = await response.json().catch(() => ({}))
          throw new Error(result.error || 'Failed to load attachments')
        }
        const result = await response.json()
        setAttachments(result.attachments || [])
      } catch (error) {
        if (controller.signal.aborted) return
        setAttachmentError(error instanceof Error ? error.message : 'Failed to load attachments')
      } finally {
        if (!controller.signal.aborted) {
          setLoadingAttachments(false)
        }
      }
    }

    void loadAttachments()

    return () => controller.abort()
  }, [isOpen, orderState?.id])

  useEffect(() => {
    if (!isOpen || !orderState?.id) return

    const controller = new AbortController()

    const loadReceipts = async () => {
      setLoadingReceipts(true)
      setReceiptError(null)
      try {
        const response = await fetch(`/api/admin/purchase-orders/${orderState.id}/receipts`, {
          signal: controller.signal
        })
        if (!response.ok) {
          const result = await response.json().catch(() => ({}))
          throw new Error(result.error || 'Failed to load receipts')
        }
        const result = await response.json()
        setReceipts(result.receipts || [])
      } catch (error) {
        if (controller.signal.aborted) return
        setReceiptError(error instanceof Error ? error.message : 'Failed to load receipts')
      } finally {
        if (!controller.signal.aborted) {
          setLoadingReceipts(false)
        }
      }
    }

    void loadReceipts()

    return () => controller.abort()
  }, [isOpen, orderState?.id])

  const fetchInvoicesForOrder = useCallback(async (signal?: AbortSignal) => {
    if (!orderState?.id) return
    if (!signal) {
      setLoadingInvoices(true)
    }
    setInvoiceError(null)
    try {
      const response = await fetch(`/api/admin/purchase-orders/${orderState.id}/invoices`, {
        signal
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || 'Failed to load invoices')
      }
      const result = await response.json()
      setInvoiceMatches(result.matches || [])
      setAvailableInvoices(result.available_invoices || [])
      if (Array.isArray(result.available_invoices) && result.available_invoices.length > 0) {
        setSelectedInvoiceId(result.available_invoices[0].id)
      } else {
        setSelectedInvoiceId('')
      }
    } catch (error) {
      if (signal?.aborted) return
      setInvoiceError(error instanceof Error ? error.message : 'Failed to load invoices')
    } finally {
      if (!signal) {
        setLoadingInvoices(false)
      }
    }
  }, [orderState?.id])

  useEffect(() => {
    if (!isOpen || !orderState?.id) return
    const controller = new AbortController()
    void fetchInvoicesForOrder(controller.signal)
    return () => controller.abort()
  }, [isOpen, orderState?.id, fetchInvoicesForOrder])

  useEffect(() => {
    if (!isOpen) {
      setAttachments([])
      setAttachmentError(null)
      setSelectedAttachmentFile(null)
      setAttachmentNotes('')
      setUploadingAttachment(false)
      setRemovingAttachmentId(null)
      setInvoiceMatches([])
      setAvailableInvoices([])
      setInvoiceError(null)
      setLoadingInvoices(false)
      setLinkModalOpen(false)
      setSelectedInvoiceId('')
      setLinkingInvoice(false)
      setShowInvoiceUploadModal(false)
      setDetailsInvoice(null)
      setReceipts([])
      setReceiptError(null)
      setLogReceiptModalOpen(false)
      setLoggingReceipt(false)
      setReceiptForm({
        purchase_order_item_id: '',
        quantity: 1,
        notes: '',
        weight: '',
        weight_unit: '',
        file: null
      })
    }
  }, [isOpen])

  const formatFileSize = (size?: number | null) => {
    if (!size || size <= 0) return '—'
    const kb = size / 1024
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`
    }
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  const handleAttachmentUpload = async () => {
    if (!orderState) return
    if (!selectedAttachmentFile) {
      toast.error('Select a file to upload')
      return
    }

    try {
      setUploadingAttachment(true)
      setAttachmentError(null)

      const formData = new FormData()
      formData.append('file', selectedAttachmentFile)
      if (attachmentNotes.trim()) {
        formData.append('notes', attachmentNotes.trim())
      }

      const response = await fetch(`/api/admin/purchase-orders/${orderState.id}/attachments`, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload attachment')
      }

      setAttachments(prev => [result.attachment, ...prev])
      toast.success('Attachment uploaded')
      setSelectedAttachmentFile(null)
      setAttachmentNotes('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload attachment'
      toast.error(message)
      setAttachmentError(message)
    } finally {
      setUploadingAttachment(false)
    }
  }

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!orderState) return
    try {
      setRemovingAttachmentId(attachmentId)
      const response = await fetch(`/api/admin/purchase-orders/${orderState.id}/attachments/${attachmentId}`, {
        method: 'DELETE'
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete attachment')
      }
      setAttachments(prev => prev.filter(attachment => attachment.id !== attachmentId))
      toast.success('Attachment removed')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete attachment'
      toast.error(message)
    } finally {
      setRemovingAttachmentId(null)
    }
  }

  const outstandingItems = useMemo(() => {
    if (!orderState?.items) return [] as Array<{ id: string; name: string; remaining: number; unit_type?: string }>
    return orderState.items
      .map(item => {
        const remaining = Math.max(0, (item.quantity_ordered || 0) - (item.quantity_received || 0))
        return {
          id: item.id,
          name: item.inventory_item_name,
          remaining,
          unit_type: item.unit_type
        }
      })
      .filter(item => item.remaining > 0)
  }, [orderState?.items])

  const totalOrdered = useMemo(() => {
    return orderState?.items?.reduce((sum, item) => sum + (item.quantity_ordered || 0), 0) || 0
  }, [orderState?.items])

  const totalReceived = useMemo(() => {
    return orderState?.items?.reduce((sum, item) => sum + (item.quantity_received || 0), 0) || 0
  }, [orderState?.items])

  const totalRemaining = Math.max(0, totalOrdered - totalReceived)

  const computedTotalAmount = useMemo(() => {
    return orderState?.items?.reduce((sum, item) => sum + (item.total_cost || 0), 0) || 0
  }, [orderState?.items])

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const resetReceiptForm = () => {
    setReceiptForm({
      purchase_order_item_id: '',
      quantity: 1,
      notes: '',
      weight: '',
      weight_unit: '',
      file: null
    })
  }

  const handleOpenLogReceipt = () => {
    const defaultItem = outstandingItems[0]
    setReceiptForm({
      purchase_order_item_id: defaultItem?.id || '',
      quantity: defaultItem?.remaining || 1,
      notes: '',
      weight: '',
      weight_unit: defaultItem?.unit_type || '',
      file: null
    })
    setLogReceiptModalOpen(true)
  }

  const handleReceiptItemChange = (itemId: string) => {
    const target = outstandingItems.find(item => item.id === itemId)
    setReceiptForm(prev => ({
      ...prev,
      purchase_order_item_id: itemId,
      quantity: target?.remaining || 1,
      weight_unit: target?.unit_type || prev.weight_unit
    }))
  }

  const handleReceiptFileChange = (file: File | null) => {
    setReceiptForm(prev => ({ ...prev, file }))
  }

  const handleOpenInvoiceUpload = () => {
    setShowInvoiceUploadModal(true)
  }

  const handleInvoiceUploadComplete = async () => {
    await fetchInvoicesForOrder()
    queryClient.invalidateQueries({ queryKey: ['admin-invoices'] })
  }

  const handleOpenLinkInvoice = () => {
    if (availableInvoices.length === 0) {
      toast.error('No additional invoices available to link')
      return
    }
    setSelectedInvoiceId(availableInvoices[0].id)
    setLinkModalOpen(true)
  }

  const handleLinkInvoice = async () => {
    if (!orderState) return
    if (!selectedInvoiceId) {
      toast.error('Select an invoice to link')
      return
    }
    try {
      setLinkingInvoice(true)
      const response = await fetch(`/api/admin/purchase-orders/${orderState.id}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: selectedInvoiceId,
          match_confidence: 1,
          match_method: 'manual',
          status: 'pending'
        })
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to link invoice')
      }
      toast.success('Invoice linked to purchase order')
      setLinkModalOpen(false)
      await fetchInvoicesForOrder()
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to link invoice'
      toast.error(message)
    } finally {
      setLinkingInvoice(false)
    }
  }

  const handleUnlinkInvoice = async (matchId: string) => {
    if (!orderState) return
    try {
      const response = await fetch(`/api/admin/purchase-orders/${orderState.id}/invoices/${matchId}`, {
        method: 'DELETE'
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Failed to unlink invoice')
      }
      toast.success('Invoice unlinked from purchase order')
      await fetchInvoicesForOrder()
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unlink invoice'
      toast.error(message)
    }
  }

  const handleViewInvoiceDetails = (invoiceMatch: PurchaseOrderInvoiceMatch) => {
    const invoiceData = invoiceMatch.invoices
    if (!invoiceData) {
      toast.error('Invoice details unavailable')
      return
    }
    setDetailsInvoice({
      id: invoiceData.id,
      supplier_id: invoiceData.suppliers?.id || '',
      invoice_number: invoiceData.invoice_number,
      invoice_date: invoiceData.invoice_date,
      due_date: invoiceData.due_date || undefined,
      total_amount: invoiceData.total_amount,
      status: invoiceData.status as InvoiceStatus,
      file_url: invoiceData.file_url || undefined,
      file_name: invoiceData.file_name || undefined,
      file_size: undefined,
      file_type: undefined,
      created_at: '',
      updated_at: '',
      invoice_items: [],
      suppliers: invoiceData.suppliers ? { id: invoiceData.suppliers.id, name: invoiceData.suppliers.name } : undefined
    } as Invoice)
  }

  const handleOpenInvoiceFile = (invoiceId?: string | null) => {
    if (!orderState || !invoiceId) {
      toast.error('Invoice file unavailable')
      return
    }
    const openFile = async () => {
      try {
        const response = await fetch(`/api/admin/invoices/${invoiceId}/file`)
        const result = await response.json()
        if (!response.ok || !result?.url) {
          throw new Error(result?.error || 'Unable to get signed URL')
        }
        window.open(result.url, '_blank', 'noopener,noreferrer')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to open invoice'
        toast.error(message)
      }
    }
    void openFile()
  }

  const refreshReceipts = async () => {
    if (!orderState) return
    try {
      const response = await fetch(`/api/admin/purchase-orders/${orderState.id}/receipts`)
      if (!response.ok) return
      const result = await response.json()
      setReceipts(result.receipts || [])
    } catch (error) {
      console.error('Failed to refresh receipts', error)
    }
  }

  const reloadOrder = async () => {
    if (!orderState) return
    try {
      const response = await fetch(`/api/admin/purchase-orders/${orderState.id}`)
      if (!response.ok) return
      const result = await response.json()
      if (result?.order) {
        setOrderState(result.order)
      }
    } catch (error) {
      console.error('Failed to refresh purchase order', error)
    }
  }

  const handleLogReceiptSubmit = async () => {
    if (!orderState) return
    if (!receiptForm.purchase_order_item_id) {
      toast.error('Select an item to log a receipt')
      return
    }
    const outstanding = outstandingItems.find(item => item.id === receiptForm.purchase_order_item_id)
    if (!outstanding) {
      toast.error('Selected item is already fully received')
      return
    }
    const quantity = Number(receiptForm.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Enter a valid quantity')
      return
    }
    if (!Number.isInteger(quantity)) {
      toast.error('Quantity must be a whole number')
      return
    }
    if (quantity > outstanding.remaining) {
      toast.error(`Cannot receive more than ${outstanding.remaining}`)
      return
    }

    try {
      setLoggingReceipt(true)
      const formData = new FormData()
      formData.append('purchase_order_item_id', receiptForm.purchase_order_item_id)
      formData.append('quantity', quantity.toString())
      if (receiptForm.notes.trim()) {
        formData.append('notes', receiptForm.notes.trim())
      }
      if (receiptForm.weight.trim()) {
        formData.append('weight', receiptForm.weight.trim())
      }
      if (receiptForm.weight_unit.trim()) {
        formData.append('weight_unit', receiptForm.weight_unit.trim())
      }
      if (receiptForm.file) {
        formData.append('file', receiptForm.file)
      }

      const response = await fetch(`/api/admin/purchase-orders/${orderState.id}/receipts`, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to log receipt')
      }

      if (result.receipt) {
        setReceipts(prev => [result.receipt, ...prev])
      } else {
        await refreshReceipts()
      }

      toast.success('Receipt logged')
      setLogReceiptModalOpen(false)
      resetReceiptForm()

      await reloadOrder()
      await refreshReceipts()
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-orders'] })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to log receipt'
      toast.error(message)
    } finally {
      setLoggingReceipt(false)
    }
  }

  const invoiceSummary = useMemo(() => {
    let confirmed = 0
    let parsedOrMatched = 0
    let totalAmount = 0
    invoiceMatches.forEach(m => {
      const status = m.invoices?.status
      if (status === 'confirmed') confirmed += 1
      if (status === 'parsed' || status === 'matched') parsedOrMatched += 1
      totalAmount += Number(m.invoices?.total_amount || 0)
    })
    return {
      totalLinked: invoiceMatches.length,
      confirmed,
      parsedOrMatched,
      totalAmount
    }
  }, [invoiceMatches])

  const selectedOutstanding = outstandingItems.find(item => item.id === receiptForm.purchase_order_item_id) || null

  if (!isOpen || !orderState) return null

  const formatDate = (dateString: string) => {
    if (!dateString) return '—'
    const localDate = dateString.includes('T')
      ? new Date(dateString)
      : new Date(`${dateString}T00:00:00`)
    return localDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentValue = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—'
    }
    return `${(value * 100).toFixed(1)}%`
  }

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return { label: 'Uploaded', className: 'bg-blue-100 text-blue-800' }
      case 'parsing':
        return { label: 'Parsing', className: 'bg-yellow-100 text-yellow-800' }
      case 'parsed':
        return { label: 'Parsed', className: 'bg-green-100 text-green-800' }
      case 'reviewing':
        return { label: 'Reviewing', className: 'bg-orange-100 text-orange-800' }
      case 'matched':
        return { label: 'Matched', className: 'bg-green-100 text-green-800' }
      case 'confirmed':
        return { label: 'Confirmed', className: 'bg-emerald-100 text-emerald-800' }
      case 'error':
        return { label: 'Error', className: 'bg-red-100 text-red-800' }
      default:
        return { label: status, className: 'bg-gray-100 text-gray-800' }
    }
  }

  const getMatchStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', className: 'bg-blue-100 text-blue-800' }
      case 'reviewing':
        return { label: 'Reviewing', className: 'bg-yellow-100 text-yellow-800' }
      case 'confirmed':
        return { label: 'Confirmed', className: 'bg-green-100 text-green-800' }
      case 'rejected':
        return { label: 'Rejected', className: 'bg-red-100 text-red-800' }
      default:
        return { label: status, className: 'bg-gray-100 text-gray-800' }
    }
  }

  const getStatusConfig = (status: string) => {
    const canonical = status === 'confirmed' ? 'approved' : status
    return STATUS_CONFIG[canonical] || STATUS_CONFIG.draft
  }

  const currentStatusConfig = getStatusConfig(orderState.status)
  const StatusIcon = currentStatusConfig.icon

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-primary-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Purchase Order #{orderState.order_number}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentStatusConfig.color}`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {currentStatusConfig.label}
                </span>
              </div>
            </div>
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
          <div className="p-6 space-y-6">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Order Date</label>
                  <div className="flex items-center text-gray-900">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    {formatDate(orderState.order_date)}
                  </div>
                </div>

                {orderState.expected_delivery_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Expected Delivery</label>
                    <div className="flex items-center text-gray-900">
                      <Clock className="w-4 h-4 mr-2 text-gray-400" />
                      {formatDate(orderState.expected_delivery_date)}
                    </div>
                  </div>
                )}

                {orderState.actual_delivery_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Actual Delivery</label>
                    <div className="flex items-center text-green-600">
                      <Truck className="w-4 h-4 mr-2 text-green-500" />
                      {formatDate(orderState.actual_delivery_date)}
                    </div>
                  </div>
                )}

                {orderState.sent_at && (
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Sent to Supplier</label>
                    <div className="flex items-center text-indigo-600">
                      <Send className="w-4 h-4 mr-2 text-indigo-500" />
                      {formatDateTime(orderState.sent_at)}
                      {orderState.sent_via && (
                        <span className="ml-2 text-sm text-gray-500">via {orderState.sent_via.replace('_', ' ')}</span>
                      )}
                      {orderState.sent_by_profile && (
                        <span className="ml-2 text-sm text-gray-500">
                          by {orderState.sent_by_profile.full_name || 'Admin'}
                          {orderState.sent_by_profile.email ? ` (${orderState.sent_by_profile.email})` : ''}
                        </span>
                      )}
                    </div>
                    {orderState.sent_notes && (
                      <p className="mt-1 text-xs text-gray-500 italic">
                        {orderState.sent_notes}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Total Amount</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(orderState.total_amount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Supplier Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-primary-600" />
                Supplier Information
              </h3>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Supplier Name</label>
                    <p className="text-gray-900 font-medium">{orderState.supplier_name}</p>
                  </div>
                  
                  {orderState.supplier_contact && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Contact Person</label>
                      <p className="text-gray-900">{orderState.supplier_contact}</p>
                    </div>
                  )}
                  
                  {orderState.supplier_email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                      <p className="text-gray-900">{orderState.supplier_email}</p>
                    </div>
                  )}
                  
                  {orderState.supplier_phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                      <p className="text-gray-900">{orderState.supplier_phone}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/80 p-4">
                  <p className="text-sm font-semibold text-indigo-900">Performance (last 6 months)</p>
                  {supplierScorecardLoading ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="h-14 w-32 animate-pulse rounded-md bg-white/60" />
                      ))}
                    </div>
                  ) : supplierScorecardSummary ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-indigo-600">Spend</p>
                        <p className="text-base font-semibold text-gray-900">
                          {formatCurrency(supplierScorecardSummary.totalSpend)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-indigo-600">On-Time</p>
                        <p className="text-base font-semibold text-gray-900">
                          {formatPercentValue(supplierScorecardSummary.avgOnTimeRatio)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-indigo-600">Exceptions</p>
                        <p className="text-base font-semibold text-gray-900">
                          {formatPercentValue(supplierScorecardSummary.avgInvoiceExceptionRate)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-indigo-900/80">
                      No recent metrics found for this supplier.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Receiving */}
            <div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-medium text-gray-900">Receiving Progress</h3>
                </div>
                <Button
                  onClick={handleOpenLogReceipt}
                  disabled={outstandingItems.length === 0 || loggingReceipt}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-60"
                >
                  {outstandingItems.length === 0 ? 'Fully Received' : 'Log Receipt'}
                </Button>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Ordered</p>
                    <p className="font-semibold text-gray-900">{totalOrdered}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Received</p>
                    <p className="font-semibold text-gray-900">{totalReceived}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Outstanding</p>
                    <p className={`font-semibold ${totalRemaining > 0 ? 'text-amber-600' : 'text-green-600'}`}>{totalRemaining}</p>
                  </div>
                </div>

                {receiptError && (
                  <div className="text-sm text-red-600">{receiptError}</div>
                )}

                {loadingReceipts ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    Loading receipts...
                  </div>
                ) : receipts.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {outstandingItems.length === 0
                      ? 'All items have been received.'
                      : 'No receipts logged yet.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {receipts.map(receipt => {
                      const itemInfo = receipt.purchase_order_items
                      const itemName = itemInfo?.inventory_items?.item_name || 'Item'
                      const unitType = itemInfo?.inventory_items?.unit_type || 'units'
                      return (
                        <div key={receipt.id} className="border border-gray-200 rounded-md p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {itemName}
                                <span className="ml-2 text-xs font-normal text-gray-500">
                                  +{receipt.quantity_received} {unitType}
                                </span>
                              </p>
                              <p className="text-xs text-gray-500">Logged {formatDateTime(receipt.received_at)}</p>
                              {receipt.received_by_profile && (
                                <p className="text-xs text-gray-500">
                                  by {receipt.received_by_profile.full_name || 'Admin'}
                                  {receipt.received_by_profile.email ? ` (${receipt.received_by_profile.email})` : ''}
                                </p>
                              )}
                              {receipt.notes && (
                                <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{receipt.notes}</p>
                              )}
                              {receipt.weight && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Weight: {receipt.weight} {receipt.weight_unit || ''}
                                </p>
                              )}
                            </div>
                            {receipt.photo_url && (
                              <a
                                href={receipt.photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary-600 hover:underline"
                              >
                                View photo
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Supplier Invoices */}
            <div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-medium text-gray-900">Supplier Invoices</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
                      <span className="font-semibold text-gray-900">{invoiceSummary.totalLinked}</span> linked
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                      <CheckCircle className="w-3 h-3" />
                      {invoiceSummary.confirmed} confirmed
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                      <FileText className="w-3 h-3" />
                      {invoiceSummary.parsedOrMatched} parsed/matched
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-indigo-700">
                      Total {formatCurrency(invoiceSummary.totalAmount)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleOpenLinkInvoice}
                    disabled={availableInvoices.length === 0 || linkingInvoice}
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Link Existing
                  </Button>
                  <Button
                    onClick={handleOpenInvoiceUpload}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Invoice
                  </Button>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                {invoiceError && (
                  <div className="text-sm text-red-600">{invoiceError}</div>
                )}

                {loadingInvoices ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    Loading invoices...
                  </div>
                ) : invoiceMatches.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {availableInvoices.length === 0
                      ? 'No invoices linked to this purchase order yet.'
                      : 'No invoices linked yet. Link an existing invoice or upload a new one.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {invoiceMatches.map(match => {
                      const invoiceData = match.invoices
                      const invoiceBadge = invoiceData ? getInvoiceStatusBadge(invoiceData.status) : null
                      const matchBadge = getMatchStatusBadge(match.status)
                      return (
                        <div key={match.id} className="border border-gray-200 rounded-md p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">
                                  {invoiceData?.invoice_number || 'Invoice'}
                                </p>
                                {invoiceBadge && (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${invoiceBadge.className}`}>
                                    {invoiceBadge.label}
                                  </span>
                                )}
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${matchBadge.className}`}>
                                  {matchBadge.label}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {invoiceData
                                  ? `${formatDate(invoiceData.invoice_date)} • ${formatCurrency(invoiceData.total_amount)}${invoiceData.suppliers?.name ? ` • ${invoiceData.suppliers.name}` : ''}`
                                  : 'Invoice record not found'}
                              </p>
                              {typeof match.match_confidence === 'number' && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Match confidence: {Math.round(match.match_confidence * 100)}%
                                </p>
                              )}
                              {(match.quantity_variance || match.amount_variance) && (
                                <p className="text-xs text-amber-600 mt-1">
                                  Variance: {match.quantity_variance ? `Qty ${match.quantity_variance}` : ''}{match.quantity_variance && match.amount_variance ? ' • ' : ''}{match.amount_variance ? `Amount ${formatCurrency(match.amount_variance)}` : ''}
                                </p>
                              )}
                              {match.variance_notes && (
                                <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">
                                  {match.variance_notes}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {invoiceData?.id && invoiceData?.file_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenInvoiceFile(invoiceData.id)}
                                  className="text-indigo-600"
                                >
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  Open File
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewInvoiceDetails(match)}
                                className="text-primary-600"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View Details
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnlinkInvoice(match.id)}
                                className="text-red-600"
                              >
                                <Unlink className="w-4 h-4 mr-1" />
                                Unlink
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2 text-primary-600" />
                Order Items
              </h3>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty Ordered
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty Received
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Outstanding
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Out of Stock
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Cost
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orderState.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {item.inventory_item_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              Unit: {item.unit_type || 'each'}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {item.quantity_ordered}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <span className={item.quantity_received === item.quantity_ordered ? 'text-green-600' : 'text-gray-900'}>
                              {item.quantity_received}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <span className={item.quantity_received === item.quantity_ordered ? 'text-green-600' : 'text-amber-600'}>
                              {item.is_excluded ? '—' : Math.max(0, item.quantity_ordered - item.quantity_received)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium border ${
                                  item.is_excluded
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-green-50 text-green-700 border-green-200'
                                } ${togglingItemId === item.id ? 'opacity-70 cursor-wait' : ''}`}
                                onClick={() => toggleItemExclusion(item.id, !item.is_excluded)}
                                disabled={togglingItemId === item.id}
                              >
                                {item.is_excluded ? 'Excluded' : 'Included'}
                              </button>
                              {item.exclusion_reason && (
                                <span className="text-xs text-gray-500 truncate max-w-[120px]" title={item.exclusion_reason}>
                                  {item.exclusion_reason}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {formatCurrency(item.unit_cost)}
                          </td>
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">
                            {formatCurrency(item.total_cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={6} className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          Total Amount:
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatCurrency(computedTotalAmount || orderState.total_amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
            </div>
          </div>

          {/* Status History */}
          {orderState.status_history && orderState.status_history.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-primary-600" />
                  Status History
                </h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                  {orderState.status_history.map((entry, idx) => {
                    const config = getStatusConfig(entry.new_status)
                    return (
                      <div key={`${entry.changed_at}-${idx}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                            <config.icon className="w-3 h-3 mr-1" />
                            {config.label}
                          </span>
                          <div className="text-sm text-gray-600">
                            {entry.previous_status ? `from ${getStatusConfig(entry.previous_status).label}` : 'Initial status'}
                            {entry.note && (
                              <span className="ml-2 italic text-gray-500">“{entry.note}”</span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDateTime(entry.changed_at)}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Attachments */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Paperclip className="w-5 h-5 mr-2 text-primary-600" />
              Supplier Attachments
            </h3>
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="border border-dashed border-gray-300 rounded-md p-4 bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attachment File</label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => setSelectedAttachmentFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">PDF or image up to 10MB.</p>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                    <input
                      type="text"
                      value={attachmentNotes}
                      onChange={(e) => setAttachmentNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., Supplier confirmation email"
                    />
                  </div>
                  <div>
                    <Button
                      onClick={() => { void handleAttachmentUpload() }}
                      className="bg-indigo-600 hover:bg-indigo-700"
                      disabled={!selectedAttachmentFile || uploadingAttachment}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingAttachment ? 'Uploading…' : 'Upload'}
                    </Button>
                  </div>
                </div>
                {attachmentError && (
                  <p className="text-sm text-red-600 mt-3">{attachmentError}</p>
                )}
              </div>

              {loadingAttachments ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                  Loading attachments...
                </div>
              ) : attachments.length === 0 ? (
                <p className="text-sm text-gray-500">No attachments uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {attachments.map(attachment => (
                    <div
                      key={attachment.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-gray-200 rounded-md p-3"
                    >
                      <div className="flex items-start gap-3">
                        <Paperclip className="w-5 h-5 text-indigo-500 mt-1" />
                        <div>
                          <a
                            href={attachment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-primary-600 hover:underline"
                          >
                            {attachment.file_name}
                          </a>
                          <div className="text-xs text-gray-500">
                            {formatFileSize(attachment.file_size)} • {attachment.file_type || 'file'} • Uploaded {formatDateTime(attachment.uploaded_at)}
                          </div>
                          {attachment.uploaded_by_profile && (
                            <div className="text-xs text-gray-500 mt-1">
                              Added by {attachment.uploaded_by_profile.full_name || 'Admin'}
                              {attachment.uploaded_by_profile.email ? ` (${attachment.uploaded_by_profile.email})` : ''}
                            </div>
                          )}
                          {attachment.notes && (
                            <div className="text-xs text-gray-600 mt-1 italic">
                              {attachment.notes}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { void handleRemoveAttachment(attachment.id) }}
                        className="text-red-600"
                        disabled={removingAttachmentId === attachment.id}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {orderState.notes && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{orderState.notes}</p>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Created:</span> {formatDateTime(orderState.created_at)}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span> {formatDateTime(orderState.updated_at)}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end pt-6 border-t border-gray-200">
              <Button
                onClick={onClose}
                className="bg-primary-600 hover:bg-primary-700"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {orderState && (
        <InvoiceUploadModal
          isOpen={showInvoiceUploadModal}
          onClose={() => setShowInvoiceUploadModal(false)}
          onUploadComplete={handleInvoiceUploadComplete}
          suppliers={[{ id: orderState.supplier_id, name: orderState.supplier_name, is_active: true }]}
          defaultSupplierId={orderState.supplier_id}
          lockSupplier
          defaultInvoiceNumber={
            orderState.order_number
              ? `${orderState.order_number}-${(invoiceSummary.totalLinked || 0) + 1}`
              : `INV-${Date.now().toString().slice(-6)}`
          }
          defaultInvoiceDate={todayIso}
          purchaseOrderId={orderState.id}
        />
      )}

      <Modal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        title="Link Existing Invoice"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice</label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {availableInvoices.length === 0 ? (
                <option value="">No invoices available</option>
              ) : (
                availableInvoices.map(invoice => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} • {formatDate(invoice.invoice_date)}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setLinkModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => { void handleLinkInvoice() }}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!selectedInvoiceId || linkingInvoice}
            >
              {linkingInvoice ? 'Linking...' : 'Link Invoice'}
            </Button>
          </div>
        </div>
      </Modal>

      {detailsInvoice && (
        <InvoiceDetailsModal
          invoice={detailsInvoice}
          isOpen={Boolean(detailsInvoice)}
          onClose={() => setDetailsInvoice(null)}
        />
      )}

      <Modal
        isOpen={logReceiptModalOpen}
        onClose={() => {
          setLogReceiptModalOpen(false)
          resetReceiptForm()
        }}
        title="Log Receipt"
        size="lg"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleLogReceiptSubmit()
          }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
            <select
              value={receiptForm.purchase_order_item_id}
              onChange={(e) => handleReceiptItemChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={outstandingItems.length === 0}
            >
              {outstandingItems.length === 0 ? (
                <option value="">No outstanding items</option>
              ) : (
                outstandingItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.remaining} remaining)
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <input
                type="number"
                min={1}
                max={selectedOutstanding?.remaining || undefined}
                value={receiptForm.quantity}
                onChange={(e) => setReceiptForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              {selectedOutstanding && (
                <p className="text-xs text-gray-500 mt-1">Remaining: {selectedOutstanding.remaining}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (optional)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={receiptForm.weight}
                  onChange={(e) => setReceiptForm(prev => ({ ...prev, weight: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0.00"
                />
                <input
                  type="text"
                  value={receiptForm.weight_unit}
                  onChange={(e) => setReceiptForm(prev => ({ ...prev, weight_unit: e.target.value }))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="unit"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={receiptForm.notes}
              onChange={(e) => setReceiptForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Received with delivery #1234"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              onChange={(e) => handleReceiptFileChange(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-700"
            />
            {receiptForm.file && (
              <p className="text-xs text-gray-500 mt-1">Selected: {receiptForm.file.name}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setLogReceiptModalOpen(false)
                resetReceiptForm()
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-green-600 hover:bg-green-700"
              disabled={loggingReceipt || outstandingItems.length === 0}
              onClick={(event) => {
                event.preventDefault()
                void handleLogReceiptSubmit()
              }}
            >
              {loggingReceipt ? 'Logging...' : 'Log Receipt'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default PurchaseOrderViewModal
