'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Button } from '@/components/ui'
import { Search, Filter, RefreshCw, Plus } from 'lucide-react'
import MenuItemsList from './MenuItemsList'
import MenuItemEditModal from './MenuItemEditModal'
import toast from 'react-hot-toast'

interface MenuItem {
  id: string
  name: string
  description: string
  categoryId?: string
  categoryName: string
  isAvailable: boolean
  variations: Array<{
    id: string
    name: string
    price: number
    currency: string
    isDefault: boolean
  }>
  imageUrl?: string
  ordinal: number
  lastUpdated: string
  version: number
}

interface UpdateItemData {
  name?: string
  description?: string
  isAvailable?: boolean
  variations?: Array<{
    id: string
    name: string
    price: number
  }>
}

const MenuManagementContainer = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [view, setView] = useState<'grid' | 'table'>('table')
  
  const queryClient = useQueryClient()

  // Fetch menu items
  const { 
    data: itemsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['admin-menu-items'],
    queryFn: async () => {
      const response = await fetch('/api/admin/menu/items')
      if (!response.ok) {
        throw new Error('Failed to fetch menu items')
      }
      return response.json()
    }
  })

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, updateData }: { itemId: string; updateData: UpdateItemData }) => {
      const response = await fetch(`/api/admin/menu/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update item')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] })
      toast.success('Menu item updated successfully')
      setEditingItem(null)
    },
    onError: (error) => {
      toast.error(`Failed to update item: ${error.message}`)
    }
  })

  // Bulk availability mutation
  const bulkAvailabilityMutation = useMutation({
    mutationFn: async ({ itemIds, isAvailable }: { itemIds: string[]; isAvailable: boolean }) => {
      const response = await fetch('/api/admin/menu/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds, isAvailable })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update availability')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] })
      toast.success(data.message)
    },
    onError: (error) => {
      toast.error(`Failed to update availability: ${error.message}`)
    }
  })

  const items: MenuItem[] = itemsData?.items || []
  const categories = [...new Set(items.map(item => item.categoryName))].sort()

  // Filter items based on search and category
  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || item.categoryName === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item)
  }

  const handleUpdateItem = (updateData: UpdateItemData) => {
    if (editingItem) {
      updateItemMutation.mutate({ itemId: editingItem.id, updateData })
    }
  }

  const handleToggleAvailability = (itemId: string, isAvailable: boolean) => {
    bulkAvailabilityMutation.mutate({ itemIds: [itemId], isAvailable })
  }

  const handleBulkAvailability = (itemIds: string[], isAvailable: boolean) => {
    bulkAvailabilityMutation.mutate({ itemIds, isAvailable })
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Failed to load menu items</div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-600 mt-1">
            Manage menu items, pricing, and availability
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => refetch()}
            variant="outline"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="sm:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('table')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                view === 'table' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                view === 'grid' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Grid
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <span>
            Showing {filteredItems.length} of {items.length} items
            {selectedCategory !== 'all' && ` in ${selectedCategory}`}
          </span>
          <span>
            {filteredItems.filter(item => item.isAvailable).length} available, {' '}
            {filteredItems.filter(item => !item.isAvailable).length} unavailable
          </span>
        </div>
      </div>

      {/* Menu Items Display */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <MenuItemsList
          items={filteredItems}
          view={view}
          isLoading={isLoading}
          onEditItem={handleEditItem}
          onToggleAvailability={handleToggleAvailability}
          onBulkAvailability={handleBulkAvailability}
          isUpdating={updateItemMutation.isPending || bulkAvailabilityMutation.isPending}
        />
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <MenuItemEditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleUpdateItem}
          isLoading={updateItemMutation.isPending}
        />
      )}
    </div>
  )
}

export default MenuManagementContainer