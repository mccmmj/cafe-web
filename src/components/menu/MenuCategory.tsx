'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { MenuCategory as MenuCategoryType } from '@/types/menu'
import MenuItem from './MenuItem'
import BrandIndicator from './BrandIndicator'
import { isStarbucksCategory } from '@/lib/constants/menu'

interface MenuCategoryProps {
  category: MenuCategoryType
  isExpanded: boolean
  currentQuantities: Record<string, number>
  onToggleExpanded: (categoryId: string) => void
  onAddToCart: (itemId: string) => void
  onRemoveFromCart: (itemId: string) => void
}

const MenuCategory = ({
  category,
  isExpanded,
  currentQuantities,
  onToggleExpanded,
  onAddToCart,
  onRemoveFromCart
}: MenuCategoryProps) => {
  // Local state for variations within this category
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({})

  // Initialize variations when category items change
  useEffect(() => {
    const initialVariations: Record<string, string> = {}
    category.items?.forEach((item) => {
      if (item.variations && item.variations.length > 0) {
        // Set the first variation as default
        initialVariations[item.id] = item.variations[0].id
      }
    })
    setSelectedVariations(initialVariations)
  }, [category.items])

  // Handle variation selection
  const handleSelectVariation = (itemId: string, variationId: string) => {
    setSelectedVariations(prev => ({
      ...prev,
      [itemId]: variationId
    }))
  }
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Category Header - Clickable */}
      <button
        onClick={() => onToggleExpanded(category.id)}
        className="w-full p-8 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-2xl font-semibold text-gray-900">
                {category.name}
              </h3>
              {isStarbucksCategory(category.name) && (
                <BrandIndicator brand="starbucks" size="md" position="badge" />
              )}
            </div>
            {category.description && (
              <p className="text-gray-600 text-sm">
                {category.description}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-6 w-6 text-gray-400" />
            ) : (
              <ChevronRight className="h-6 w-6 text-gray-400" />
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm text-gray-500">
          <span>
            {category.subcategories && category.subcategories.length > 0 
              ? `${category.subcategories.reduce((total, sub) => total + sub.items.length, 0)} items in ${category.subcategories.length} categories`
              : `${category.items.length} items`
            }
          </span>
          {!isExpanded && (
            <span className="ml-2">• Click to expand</span>
          )}
        </div>
      </button>
      
      {/* Category Items - Collapsible */}
      {isExpanded && (
        <div className="px-8 pb-8 space-y-6">
          {/* Render subcategories if they exist */}
          {category.subcategories && category.subcategories.length > 0 ? (
            category.subcategories.map((subcategory) => (
              <div key={subcategory.id}>
                {/* Subcategory Header */}
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-1">
                    {subcategory.name}
                  </h4>
                  {subcategory.description && (
                    <p className="text-sm text-gray-600">
                      {subcategory.description}
                    </p>
                  )}
                </div>
                
                {/* Subcategory Items */}
                <div className="space-y-4">
                  {subcategory.items.map((item) => {
                    const selectedVariationId = selectedVariations[item.id]
                    return (
                      <MenuItem
                        key={`${item.id}-${selectedVariationId || 'default'}`}
                        item={item}
                        selectedVariationId={selectedVariationId}
                        currentQuantity={currentQuantities[item.id] || 0}
                        onSelectVariation={handleSelectVariation}
                        onAddToCart={onAddToCart}
                        onRemoveFromCart={onRemoveFromCart}
                      />
                    )
                  })}
                </div>
              </div>
            ))
          ) : (
            /* Render items directly if no subcategories */
            category.items.map((item) => {
              const selectedVariationId = selectedVariations[item.id]
              return (
                <MenuItem
                  key={`${item.id}-${selectedVariationId || 'default'}`}
                  item={item}
                  selectedVariationId={selectedVariationId}
                  currentQuantity={currentQuantities[item.id] || 0}
                  onSelectVariation={handleSelectVariation}
                  onAddToCart={onAddToCart}
                  onRemoveFromCart={onRemoveFromCart}
                />
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default React.memo(MenuCategory)