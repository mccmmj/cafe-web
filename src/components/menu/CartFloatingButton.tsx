'use client'

import { ShoppingCart } from 'lucide-react'

interface CartFloatingButtonProps {
  totalItems: number
  onClick: () => void
}

const CartFloatingButton = ({ totalItems, onClick }: CartFloatingButtonProps) => {
  if (totalItems === 0) return null

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-colors z-40"
      title="View Cart"
    >
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-6 w-6" />
        <span className="font-bold">
          {totalItems}
        </span>
      </div>
    </button>
  )
}

export default CartFloatingButton