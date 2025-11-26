import { useMemo } from 'react'

interface CostCalculatorProps {
  packSize: number
  packPrice: number
  onUnitCost: (unitCost: number) => void
}

export function CostCalculator({ packSize, packPrice, onUnitCost }: CostCalculatorProps) {
  const unitCost = useMemo(() => {
    const size = Number(packSize) || 1
    const price = Number(packPrice) || 0
    if (!Number.isFinite(size) || size <= 0) return 0
    return price / size
  }, [packSize, packPrice])

  return (
    <div className="text-xs text-gray-700 space-y-1">
      <div>Pack size: {packSize || 1}</div>
      <div>Pack cost: ${Number(packPrice || 0).toFixed(2)}</div>
      <div>Unit cost (pack ÷ size): ${unitCost.toFixed(2)}</div>
      <button
        type="button"
        className="text-indigo-600 underline"
        onClick={() => onUnitCost(Number(unitCost.toFixed(2)))}
      >
        Apply unit cost
      </button>
    </div>
  )
}
