'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Button } from '@/components/ui'
import { Search, RefreshCw, Plus } from 'lucide-react'
import MenuItemsList from './MenuItemsList'
import MenuItemEditModal from './MenuItemEditModal'
import MenuItemCreateModal, { type NewItemData } from './MenuItemCreateModal'
import CategoryManagement from './CategoryManagement'
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

interface CatalogCategory {
  id: string
  name?: string
  category_data?: {
    name?: string
  }
}

interface MenuManagementResponse {
  success?: boolean
  items?: MenuItem[]
  categories?: CatalogCategory[]
  total?: number
}

const MenuManagementContainer = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [creatingItem, setCreatingItem] = useState(false)
  const [view, setView] = useState<'grid' | 'table'>('table')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  
  const queryClient = useQueryClient()

  // Fetch menu items
  const { 
    data: itemsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery<MenuManagementResponse>({
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

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: async (itemData: NewItemData) => {
      const response = await fetch('/api/admin/menu/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create item')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] })
      toast.success('Menu item created successfully')
      setCreatingItem(false)
    },
    onError: (error) => {
      toast.error(`Failed to create item: ${error.message}`)
    }
  })

  const items: MenuItem[] = itemsData?.items || []
  const categories = [...new Set(items.map(item => item.categoryName))].sort()
  
  // Get category data for create modal
  const categoryOptions = itemsData?.categories?.map((cat) => ({
    id: cat.id,
    name: cat.category_data?.name || cat.name || 'Uncategorized'
  })) || []

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

  const handleSelectItem = (itemId: string, selected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(itemId)
      } else {
        newSet.delete(itemId)
      }
      return newSet
    })
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedItems(new Set(filteredItems.map(item => item.id)))
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleBulkAvailabilityFromToolbar = (isAvailable: boolean) => {
    if (selectedItems.size > 0) {
      handleBulkAvailability(Array.from(selectedItems), isAvailable)
      setSelectedItems(new Set())
    }
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
          <Button
            onClick={() => setCreatingItem(true)}
            className="bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Item
          </Button>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="items">Menu Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-6">
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

          {/* Bulk Operations Toolbar */}
          {selectedItems.size > 0 && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-primary-700">
                    {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedItems(new Set())}
                    className="text-primary-600 border-primary-300"
                  >
                    Clear Selection
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAvailabilityFromToolbar(true)}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    Make Available
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAvailabilityFromToolbar(false)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Make Unavailable
                  </Button>
                </div>
              </div>
            </div>
          )}

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
              selectedItems={selectedItems}
              onSelectItem={handleSelectItem}
              onSelectAll={handleSelectAll}
            />
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <CategoryManagement />
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      {editingItem && (
        <MenuItemEditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleUpdateItem}
          isLoading={updateItemMutation.isPending}
          categories={categoryOptions}
        />
      )}

      {/* Create Modal */}
      <MenuItemCreateModal
        isOpen={creatingItem}
        onClose={() => setCreatingItem(false)}
        onSubmit={createItemMutation.mutateAsync}
        categories={categoryOptions}
        isLoading={createItemMutation.isPending}
      />
    </div>
  )
}

export default MenuManagementContainer
