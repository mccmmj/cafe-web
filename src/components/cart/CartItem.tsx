'use client'

import { Plus, Minus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { formatPrice } from '@/lib/utils'

export interface CartItemData {
  id: string
  name: string
  price: number
  quantity: number
  variationId?: string
  variationName?: string
  variationPrice?: number
}

interface CartItemProps {
  item: CartItemData
  onUpdateQuantity: (cartKey: string, quantity: number) => void
  onRemoveItem: (cartKey: string) => void
}

const CartItem = ({ item, onUpdateQuantity, onRemoveItem }: CartItemProps) => {
  const displayPrice = item.variationPrice || item.price
  const itemTotal = displayPrice * item.quantity

  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-200 last:border-b-0">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{item.name}</h4>
        {item.variationName && (
          <p className="text-sm text-gray-500">{item.variationName}</p>
        )}
        <p className="text-sm font-medium text-amber-600">
          {formatPrice(displayPrice)} each
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          className="h-8 w-8 p-0"
        >
          <Minus className="h-3 w-3" />
        </Button>
        
        <span className="w-8 text-center text-sm font-medium">
          {item.quantity}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          className="h-8 w-8 p-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="text-right">
        <p className="font-medium text-gray-900">
          {formatPrice(itemTotal)}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemoveItem(item.id)}
          className="text-red-600 hover:text-red-700 p-1 h-auto"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default CartItem