'use client'

import type { MenuItemVariation } from '@/types/menu'
import { formatPrice } from '@/lib/utils'

interface MenuItemVariationsProps {
  variations: MenuItemVariation[]
  itemId: string
  itemPrice: number
  selectedVariationId?: string
  onSelectVariation: (itemId: string, variationId: string) => void
}

const MenuItemVariations = ({
  variations,
  itemId,
  itemPrice,
  selectedVariationId,
  onSelectVariation
}: MenuItemVariationsProps) => {
  if (!variations || variations.length === 0) return null

  if (variations.length === 1) {
    return (
      <div className="mb-3">
        <p className="text-xs text-gray-500">
          {variations[0].name} • {formatPrice(itemPrice + variations[0].priceDifference)}
        </p>
      </div>
    )
  }

  return (
    <div className="mb-3">
      <p className="text-xs font-medium text-gray-700 mb-2">Size Options:</p>
      <div className="flex flex-wrap gap-2">
        {variations.map((variation) => {
          const variationPrice = itemPrice + variation.priceDifference
          const isSelected = selectedVariationId === variation.id
          
          return (
            <button
              key={variation.id}
              onClick={() => onSelectVariation(itemId, variation.id)}
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
  )
}

export default MenuItemVariations