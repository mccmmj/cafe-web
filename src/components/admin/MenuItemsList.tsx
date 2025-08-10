'use client'

import { useState } from 'react'
import { Eye, Edit, Power, PowerOff, DollarSign, Clock, Coffee } from 'lucide-react'
import { Button } from '@/components/ui'
import { formatPrice } from '@/lib/utils'
import { isStarbucksCategory } from '@/lib/constants/menu'

interface MenuItem {
  id: string
  name: string
  description: string
  categoryId?: string
  categoryName: string
  isAvailable: boolean
  variations: Array<{
    id: string
    name: string
    price: number
    currency: string
    isDefault: boolean
  }>
  imageUrl?: string
  ordinal: number
  lastUpdated: string
  version: number
}

interface MenuItemsListProps {
  items: MenuItem[]
  view: 'grid' | 'table'
  isLoading: boolean
  onEditItem: (item: MenuItem) => void
  onToggleAvailability: (itemId: string, isAvailable: boolean) => void
  onBulkAvailability: (itemIds: string[], isAvailable: boolean) => void
  isUpdating: boolean
  selectedItems?: Set<string>
  onSelectItem?: (itemId: string, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
}

const MenuItemsList = ({
  items,
  view,
  isLoading,
  onEditItem,
  onToggleAvailability,
  onBulkAvailability,
  isUpdating,
  selectedItems = new Set(),
  onSelectItem,
  onSelectAll
}: MenuItemsListProps) => {

  const handleSelectAll = (checked: boolean) => {
    if (onSelectAll) {
      onSelectAll(checked)
    }
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (onSelectItem) {
      onSelectItem(itemId, checked)
    }
  }

  const isAllSelected = selectedItems.size > 0 && selectedItems.size === items.length
  const isSomeSelected = selectedItems.size > 0 && selectedItems.size < items.length

  const getDefaultPrice = (item: MenuItem) => {
    const defaultVariation = item.variations.find(v => v.isDefault) || item.variations[0]
    return defaultVariation ? defaultVariation.price / 100 : 0
  }

  const getPriceRange = (item: MenuItem) => {
    const prices = item.variations.map(v => v.price / 100)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    return min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading menu items...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400 mb-4">
          <Coffee className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Menu Items Found</h3>
        <p className="text-gray-600">
          No items match your current search and filter criteria.
        </p>
      </div>
    )
  }

  if (view === 'grid') {
    return (
      <div className="p-6">
        {selectedItems.length > 0 && (
          <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-primary-800">
                {selectedItems.length} items selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onBulkAvailability(selectedItems, true)}
                  disabled={isUpdating}
                >
                  <Power className="w-4 h-4 mr-1" />
                  Enable
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onBulkAvailability(selectedItems, false)}
                  disabled={isUpdating}
                >
                  <PowerOff className="w-4 h-4 mr-1" />
                  Disable
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedItems([])}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
                !item.isAvailable ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                  className="mt-1"
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEditItem(item)}
                    className="p-1"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onToggleAvailability(item.id, !item.isAvailable)}
                    className="p-1"
                    disabled={isUpdating}
                  >
                    {item.isAvailable ? (
                      <Power className="w-4 h-4 text-green-600" />
                    ) : (
                      <PowerOff className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="mb-3">
                <h3 className="font-medium text-gray-900 line-clamp-1">{item.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{item.categoryName}</p>
                {isStarbucksCategory(item.categoryName) && (
                  <span className="inline-block text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded mt-1">
                    Starbucks
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {item.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium text-gray-900">
                    {getPriceRange(item)}
                  </span>
                  <p className="text-xs text-gray-500">
                    {item.variations.length} variation{item.variations.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  item.isAvailable 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {item.isAvailable ? 'Available' : 'Unavailable'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Table view
  return (
    <div className="overflow-hidden">
      {selectedItems.length > 0 && (
        <div className="px-6 py-3 bg-primary-50 border-b border-primary-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-800">
              {selectedItems.length} items selected
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkAvailability(selectedItems, true)}
                disabled={isUpdating}
              >
                <Power className="w-4 h-4 mr-1" />
                Enable Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkAvailability(selectedItems, false)}
                disabled={isUpdating}
              >
                <PowerOff className="w-4 h-4 mr-1" />
                Disable Selected
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedItems([])}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isSomeSelected
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variations
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr 
                key={item.id} 
                className={`hover:bg-gray-50 ${!item.isAvailable ? 'opacity-60' : ''}`}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                  />
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500 line-clamp-1">{item.description}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">{item.categoryName}</span>
                    {isStarbucksCategory(item.categoryName) && (
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                        Starbucks
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-gray-900">
                    {getPriceRange(item)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">
                    {item.variations.length} size{item.variations.length !== 1 ? 's' : ''}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    item.isAvailable 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEditItem(item)}
                      className="p-1"
                      title="Edit item"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onToggleAvailability(item.id, !item.isAvailable)}
                      className="p-1"
                      disabled={isUpdating}
                      title={item.isAvailable ? 'Disable item' : 'Enable item'}
                    >
                      {item.isAvailable ? (
                        <Power className="w-4 h-4 text-green-600" />
                      ) : (
                        <PowerOff className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MenuItemsList