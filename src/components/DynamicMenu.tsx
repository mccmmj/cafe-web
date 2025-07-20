'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Plus, Minus, ChevronDown, ChevronRight } from 'lucide-react'
import type { MenuCategory, MenuItem } from '@/types/menu'
import CartModal from './CartModal'

interface DynamicMenuProps {
  className?: string
  id?: string
}

export default function DynamicMenu({ className = '', id }: DynamicMenuProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // New cart structure: cartKey -> { itemId, variationId, quantity }
  const [cart, setCart] = useState<Record<string, { itemId: string; variationId?: string; quantity: number }>>({})
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({})
  const [isCartModalOpen, setIsCartModalOpen] = useState(false)

  useEffect(() => {
    fetchMenu()
    loadCartFromStorage()
  }, [])

  // Save cart to localStorage whenever cart changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cafe-cart', JSON.stringify(cart))
      localStorage.setItem('cafe-selected-variations', JSON.stringify(selectedVariations))
    }
  }, [cart, selectedVariations])

  const loadCartFromStorage = () => {
    if (typeof window !== 'undefined') {
      try {
        const savedCart = localStorage.getItem('cafe-cart')
        const savedVariations = localStorage.getItem('cafe-selected-variations')
        
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart)
          // Check if old cart format (number values) and convert to new format
          const convertedCart: Record<string, { itemId: string; variationId?: string; quantity: number }> = {}
          
          Object.entries(parsedCart).forEach(([key, value]) => {
            if (typeof value === 'number') {
              // Old format: convert to new format
              convertedCart[key] = { itemId: key, quantity: value }
            } else {
              // New format: use as is
              convertedCart[key] = value as { itemId: string; variationId?: string; quantity: number }
            }
          })
          
          setCart(convertedCart)
        }
        
        if (savedVariations) {
          const parsedVariations = JSON.parse(savedVariations)
          setSelectedVariations(parsedVariations)
        }
      } catch (error) {
        console.error('Error loading cart from storage:', error)
      }
    }
  }

  // Helper function to create cart keys
  const createCartKey = (itemId: string, variationId?: string) => {
    return variationId ? `${itemId}-${variationId}` : itemId
  }

  // Helper function to get current cart quantity for item with selected variation
  const getCurrentCartQuantity = (itemId: string) => {
    const variationId = selectedVariations[itemId]
    const cartKey = createCartKey(itemId, variationId)
    return cart[cartKey]?.quantity || 0
  }

  // Helper function to remove from cart using current selection
  const removeFromCartCurrent = (itemId: string) => {
    const variationId = selectedVariations[itemId]
    const cartKey = createCartKey(itemId, variationId)
    removeFromCart(cartKey)
  }

  const fetchMenu = async () => {
    try {
      const response = await fetch('/api/menu')
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setCategories(data.categories || [])
        // Initialize all categories as expanded by default
        const initialExpanded: Record<string, boolean> = {}
        data.categories?.forEach((category: MenuCategory) => {
          initialExpanded[category.id] = true
        })
        setExpandedCategories(initialExpanded)

        // Initialize default variations (first variation for each item)
        const initialVariations: Record<string, string> = {}
        data.categories?.forEach((category: MenuCategory) => {
          category.items?.forEach((item: MenuItem) => {
            if (item.variations && item.variations.length > 0) {
              initialVariations[item.id] = item.variations[0].id
            }
          })
        })
        setSelectedVariations(initialVariations)
        
        // Debug logging removed - category associations working correctly
        // console.log('Debug info from API:', data.debug)
        // console.log('Categories received:', data.categories?.map((c: any) => ({ id: c.id, name: c.name, itemCount: c.items?.length })))
      }
    } catch (err) {
      setError('Failed to load menu')
      console.error('Menu fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (itemId: string) => {
    const variationId = selectedVariations[itemId]
    const cartKey = createCartKey(itemId, variationId)
    
    setCart(prev => {
      const existing = prev[cartKey]
      if (existing) {
        return {
          ...prev,
          [cartKey]: { ...existing, quantity: existing.quantity + 1 }
        }
      } else {
        return {
          ...prev,
          [cartKey]: { itemId, variationId, quantity: 1 }
        }
      }
    })
  }

  const removeFromCart = (cartKey: string) => {
    setCart(prev => {
      const newCart = { ...prev }
      const existing = newCart[cartKey]
      if (existing && existing.quantity > 1) {
        newCart[cartKey] = { ...existing, quantity: existing.quantity - 1 }
      } else {
        delete newCart[cartKey]
      }
      return newCart
    })
  }

  const updateCartQuantity = (cartKey: string, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromCart(cartKey)
    } else {
      setCart(prev => {
        const existing = prev[cartKey]
        if (existing) {
          return {
            ...prev,
            [cartKey]: { ...existing, quantity }
          }
        }
        return prev
      })
    }
  }

  const removeItemFromCart = (cartKey: string) => {
    setCart(prev => {
      const newCart = { ...prev }
      delete newCart[cartKey]
      return newCart
    })
  }

  const clearCart = () => {
    setCart({})
    setSelectedVariations({})
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cafe-cart')
      localStorage.removeItem('cafe-selected-variations')
    }
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`
  }

  const getSelectedVariation = (itemId: string, item: MenuItem) => {
    const selectedId = selectedVariations[itemId]
    if (selectedId && item.variations) {
      return item.variations.find(v => v.id === selectedId)
    }
    // Default to first variation or base item
    return item.variations?.[0] || null
  }

  const getItemDisplayPrice = (item: MenuItem) => {
    const selectedVariation = getSelectedVariation(item.id, item)
    if (selectedVariation) {
      return item.price + selectedVariation.priceDifference
    }
    return item.price
  }

  const selectVariation = (itemId: string, variationId: string) => {
    setSelectedVariations(prev => ({
      ...prev,
      [itemId]: variationId
    }))
  }

  if (loading) {
    return (
      <section id={id} className={"py-20 bg-gray-50 " + className}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Menu</h2>
            <p className="text-xl text-gray-600">Loading fresh menu items...</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-lg animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-6"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section id={id} className={"py-20 bg-gray-50 " + className}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Menu Temporarily Unavailable</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={fetchMenu}
              className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    )
  }

  if (categories.length === 0) {
    return (
      <section id={id} className={"py-20 bg-gray-50 " + className}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Menu Coming Soon</h3>
            <p className="text-gray-600">We're updating our menu. Please check back soon!</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Menu</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Real-time menu with fresh items and current prices from our Square system.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Category Header - Clickable */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full p-8 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-inset"
                aria-expanded={expandedCategories[category.id]}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-gray-600 text-sm">
                        {category.description}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {expandedCategories[category.id] ? (
                      <ChevronDown className="h-6 w-6 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-gray-500">
                  <span>{category.items.length} items</span>
                  {!expandedCategories[category.id] && (
                    <span className="ml-2">• Click to expand</span>
                  )}
                </div>
              </button>
              
              {/* Category Items - Collapsible */}
              {expandedCategories[category.id] && (
                <div className="px-8 pb-8 space-y-4">
                {category.items.map((item) => (
                  <div key={item.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        {item.name}
                        {!item.isAvailable && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                            Out of Stock
                          </span>
                        )}
                      </h4>
                      <span className="text-amber-600 font-bold ml-2">
                        {formatPrice(getItemDisplayPrice(item))}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {item.description}
                      </p>
                    )}

                    {/* Enhanced Variations Display */}
                    {item.variations && item.variations.length > 1 ? (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">Size Options:</p>
                        <div className="flex flex-wrap gap-2">
                          {item.variations.map((variation) => {
                            const variationPrice = item.price + variation.priceDifference
                            const isSelected = selectedVariations[item.id] === variation.id
                            
                            return (
                              <button
                                key={variation.id}
                                onClick={() => selectVariation(item.id, variation.id)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                  isSelected
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-amber-100 hover:text-amber-700'
                                }`}
                              >
                                {variation.name} • {formatPrice(variationPrice)}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : item.variations && item.variations.length === 1 ? (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500">
                          {item.variations[0].name} • {formatPrice(item.price + item.variations[0].priceDifference)}
                        </p>
                      </div>
                    ) : null}

                    {item.isAvailable && (
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => addToCart(item.id)}
                          className="bg-amber-600 text-white p-1 rounded-full hover:bg-amber-700 transition-colors"
                          title={`Add ${item.name}${getSelectedVariation(item.id, item) ? ` (${getSelectedVariation(item.id, item)?.name})` : ''} to cart`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        
                        {getCurrentCartQuantity(item.id) > 0 && (
                          <>
                            <span className="text-sm font-medium min-w-[20px] text-center">
                              {getCurrentCartQuantity(item.id)}
                            </span>
                            <button
                              onClick={() => removeFromCartCurrent(item.id)}
                              className="bg-gray-600 text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                              title="Remove from cart"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {Object.keys(cart).length > 0 && (
          <button
            onClick={() => setIsCartModalOpen(true)}
            className="fixed bottom-6 right-6 bg-amber-600 text-white p-4 rounded-full shadow-lg hover:bg-amber-700 transition-colors"
            title="View Cart"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              <span className="font-bold">
                {Object.values(cart).reduce((sum, cartItem) => sum + cartItem.quantity, 0)}
              </span>
            </div>
          </button>
        )}

        {/* Cart Modal */}
        <CartModal
          isOpen={isCartModalOpen}
          onClose={() => setIsCartModalOpen(false)}
          cart={cart}
          categories={categories}
          selectedVariations={selectedVariations}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeItemFromCart}
          onClearCart={clearCart}
        />
      </div>
    </section>
  )
}