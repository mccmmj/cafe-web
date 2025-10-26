'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import type { MenuCategory, MenuItem } from '@/types/menu'
import { useCartState, useAddToCart, useUpdateCartItem, useRemoveCartItem, useClearCart } from '@/hooks/useCartData'
import {
  MenuLoadingState,
  MenuErrorState,
  MenuEmptyState,
  MenuCategory as MenuCategoryComponent,
  MenuSearch
} from './index'
import MasonryGrid from './MasonryGrid'
import Button from '@/components/ui/Button'

interface MenuContainerProps {
  className?: string
  showHeader?: boolean
}

const MenuContainer = ({ className = '', showHeader = true }: MenuContainerProps) => {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearchActive, setIsSearchActive] = useState(false)

  // Global cart state
  const { cart, openCart } = useCartState()
  const addToCartMutation = useAddToCart()
  const updateCartItemMutation = useUpdateCartItem()
  const removeFromCartMutation = useRemoveCartItem()
  const clearCartMutation = useClearCart()

  // Note: selectedVariations state moved to MenuCategory level

  useEffect(() => {
    fetchMenu()
  }, [])

  // Note: Variation initialization moved to MenuCategory level

  const fetchMenu = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/menu')
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setCategories(data.categories || [])
        
        // Initialize categories - expand first few, collapse others for better UX
        const initialExpanded: Record<string, boolean> = {}
        data.categories?.forEach((category: MenuCategory, index: number) => {
          // Expand first 3 categories, collapse the rest
          initialExpanded[category.id] = index < 3
        })
        setExpandedCategories(initialExpanded)
      }
    } catch (err) {
      setError('Failed to load menu')
      console.error('Menu fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  // Note: selectVariation moved to MenuCategory level

  const getCurrentCartQuantity = (itemId: string): number => {
    if (!cart?.items) return 0
    return cart.items
      .filter(item => item.itemId === itemId)
      .reduce((sum, item) => sum + item.quantity, 0)
  }

  // Note: addToCart will need to be updated to get variation from MenuItem directly

  // Simplified add to cart handler - variation will be handled at MenuItem level  
  const handleAddToCart = async (itemId: string) => {
    try {
      // Find the item details from the current categories
      const item = categories
        .flatMap(category => category.items)
        .find(menuItem => menuItem.id === itemId)
      
      if (!item) {
        console.error('Item not found:', itemId)
        return
      }

      await addToCartMutation.mutateAsync({
        itemId: item.id,
        quantity: 1,
        itemDetails: {
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl,
          isAvailable: item.isAvailable
        }
      })
    } catch (error) {
      console.error('Failed to add item to cart:', error)
    }
  }

  const removeFromCartCurrent = async (itemId: string) => {
    try {
      // Find the cart item for this menu item
      const cartItem = cart?.items?.find(item => item.itemId === itemId)
      if (cartItem) {
        if (cartItem.quantity > 1) {
          await updateCartItemMutation.mutateAsync({
            itemId: cartItem.id,
            updates: { quantity: cartItem.quantity - 1 }
          })
        } else {
          await removeFromCartMutation.mutateAsync(cartItem.id)
        }
      }
    } catch (error) {
      console.error('Failed to remove item from cart:', error)
    }
  }

  const getCurrentQuantities = (): Record<string, number> => {
    const quantities: Record<string, number> = {}
    categories.forEach(category => {
      category.items.forEach(item => {
        quantities[item.id] = getCurrentCartQuantity(item.id)
      })
    })
    return quantities
  }

  const getTotalCartItems = (): number => {
    return cart?.itemCount || 0
  }

  const handleSearchResults = (results: any[]) => {
    setSearchResults(results)
    setIsSearchActive(results.length > 0)
  }

  // Filter categories based on search results
  const displayCategories = isSearchActive 
    ? categories.map(category => ({
        ...category,
        items: category.items.filter(item => 
          searchResults.some(result => result.item.id === item.id)
        )
      })).filter(category => category.items.length > 0)
    : categories

  if (loading) {
    return <MenuLoadingState className={className} showHeader={showHeader} />
  }

  if (error) {
    return (
      <MenuErrorState
        error={error}
        onRetry={fetchMenu}
        className={className}
        showHeader={showHeader}
      />
    )
  }

  if (categories.length === 0) {
    return <MenuEmptyState className={className} showHeader={showHeader} />
  }

  const currentQuantities = getCurrentQuantities()
  const totalItems = getTotalCartItems()
  

  return (
    <section className={showHeader ? "py-20 bg-gray-50" : "py-8 bg-gray-50"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {showHeader && (
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Menu</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Real-time menu with fresh items and current prices from our Square system.
            </p>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-8 max-w-md mx-auto">
          <MenuSearch
            categories={categories}
            onSearchResults={handleSearchResults}
          />
        </div>

        {/* Search Results Info */}
        {isSearchActive && (
          <div className="text-center mb-6">
            <p className="text-gray-600">
              Showing {searchResults.length} search result{searchResults.length === 1 ? '' : 's'}
            </p>
          </div>
        )}


        {/* Simple Grid Layout - Temporary fix for state update issue */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayCategories.map((category) => (
            <MenuCategoryComponent
              key={category.id}
              category={category}
              isExpanded={expandedCategories[category.id]}
              currentQuantities={currentQuantities}
              onToggleExpanded={toggleCategory}
              onAddToCart={handleAddToCart}
              onRemoveFromCart={removeFromCartCurrent}
            />
          ))}
        </div>

        {/* Use global cart modal instead of floating button */}
        {getTotalCartItems() > 0 && (
          <div className="fixed bottom-6 right-6 z-40">
            <Button
              onClick={openCart}
              className="bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>View Cart ({getTotalCartItems()})</span>
              </div>
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}

export default MenuContainer