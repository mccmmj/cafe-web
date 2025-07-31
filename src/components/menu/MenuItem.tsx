'use client'

import type { MenuItem as MenuItemType, MenuItemVariation } from '@/types/menu'
import { Badge } from '@/components/ui'
import { formatPrice } from '@/lib/utils'
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
  const getSelectedVariation = (): MenuItemVariation | null => {
    if (selectedVariationId && item.variations) {
      return item.variations.find(v => v.id === selectedVariationId) || null
    }
    return item.variations?.[0] || null
  }

  const getDisplayPrice = (): number => {
    const selectedVariation = getSelectedVariation()
    if (selectedVariation) {
      return item.price + selectedVariation.priceDifference
    }
    return item.price
  }

  const selectedVariation = getSelectedVariation()

  return (
    <div className="border-b border-gray-100 pb-4 last:border-b-0">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          {item.name}
          {!item.isAvailable && (
            <Badge variant="danger" size="sm">
              Out of Stock
            </Badge>
          )}
        </h4>
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

      {item.description && (
        <p className="text-sm text-gray-600 mb-3">
          {item.description}
        </p>
      )}

      <MenuItemVariations
        variations={item.variations || []}
        itemId={item.id}
        itemPrice={item.price}
        selectedVariationId={selectedVariationId}
        onSelectVariation={onSelectVariation}
      />

      <MenuItemActions
        item={item}
        currentQuantity={currentQuantity}
        selectedVariation={selectedVariation}
        onAddToCart={onAddToCart}
        onRemoveFromCart={onRemoveFromCart}
      />
    </div>
  )
}

export default MenuItem