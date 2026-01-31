/**
 * KDS Size Column Header
 * Displays the column headers for Tall/Grande/Venti pricing
 */

import { getSizeColumns } from '@/lib/kds/group-items'

interface KDSSizeHeaderProps {
  animate?: boolean
}

export default function KDSSizeHeader({ animate = true }: KDSSizeHeaderProps) {
  const sizes = getSizeColumns()

  return (
    <div className={`kds-size-header ${animate ? 'kds-item-animate' : ''}`}>
      <span className="kds-size-header-spacer" />
      {sizes.map((size) => (
        <span key={size} className="kds-size-header-label">
          {size}
        </span>
      ))}
    </div>
  )
}
