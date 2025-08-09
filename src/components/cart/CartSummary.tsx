'use client'

import { formatPrice } from '@/lib/utils'

interface CartSummaryProps {
  subtotal: number
  tax: number
  total: number
  itemCount: number
  taxInfo?: {
    name: string
    rate: number
    enabled: boolean
    error?: string
  }
}

const CartSummary = ({ subtotal, tax, total, itemCount, taxInfo }: CartSummaryProps) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Items ({itemCount})</span>
        <span className="font-medium">{formatPrice(subtotal)}</span>
      </div>
      
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 flex items-center gap-1">
          {taxInfo?.name || 'Tax'}
          {taxInfo?.enabled && taxInfo.rate > 0 && (
            <span className="text-xs text-gray-500">
              ({(taxInfo.rate * 100).toFixed(2)}%)
            </span>
          )}
          {taxInfo?.error && (
            <span className="text-xs text-red-500" title={taxInfo.error}>
              ⚠️
            </span>
          )}
        </span>
        <span className="font-medium">
          {taxInfo?.enabled === false ? (
            <span className="text-gray-500 text-xs">N/A</span>
          ) : (
            formatPrice(tax)
          )}
        </span>
      </div>
      
      <div className="border-t border-gray-200 pt-2">
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span className="text-primary-600">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  )
}

export default CartSummary