'use client'

import type { KDSMenuItem, KDSCategoryIcon as IconType } from '@/lib/kds/types'
import { groupItemsBySizes, hasSizedItems } from '@/lib/kds/group-items'

interface KDSCategoryCompactProps {
  name: string
  items: KDSMenuItem[]
  icon?: IconType
  /** Category-level price (e.g., "CROISSANTS $4.95") */
  categoryPrice?: string
}

/**
 * Compact category display for the dual-panel layout.
 * Shows category name with icon and items in a dense format.
 */
export default function KDSCategoryCompact({
  name,
  items,
  icon,
  categoryPrice,
}: KDSCategoryCompactProps) {
  const showSizeColumns = hasSizedItems(items)
  const processedItems = showSizeColumns ? groupItemsBySizes(items) : null

  return (
    <div className="kds-compact-category">
      {/* Category Header */}
      <div className="kds-compact-header">
        {icon && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/images/kds/icons/${icon}.svg`}
            alt=""
            className="kds-compact-icon"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        )}
        <span className="kds-compact-title">{name}</span>
        {categoryPrice && (
          <span className="kds-compact-category-price">{categoryPrice}</span>
        )}
      </div>

      {/* Size Column Headers (if applicable) */}
      {showSizeColumns && (
        <div className="kds-compact-size-header">
          <span></span>
          <span>Tall</span>
          <span>Grande</span>
          <span>Venti</span>
        </div>
      )}

      {/* Items */}
      <div className="kds-compact-items">
        {showSizeColumns && processedItems
          ? processedItems.map((processed) => {
              if (processed.type === 'grouped') {
                const { item } = processed
                return (
                  <div key={item.squareItemId} className="kds-compact-sized-item">
                    <span className="kds-compact-item-name">
                      {item.displayName || item.baseName}
                    </span>
                    <span className="kds-compact-price">
                      {item.sizes.Tall?.price || '—'}
                    </span>
                    <span className="kds-compact-price">
                      {item.sizes.Grande?.price || '—'}
                    </span>
                    <span className="kds-compact-price">
                      {item.sizes.Venti?.price || '—'}
                    </span>
                  </div>
                )
              } else {
                const { item } = processed
                return (
                  <div key={item.id} className="kds-compact-item">
                    <span className="kds-compact-item-name">
                      {item.displayName || item.name}
                    </span>
                    <span className="kds-compact-item-price">{item.price}</span>
                  </div>
                )
              }
            })
          : items.map((item) => (
              <div key={item.id} className="kds-compact-item">
                <span className="kds-compact-item-name">
                  {item.displayName || item.name}
                </span>
                <span className="kds-compact-item-price">
                  {item.displayPrice || `$${(item.priceCents / 100).toFixed(2)}`}
                </span>
              </div>
            ))}
      </div>
    </div>
  )
}
