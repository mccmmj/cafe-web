'use client'

import { useState } from 'react'
import type { MenuItem as MenuItemType, MenuItemVariation } from '@/types/menu'
import { Badge } from '@/components/ui'
import { formatPrice } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'
import MenuItemVariations from './MenuItemVariations'
import MenuItemActions from './MenuItemActions'
import FavoriteButton from '@/components/ui/FavoriteButton'

interface MenuItemProps {
  item: MenuItemType
  selectedVariationId?: string
  currentQuantity: number
  onSelectVariation: (itemId: string, variationId: string) => void
  onAddToCart: (itemId: string) => void
  onRemoveFromCart: (itemId: string) => void
}

const MenuItem = ({
  item,
  selectedVariationId,
  currentQuantity,
  onSelectVariation,
  onAddToCart,
  onRemoveFromCart
}: MenuItemProps) => {
  // State for collapsible description
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Only show expand/collapse if item has a description
  const hasDescription = item.description && item.description.trim().length > 0
  // Get selected variation - use selectedVariationId if provided, otherwise use first variation
  const getSelectedVariation = (): MenuItemVariation | null => {
    if (!item.variations || item.variations.length === 0) return null
    
    // If we have a selected variation ID, try to find it
    if (selectedVariationId) {
      const found = item.variations.find(v => v.id === selectedVariationId)
      if (found) return found
    }
    
    // Default to first variation
    return item.variations[0]
  }

  // Calculate display price based on selected variation
  const getDisplayPrice = (): number => {
    const selectedVariation = getSelectedVariation()
    if (selectedVariation) {
      return item.price + selectedVariation.priceDifference
    }
    return item.price
  }

  const selectedVariation = getSelectedVariation()
  

  return (
    <div className="border-b border-gray-100 pb-2 last:border-b-0">
      {/* Main item header - always visible */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          {/* Expand/collapse button for items with descriptions */}
          {hasDescription && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label={isExpanded ? 'Collapse description' : 'Expand description'}
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
            </button>
          )}
          
          {/* Item name */}
          <h4 className="font-semibold text-gray-900 flex items-center gap-2 flex-1">
            {item.name}
            {!item.isAvailable && (
              <Badge variant="danger" size="sm">
                Out of Stock
              </Badge>
            )}
          </h4>
        </div>
        
        {/* Price and favorite button */}
        <div className="flex items-center gap-2 ml-2">
          <FavoriteButton
            squareItemId={item.id}
            itemName={item.name}
            size="sm"
          />
          <span className="text-amber-600 font-bold">
            {formatPrice(getDisplayPrice())}
          </span>
        </div>
      </div>

      {/* Condensed view: variations and actions on same line */}
      {!isExpanded && (
        <div className="mt-2 flex items-center justify-between gap-4">
          <div className="flex-1">
            <MenuItemVariations
              variations={item.variations || []}
              itemId={item.id}
              itemPrice={item.price}
              selectedVariationId={selectedVariationId}
              onSelectVariation={onSelectVariation}
              compact={true}
            />
          </div>
          <div className="flex-shrink-0">
            <MenuItemActions
              item={item}
              currentQuantity={currentQuantity}
              selectedVariation={selectedVariation}
              onAddToCart={onAddToCart}
              onRemoveFromCart={onRemoveFromCart}
              compact={true}
            />
          </div>
        </div>
      )}

      {/* Expanded view: description + full layout */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {item.description && (
            <p className="text-sm text-gray-600 ml-6">
              {item.description}
            </p>
          )}
          
          <div className="ml-6">
            <MenuItemVariations
              variations={item.variations || []}
              itemId={item.id}
              itemPrice={item.price}
              selectedVariationId={selectedVariationId}
              onSelectVariation={onSelectVariation}
              compact={false}
            />
          </div>
          
          <div className="ml-6">
            <MenuItemActions
              item={item}
              currentQuantity={currentQuantity}
              selectedVariation={selectedVariation}
              onAddToCart={onAddToCart}
              onRemoveFromCart={onRemoveFromCart}
              compact={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default MenuItem