'use client'

import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui'

interface CartEmptyStateProps {
  onContinueShopping: () => void
}

const CartEmptyState = ({ onContinueShopping }: CartEmptyStateProps) => {
  return (
    <div className="text-center py-12">
      <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
      <p className="text-gray-500 mb-6">Add some delicious items from our menu!</p>
      <Button onClick={onContinueShopping}>
        Continue Shopping
      </Button>
    </div>
  )
}

export default CartEmptyState