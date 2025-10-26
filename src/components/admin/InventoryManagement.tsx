'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Button } from '@/components/ui'
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter,
  Plus,
  RefreshCw,
  Building2,
  ClipboardList,
  Settings
} from 'lucide-react'
import toast from 'react-hot-toast'
import InventoryEditModal from './InventoryEditModal'
import RestockModal from './RestockModal'
import SuppliersManagement from './SuppliersManagement'
import SupplierModal from './SupplierModal'
import PurchaseOrdersManagement from './PurchaseOrdersManagement'
import InventorySettings from './InventorySettings'

interface InventoryItem {
  id: string
  square_item_id: string
  item_name: string
  current_stock: number
  minimum_threshold: number
  reorder_point: number
  unit_cost: number
  unit_type: string
  is_ingredient: boolean
  supplier_id?: string
  supplier_name?: string
  location: string
  notes?: string
  last_restocked_at?: string
  created_at: string
  updated_at: string
}

interface StockAlert {
  id: string
  inventory_item_id: string
  item_name: string
  alert_level: 'low' | 'critical' | 'out_of_stock'
  stock_level: number
  threshold_level: number
  is_acknowledged: boolean
  created_at: string
}

const InventoryManagement = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [stockFilter, setStockFilter] = useState('all') // all, low, critical, out_of_stock
  const [supplierFilter, setSupplierFilter] = useState('all') // all, or supplier_id
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [restockModalOpen, setRestockModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  
  const queryClient = useQueryClient()

  // Fetch inventory items
  const { 
    data: inventoryData, 
    isLoading: inventoryLoading, 
    error: inventoryError 
  } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: async () => {
      const response = await fetch('/api/admin/inventory')
      if (!response.ok) {
        throw new Error('Failed to fetch inventory')
      }
      return response.json()
    }
  })

  // Fetch stock alerts
  const { 
    data: alertsData, 
    isLoading: alertsLoading 
  } = useQuery({
    queryKey: ['admin-stock-alerts'],
    queryFn: async () => {
      const response = await fetch('/api/admin/inventory/alerts')
      if (!response.ok) {
        throw new Error('Failed to fetch stock alerts')
      }
      return response.json()
    }
  })

  // Fetch suppliers for edit modal
  const { data: suppliersData } = useQuery({
    queryKey: ['admin-suppliers'],
    queryFn: async () => {
      const response = await fetch('/api/admin/suppliers')
      if (!response.ok) {
        return { suppliers: [] } // Return empty array if suppliers API doesn't exist yet
      }
      return response.json()
    }
  })

  const inventoryItems: InventoryItem[] = inventoryData?.items || []
  const stockAlerts: StockAlert[] = alertsData?.alerts || []
  const suppliers = suppliersData?.suppliers || []

  // Modal handlers
  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item)
    setEditModalOpen(true)
  }

  const handleRestockItem = (item: InventoryItem) => {
    setSelectedItem(item)
    setRestockModalOpen(true)
  }

  const closeModals = () => {
    setEditModalOpen(false)
    setRestockModalOpen(false)
    setSelectedItem(null)
  }

  // Filter items based on search, stock level, and supplier
  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.location.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStockFilter = (() => {
      switch (stockFilter) {
        case 'low':
          return item.current_stock <= item.reorder_point && item.current_stock > item.minimum_threshold
        case 'critical':
          return item.current_stock <= item.minimum_threshold && item.current_stock > 0
        case 'out_of_stock':
          return item.current_stock === 0
        default:
          return true
      }
    })()

    const matchesSupplierFilter = supplierFilter === 'all' || item.supplier_id === supplierFilter

    return matchesSearch && matchesStockFilter && matchesSupplierFilter
  })

  // Calculate summary statistics
  const totalItems = inventoryItems.length
  const lowStockItems = inventoryItems.filter(item => 
    item.current_stock <= item.reorder_point && item.current_stock > item.minimum_threshold
  ).length
  const criticalStockItems = inventoryItems.filter(item => 
    item.current_stock <= item.minimum_threshold && item.current_stock > 0
  ).length
  const outOfStockItems = inventoryItems.filter(item => item.current_stock === 0).length
  const totalValue = inventoryItems.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0)

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock === 0) return { status: 'out_of_stock', color: 'text-red-600 bg-red-50', label: 'Out of Stock' }
    if (item.current_stock <= item.minimum_threshold) return { status: 'critical', color: 'text-red-600 bg-red-50', label: 'Critical' }
    if (item.current_stock <= item.reorder_point) return { status: 'low', color: 'text-amber-600 bg-amber-50', label: 'Low Stock' }
    return { status: 'good', color: 'text-green-600 bg-green-50', label: 'Good Stock' }
  }

  if (inventoryLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inventory data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Track stock levels, manage suppliers, and monitor inventory</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button className="bg-primary-600 hover:bg-primary-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex flex-wrap gap-4" style={{display: 'flex', flexWrap: 'wrap', gap: '1rem'}}>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex-1 min-w-48" style={{flex: '1 1 200px', minWidth: '200px'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Items</p>
              <p className="text-lg font-bold text-gray-900">{totalItems}</p>
            </div>
            <Package className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex-1 min-w-48" style={{flex: '1 1 200px', minWidth: '200px'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Low Stock</p>
              <p className="text-lg font-bold text-amber-600">{lowStockItems}</p>
            </div>
            <TrendingDown className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex-1 min-w-48" style={{flex: '1 1 200px', minWidth: '200px'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Critical</p>
              <p className="text-lg font-bold text-red-600">{criticalStockItems}</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex-1 min-w-48" style={{flex: '1 1 200px', minWidth: '200px'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Out of Stock</p>
              <p className="text-lg font-bold text-red-600">{outOfStockItems}</p>
            </div>
            <Package className="w-6 h-6 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex-1 min-w-48" style={{flex: '1 1 200px', minWidth: '200px'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Value</p>
              <p className="text-lg font-bold text-green-600">${totalValue.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full h-12">
          <TabsTrigger value="overview" className="flex items-center gap-2 flex-1">
            <Package className="w-4 h-4" />
            Stock Overview
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2 flex-1">
            <Building2 className="w-4 h-4" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2 flex-1">
            <ClipboardList className="w-4 h-4" />
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 flex-1">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex-1 min-w-48" style={{flex: '1 1 200px', minWidth: '200px'}}>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search inventory items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Supplier Filter */}
              <div className="sm:w-48">
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={supplierFilter}
                    onChange={(e) => setSupplierFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
                  >
                    <option value="all">All Suppliers</option>
                    {suppliers.map((supplier: any) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
              </div>

              {/* Stock Level Filter */}
              <div className="sm:w-48">
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
                  >
                    <option value="all">All Items</option>
                    <option value="low">Low Stock</option>
                    <option value="critical">Critical Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                  <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Stock Alerts */}
          {stockAlerts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-800">Stock Alerts</h4>
                  <p className="text-sm text-red-700 mt-1">
                    {stockAlerts.filter(alert => !alert.is_acknowledged).length} unacknowledged alerts
                  </p>
                  <div className="mt-2 space-y-1">
                    {stockAlerts.slice(0, 3).map(alert => (
                      <p key={alert.id} className="text-xs text-red-700">
                        • {alert.item_name}: {alert.stock_level} remaining (threshold: {alert.threshold_level})
                      </p>
                    ))}
                    {stockAlerts.length > 3 && (
                      <p className="text-xs text-red-700">+ {stockAlerts.length - 3} more alerts</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Items Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Inventory Items</h3>
              <p className="text-sm text-gray-600 mt-1">
                {filteredItems.length} of {totalItems} items
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory items found</h3>
                        <p className="text-gray-600 mb-4">
                          {searchQuery || stockFilter !== 'all' 
                            ? 'Try adjusting your search or filters' 
                            : 'Start by adding your first inventory item'
                          }
                        </p>
                        <Button className="bg-primary-600 hover:bg-primary-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Inventory Item
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const stockStatus = getStockStatus(item)
                      const itemValue = item.current_stock * item.unit_cost
                      
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900">{item.item_name}</p>
                                {item.is_ingredient && (
                                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                    Ingredient
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">{item.location}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {item.current_stock} {item.unit_type}
                            </div>
                            <div className="text-xs text-gray-500">
                              Min: {item.minimum_threshold} • Reorder: {item.reorder_point}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                              {stockStatus.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${item.unit_cost.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${itemValue.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.supplier_name || 'No supplier'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-primary-600"
                                onClick={() => handleEditItem(item)}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-green-600"
                                onClick={() => handleRestockItem(item)}
                              >
                                Restock
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <SuppliersManagement />
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <PurchaseOrdersManagement />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <InventorySettings />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <InventoryEditModal
        item={selectedItem}
        suppliers={suppliers}
        isOpen={editModalOpen}
        onClose={closeModals}
      />

      <RestockModal
        item={selectedItem}
        isOpen={restockModalOpen}
        onClose={closeModals}
      />
    </div>
  )
}

export default InventoryManagement