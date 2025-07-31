'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import type { MenuCategory as MenuCategoryType } from '@/types/menu'
import MenuItem from './MenuItem'

interface MenuCategoryProps {
  category: MenuCategoryType
  isExpanded: boolean
  selectedVariations: Record<string, string>
  currentQuantities: Record<string, number>
  onToggleExpanded: (categoryId: string) => void
  onSelectVariation: (itemId: string, variationId: string) => void
  onAddToCart: (itemId: string) => void
  onRemoveFromCart: (itemId: string) => void
}

const MenuCategory = ({
  category,
  isExpanded,
  selectedVariations,
  currentQuantities,
  onToggleExpanded,
  onSelectVariation,
  onAddToCart,
  onRemoveFromCart
}: MenuCategoryProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Category Header - Clickable */}
      <button
        onClick={() => onToggleExpanded(category.id)}
        className="w-full p-8 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-inset"
        aria-expanded={isExpanded}
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
            {isExpanded ? (
              <ChevronDown className="h-6 w-6 text-gray-400" />
            ) : (
              <ChevronRight className="h-6 w-6 text-gray-400" />
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm text-gray-500">
          <span>{category.items.length} items</span>
          {!isExpanded && (
            <span className="ml-2">• Click to expand</span>
          )}
        </div>
      </button>
      
      {/* Category Items - Collapsible */}
      {isExpanded && (
        <div className="px-8 pb-8 space-y-4">
          {category.items.map((item) => (
            <MenuItem
              key={item.id}
              item={item}
              selectedVariationId={selectedVariations[item.id]}
              currentQuantity={currentQuantities[item.id] || 0}
              onSelectVariation={onSelectVariation}
              onAddToCart={onAddToCart}
              onRemoveFromCart={onRemoveFromCart}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default MenuCategory