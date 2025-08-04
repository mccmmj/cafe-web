'use client'

import { Plus, Minus } from 'lucide-react'
import type { MenuItem, MenuItemVariation } from '@/types/menu'

interface MenuItemActionsProps {
  item: MenuItem
  currentQuantity: number
  selectedVariation?: MenuItemVariation | null
  onAddToCart: (itemId: string) => void
  onRemoveFromCart: (itemId: string) => void
  compact?: boolean
}

const MenuItemActions = ({
  item,
  currentQuantity,
  selectedVariation,
  onAddToCart,
  onRemoveFromCart,
  compact = false
}: MenuItemActionsProps) => {
  if (!item.isAvailable) return null

  return (
    <div className={`flex items-center ${compact ? 'gap-1' : 'gap-2'} justify-end`}>
      <button
        onClick={() => onAddToCart(item.id)}
        className={`bg-amber-600 text-white ${compact ? 'p-1' : 'p-1'} rounded-full hover:bg-amber-700 transition-colors`}
        title={`Add ${item.name}${selectedVariation ? ` (${selectedVariation.name})` : ''} to cart`}
      >
        <Plus className={compact ? "h-3 w-3" : "h-4 w-4"} />
      </button>
      
      {currentQuantity > 0 && (
        <>
          <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium min-w-[20px] text-center`}>
            {currentQuantity}
          </span>
          <button
            onClick={() => onRemoveFromCart(item.id)}
            className={`bg-gray-600 text-white ${compact ? 'p-1' : 'p-1'} rounded-full hover:bg-gray-700 transition-colors`}
            title="Remove from cart"
          >
            <Minus className={compact ? "h-3 w-3" : "h-4 w-4"} />
          </button>
        </>
      )}
    </div>
  )
}

export default MenuItemActions