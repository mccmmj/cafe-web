'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui'
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Phone, 
  Mail, 
  MapPin, 
  User,
  Archive,
  ArchiveRestore,
  FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import SupplierModal from './SupplierModal'
import SupplierEmailTemplateModal from './SupplierEmailTemplateModal'

export interface Supplier {
  id: string
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  payment_terms?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SuppliersManagementProps {
  onSupplierSelect?: (supplier: Supplier) => void
  showCreateButton?: boolean
}

const SuppliersManagement = ({ 
  onSupplierSelect, 
  showCreateButton = true 
}: SuppliersManagementProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [templateSupplier, setTemplateSupplier] = useState<Supplier | null>(null)
  
  const queryClient = useQueryClient()

  // Fetch suppliers
  const { 
    data: suppliersData, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['admin-suppliers-all'],
    queryFn: async () => {
      const response = await fetch('/api/admin/suppliers?includeInactive=true')
      if (!response.ok) {
        throw new Error('Failed to fetch suppliers')
      }
      return response.json()
    }
  })

  const suppliers: Supplier[] = suppliersData?.suppliers || []

  // Filter suppliers
  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         supplier.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         supplier.email?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = activeFilter === 'all' || 
                         (activeFilter === 'active' && supplier.is_active) ||
                         (activeFilter === 'inactive' && !supplier.is_active)
    
    return matchesSearch && matchesFilter
  })

  // Toggle supplier active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ supplierId, isActive }: { supplierId: string, isActive: boolean }) => {
      const response = await fetch(`/api/admin/suppliers/${supplierId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update supplier')
      }

      return response.json()
    },
    onSuccess: (_, { isActive }) => {
      toast.success(`Supplier ${isActive ? 'activated' : 'deactivated'} successfully`)
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers-all'] })
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update supplier')
    }
  })

  const handleToggleActive = (supplier: Supplier) => {
    toggleActiveMutation.mutate({
      supplierId: supplier.id,
      isActive: !supplier.is_active
    })
  }

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setEditModalOpen(true)
  }

  const handleManageTemplate = (supplier: Supplier) => {
    setTemplateSupplier(supplier)
    setTemplateModalOpen(true)
  }

  const handleCreateSupplier = () => {
    setSelectedSupplier(null)
    setCreateModalOpen(true)
  }

  const handleSupplierClick = (supplier: Supplier) => {
    if (onSupplierSelect) {
      onSupplierSelect(supplier)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading suppliers...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center text-red-600">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-medium mb-2">Failed to Load Suppliers</h3>
          <p className="text-red-500">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Suppliers Management</h2>
          <p className="text-gray-600 mt-1">Manage your supplier relationships and contact information</p>
        </div>
        {showCreateButton && (
          <Button 
            onClick={handleCreateSupplier}
            className="bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-2">
            {['all', 'active', 'inactive'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter as typeof activeFilter)}
                className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                  activeFilter === filter
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)} 
                ({filter === 'all' ? suppliers.length : 
                  filter === 'active' ? suppliers.filter(s => s.is_active).length :
                  suppliers.filter(s => !s.is_active).length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Suppliers List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredSuppliers.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || activeFilter !== 'active' 
                ? 'No suppliers found' 
                : 'No suppliers yet'
              }
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || activeFilter !== 'active'
                ? 'Try adjusting your search or filters'
                : 'Start by adding your first supplier'
              }
            </p>
            {showCreateButton && !searchQuery && activeFilter === 'active' && (
              <Button 
                onClick={handleCreateSupplier}
                className="bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Supplier
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredSuppliers.map((supplier) => (
              <div 
                key={supplier.id} 
                className={`p-6 hover:bg-gray-50 transition-colors ${
                  !supplier.is_active ? 'opacity-60' : ''
                } ${
                  onSupplierSelect ? 'cursor-pointer' : ''
                }`}
                onClick={() => handleSupplierClick(supplier)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-medium text-gray-900">{supplier.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        supplier.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {supplier.contact_person && (
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          {supplier.contact_person}
                        </div>
                      )}
                      {supplier.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          {supplier.email}
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          {supplier.phone}
                        </div>
                      )}
                      {supplier.payment_terms && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="w-4 h-4 mr-2 text-center text-xs font-bold text-gray-400">$</span>
                          Payment: {supplier.payment_terms}
                        </div>
                      )}
                    </div>
                    
                    {supplier.address && (
                      <div className="flex items-start text-sm text-gray-600 mt-2">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                        {supplier.address}
                      </div>
                    )}
                    
                    {supplier.notes && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 italic">&ldquo;{supplier.notes}&rdquo;</p>
                      </div>
                    )}
                  </div>
                  
                  {!onSupplierSelect && (
                    <div className="flex items-center gap-2 ml-4">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditSupplier(supplier)
                        }}
                        className="text-primary-600"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleManageTemplate(supplier)
                        }}
                        className="text-indigo-600"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Email Template
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleActive(supplier)
                        }}
                        className={supplier.is_active ? "text-red-600" : "text-green-600"}
                        disabled={toggleActiveMutation.isPending}
                      >
                        {supplier.is_active ? (
                          <>
                            <Archive className="w-4 h-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <ArchiveRestore className="w-4 h-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Suppliers</p>
              <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-primary-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Active Suppliers</p>
              <p className="text-2xl font-bold text-green-600">
                {suppliers.filter(s => s.is_active).length}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Inactive Suppliers</p>
              <p className="text-2xl font-bold text-gray-600">
                {suppliers.filter(s => !s.is_active).length}
              </p>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <Archive className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SupplierModal
        supplier={selectedSupplier}
        isOpen={createModalOpen || editModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          setEditModalOpen(false)
          setSelectedSupplier(null)
        }}
      />
      <SupplierEmailTemplateModal
        supplier={templateSupplier}
        isOpen={templateModalOpen}
        onClose={() => {
          setTemplateModalOpen(false)
          setTemplateSupplier(null)
        }}
      />
    </div>
  )
}

export default SuppliersManagement
