'use client'

import { useState, useEffect } from 'react'
import { Upload, FileText, Clock, CheckCircle, AlertCircle, Plus, Eye } from 'lucide-react'
import { Invoice } from '@/types/invoice'
import { InvoiceReviewInterface } from './InvoiceReviewInterface'
import { InvoiceUploadModal } from './InvoiceUploadModal'
import { InvoiceDetailsModal } from './InvoiceDetailsModal'

interface Supplier {
  id: string
  name: string
  is_active: boolean
}

interface InvoicesListProps {
  invoices: Invoice[]
  loading: boolean
  parsing: string | null
  onReviewInvoice: (invoice: Invoice) => void
  onParseInvoice: (invoiceId: string) => void
  onViewDetails: (invoice: Invoice) => void
}

function InvoicesList({ invoices, loading, parsing, onReviewInvoice, onParseInvoice, onViewDetails }: InvoicesListProps) {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by uploading your first invoice.
        </p>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Upload className="w-4 h-4 text-blue-500" />
      case 'parsing':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'parsed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'reviewing':
        return <Clock className="w-4 h-4 text-orange-500" />
      case 'matched':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'Uploaded'
      case 'parsing':
        return 'Parsing...'
      case 'parsed':
        return 'Parsed'
      case 'reviewing':
        return 'Under Review'
      case 'matched':
        return 'Matched'
      case 'confirmed':
        return 'Confirmed'
      case 'error':
        return 'Error'
      default:
        return status
    }
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {invoices.map((invoice) => (
          <li key={invoice.id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {getStatusIcon(invoice.status)}
                </div>
                <div className="ml-4">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-900">
                      {invoice.invoice_number}
                    </p>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {getStatusText(invoice.status)}
                    </span>
                  </div>
                  <div className="flex items-center mt-1 text-sm text-gray-500">
                    <span>{invoice.suppliers?.name || 'Unknown Supplier'}</span>
                    <span className="mx-1">•</span>
                    <span>{new Date(invoice.invoice_date).toLocaleDateString()}</span>
                    <span className="mx-1">•</span>
                    <span>
                      {invoice.total_amount > 0 
                        ? `$${invoice.total_amount.toFixed(2)}` 
                        : 'Pending'
                      }
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {invoice.parsing_confidence && (
                  <div className="text-sm text-gray-500">
                    {Math.round(invoice.parsing_confidence * 100)}% confidence
                  </div>
                )}
                {['uploaded', 'error'].includes(invoice.status) && (
                  <button 
                    onClick={() => onParseInvoice(invoice.id)}
                    disabled={parsing === invoice.id}
                    className={`text-sm disabled:opacity-50 ${
                      invoice.status === 'error' 
                        ? 'text-orange-600 hover:text-orange-900' 
                        : 'text-green-600 hover:text-green-900'
                    }`}
                  >
                    {parsing === invoice.id 
                      ? 'Parsing...' 
                      : invoice.status === 'error' 
                        ? 'Retry Parse' 
                        : 'Parse with AI'
                    }
                  </button>
                )}
                {['parsed', 'reviewing', 'matched'].includes(invoice.status) && (
                  <button 
                    onClick={() => onReviewInvoice(invoice)}
                    className="text-sm text-blue-600 hover:text-blue-900"
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    Review Matches
                  </button>
                )}
                <button 
                  onClick={() => onViewDetails(invoice)}
                  className="text-sm text-indigo-600 hover:text-indigo-900"
                >
                  View Details
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function InvoiceManagement() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [parsing, setParsing] = useState<string | null>(null) // Invoice ID being parsed
  const [testingAI, setTestingAI] = useState(false)
  const [testingMatching, setTestingMatching] = useState(false)
  const [reviewingInvoice, setReviewingInvoice] = useState<Invoice | null>(null)
  const [detailsInvoice, setDetailsInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    fetchInvoices()
    fetchSuppliers()
  }, [])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/invoices')
      const result = await response.json()
      
      if (result.success) {
        setInvoices(result.data)
      } else {
        console.error('Failed to fetch invoices:', result.error)
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/admin/suppliers')
      const result = await response.json()
      
      if (result.success) {
        setSuppliers(result.suppliers || [])
      } else {
        console.error('Failed to fetch suppliers:', result.error)
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  const parseInvoice = async (invoiceId: string) => {
    try {
      setParsing(invoiceId)
      console.log('🤖 Starting AI parsing for invoice:', invoiceId)
      
      const response = await fetch(`/api/admin/invoices/${invoiceId}/parse`, {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Invoice parsed successfully:', result.parsing_stats)
        // Refresh the invoices list to show updated status
        await fetchInvoices()
        
        // Show success message (you could use a toast library here)
        alert(`Invoice parsed successfully! Extracted ${result.parsing_stats?.line_items_extracted || 0} line items with ${Math.round((result.parsing_stats?.confidence || 0) * 100)}% confidence.`)
      } else {
        console.error('Parsing failed:', result.error)
        alert(`Parsing failed: ${result.error}`)
        await fetchInvoices() // Refresh to show error status
      }
    } catch (error) {
      console.error('Error parsing invoice:', error)
      alert('Failed to parse invoice. Please try again.')
    } finally {
      setParsing(null)
    }
  }

  const testAIService = async () => {
    try {
      setTestingAI(true)
      console.log('🧪 Testing AI service...')
      
      const response = await fetch('/api/admin/invoices/test-ai', {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('✅ AI Service Test Passed!\n\n' + JSON.stringify(result.results, null, 2))
      } else {
        alert('❌ AI Service Test Failed!\n\n' + JSON.stringify(result.results, null, 2))
      }
    } catch (error) {
      console.error('Error testing AI service:', error)
      alert('Failed to test AI service')
    } finally {
      setTestingAI(false)
    }
  }

  const testMatchingEngine = async () => {
    try {
      setTestingMatching(true)
      console.log('🧪 Testing matching engine...')
      
      const response = await fetch('/api/admin/invoices/test-matching', {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('✅ Matching Engine Test Passed!\n\n' + JSON.stringify(result.results, null, 2))
      } else {
        alert('❌ Matching Engine Test Failed!\n\n' + JSON.stringify(result.results, null, 2))
      }
    } catch (error) {
      console.error('Error testing matching engine:', error)
      alert('Failed to test matching engine')
    } finally {
      setTestingMatching(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice Import</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload and process supplier invoices with AI-powered parsing and order matching.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={testAIService}
            disabled={testingAI}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {testingAI ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <AlertCircle className="w-4 h-4 mr-2" />
            )}
            Test AI
          </button>
          <button
            onClick={testMatchingEngine}
            disabled={testingMatching}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {testingMatching ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Test Matching
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Invoice
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Invoices
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {invoices.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Review
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {invoices.filter(inv => ['uploaded', 'parsing', 'parsed', 'reviewing'].includes(inv.status)).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Confirmed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {(() => {
                      const confirmedInvoices = invoices.filter(inv => inv.status === 'confirmed')
                      console.log('DEBUG - All invoice statuses:', invoices.map(inv => ({ id: inv.id, status: inv.status, number: inv.invoice_number })))
                      console.log('DEBUG - Confirmed invoices:', confirmedInvoices.length, confirmedInvoices.map(inv => ({ id: inv.id, status: inv.status })))
                      return confirmedInvoices.length
                    })()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Errors
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {invoices.filter(inv => inv.status === 'error').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <InvoicesList 
        invoices={invoices} 
        loading={loading} 
        parsing={parsing}
        onReviewInvoice={setReviewingInvoice}
        onParseInvoice={parseInvoice}
        onViewDetails={setDetailsInvoice}
      />

      {/* Upload Modal */}
      <InvoiceUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={fetchInvoices}
        suppliers={suppliers}
      />

      {/* Review Interface */}
      {reviewingInvoice && (
        <InvoiceReviewInterface
          invoice={reviewingInvoice}
          onClose={() => setReviewingInvoice(null)}
          onConfirm={() => {
            setReviewingInvoice(null)
            fetchInvoices() // Refresh the list
          }}
        />
      )}

      {/* Details Modal */}
      {detailsInvoice && (
        <InvoiceDetailsModal
          invoice={detailsInvoice}
          isOpen={!!detailsInvoice}
          onClose={() => setDetailsInvoice(null)}
        />
      )}
    </div>
  )
}