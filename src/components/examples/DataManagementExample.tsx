'use client'

import React, { useState } from 'react'
import { useMenuCategories, useMenuItem, useMenuSearch } from '@/hooks/useMenuData'
import { useCartState, useAddToCart } from '@/hooks/useCartData'
import { useOptimisticCart } from '@/hooks/useOptimisticCart'
import { useCreateOrder } from '@/hooks/useOrderData'
import { useErrorHandling } from '@/hooks/useErrorHandling'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'

// Example component demonstrating the data management system
const DataManagementExample: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItemId, setSelectedItemId] = useState('')

  // Data fetching hooks
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useMenuCategories()
  const { data: selectedItem, isLoading: itemLoading } = useMenuItem(selectedItemId)
  const { data: searchResults, isLoading: searchLoading } = useMenuSearch({ 
    query: searchQuery,
    sortBy: 'name',
    sortOrder: 'asc'
  })

  // Cart management hooks
  const { cart, isLoading: cartLoading, openCart, itemCount, total } = useCartState()
  const addToCartMutation = useAddToCart()
  const optimisticCart = useOptimisticCart()

  // Order management
  const createOrderMutation = useCreateOrder()

  // Error handling
  const { handleError, isOnline } = useErrorHandling()

  // Event handlers
  const handleAddToCart = async (itemId: string) => {
    try {
      // Get item details first
      const response = await fetch(`/api/menu/items/${itemId}`)
      if (!response.ok) throw new Error('Failed to fetch item details')
      const itemDetails = await response.json()

      // Use optimistic updates for better UX
      await optimisticCart.addToCart.mutateAsync({
        itemId,
        quantity: 1,
        itemDetails,
      })
    } catch (error) {
      handleError(error, 'Add to Cart')
    }
  }

  const handleCreateOrder = async () => {
    if (!cart || cart.items.length === 0) return

    try {
      const orderData = {
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        orderType: 'pickup' as const,
        tipAmount: 0,
        items: cart.items.map(item => ({
          squareItemId: item.itemId,
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.totalPrice,
        })),
      }

      await createOrderMutation.mutateAsync(orderData)
      
      // Clear cart after successful order
      await optimisticCart.clearCart.mutateAsync()
    } catch (error) {
      handleError(error, 'Create Order')
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  if (!isOnline) {
    return (
      <div className="p-6 text-center">
        <Badge variant="warning" size="lg">
          Offline Mode
        </Badge>
        <p className="mt-2 text-text-secondary">
          You're currently offline. Some features may not be available.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Data Management Example
        </h1>
        <p className="text-text-secondary">
          Demonstrating React Query, Zod validation, optimistic updates, and error handling
        </p>
      </div>

      {/* Cart Status */}
      <div className="bg-surface-secondary p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Cart Status</h3>
            <p className="text-sm text-text-secondary">
              {cartLoading ? 'Loading...' : `${itemCount} items • $${total?.toFixed(2) || '0.00'}`}
            </p>
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={openCart} disabled={cartLoading}>
              View Cart
            </Button>
            <Button 
              variant="primary" 
              onClick={handleCreateOrder}
              disabled={!cart?.items.length || createOrderMutation.isPending}
              isLoading={createOrderMutation.isPending}
            >
              Create Order
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Search Menu Items</h3>
        <Input
          placeholder="Search for items..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-md"
        />
        
        {searchLoading && <p className="text-text-secondary">Searching...</p>}
        
        {searchResults && searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((item) => (
              <div key={item.id} className="border border-border-primary rounded-lg p-4">
                <h4 className="font-medium">{item.name}</h4>
                <p className="text-sm text-text-secondary mb-2">{item.description}</p>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">${item.price.toFixed(2)}</span>
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(item.id)}
                    disabled={addToCartMutation.isPending || optimisticCart.addToCart.isPending}
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Menu Categories */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Menu Categories</h3>
        
        {categoriesLoading && <p className="text-text-secondary">Loading categories...</p>}
        
        {categoriesError && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <p className="text-error-800">Failed to load categories. Please try again.</p>
          </div>
        )}
        
        {categories && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="border border-border-primary rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{category.name}</h4>
                  <Badge variant="secondary" size="sm">
                    {category.items.length} items
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {category.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="text-sm text-text-secondary ml-2">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                  
                  {category.items.length > 3 && (
                    <p className="text-sm text-text-secondary">
                      +{category.items.length - 3} more items
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Item Details */}
      {selectedItemId && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Selected Item</h3>
          
          {itemLoading && <p className="text-text-secondary">Loading item details...</p>}
          
          {selectedItem && (
            <div className="border border-border-primary rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-2">{selectedItem.name}</h4>
                  <p className="text-text-secondary mb-4">{selectedItem.description}</p>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-2xl font-bold text-primary-600">
                      ${selectedItem.price.toFixed(2)}
                    </span>
                    <Badge 
                      variant={selectedItem.isAvailable ? 'success' : 'danger'}
                      size="sm"
                    >
                      {selectedItem.isAvailable ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>

                  {selectedItem.allergens && selectedItem.allergens.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-1">Allergens:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedItem.allergens.map((allergen) => (
                          <Badge key={allergen} variant="warning" size="xs">
                            {allergen}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <Button
                  variant="primary"
                  onClick={() => handleAddToCart(selectedItem.id)}
                  disabled={!selectedItem.isAvailable || optimisticCart.addToCart.isPending}
                  isLoading={optimisticCart.addToCart.isPending}
                >
                  Add to Cart
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Management Features */}
      <div className="bg-surface-tertiary p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Data Management Features Demonstrated</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-primary-600 mb-2">✅ React Query Integration</h4>
            <ul className="space-y-1 text-text-secondary">
              <li>• Automatic caching and background refetching</li>
              <li>• Stale-while-revalidate patterns</li>
              <li>• Parallel and dependent queries</li>
              <li>• Query invalidation and updates</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-primary-600 mb-2">✅ Zod Validation</h4>
            <ul className="space-y-1 text-text-secondary">
              <li>• Type-safe data validation</li>
              <li>• Runtime schema validation</li>
              <li>• Automatic TypeScript types</li>
              <li>• Detailed error messages</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-primary-600 mb-2">✅ Optimistic Updates</h4>
            <ul className="space-y-1 text-text-secondary">
              <li>• Immediate UI feedback</li>
              <li>• Automatic rollback on errors</li>
              <li>• Undo functionality</li>
              <li>• Seamless user experience</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-primary-600 mb-2">✅ Error Handling</h4>
            <ul className="space-y-1 text-text-secondary">
              <li>• Automatic retry logic</li>
              <li>• Network error detection</li>
              <li>• User-friendly error messages</li>
              <li>• Offline/online handling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataManagementExample