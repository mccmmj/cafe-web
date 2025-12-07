'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { Input, Button } from '../ui'
import type { MenuCategory, MenuItem } from '@/types/menu'

interface MenuSearchProps {
  categories: MenuCategory[]
  onSearchResults: (results: SearchResult[]) => void
  className?: string
}

export interface SearchResult {
  item: MenuItem
  category: MenuCategory
  score: number
}

const MenuSearch = ({ categories, onSearchResults, className = '' }: MenuSearchProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isActive, setIsActive] = useState(false)

  // Search algorithm that scores items based on relevance
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) {
      return []
    }

    const term = searchTerm.toLowerCase().trim()
    const results: SearchResult[] = []

    categories.forEach(category => {
      category.items.forEach(item => {
        let score = 0

        // Exact name match gets highest score
        if (item.name.toLowerCase() === term) {
          score += 100
        }
        // Name starts with search term
        else if (item.name.toLowerCase().startsWith(term)) {
          score += 50
        }
        // Name contains search term
        else if (item.name.toLowerCase().includes(term)) {
          score += 25
        }

        // Description contains search term
        if (item.description?.toLowerCase().includes(term)) {
          score += 15
        }

        // Category name contains search term
        if (category.name.toLowerCase().includes(term)) {
          score += 10
        }

        // Check variations
        if (item.variations) {
          item.variations.forEach(variation => {
            if (variation.name.toLowerCase().includes(term)) {
              score += 20
            }
          })
        }

        if (score > 0) {
          results.push({ item, category, score })
        }
      })
    })

    // Sort by score (highest first)
    return results.sort((a, b) => b.score - a.score)
  }, [searchTerm, categories])

  // Effect to call onSearchResults when search results change
  useEffect(() => {
    onSearchResults(searchResults)
  }, [searchResults, onSearchResults])

  const clearSearch = () => {
    setSearchTerm('')
    setIsActive(false)
    onSearchResults([])
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          type="text"
          placeholder="Search menu items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsActive(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              clearSearch()
            }
          }}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Results Info */}
      {isActive && searchTerm && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-2">
          <p className="text-sm text-gray-600">
            {searchResults.length > 0 
              ? `Found ${searchResults.length} item${searchResults.length === 1 ? '' : 's'}`
              : 'No items found'
            }
          </p>
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {searchResults.slice(0, 5).map((result, index) => (
                <div key={`${result.item.id}-${index}`} className="text-xs text-gray-500 truncate">
                  <span className="font-medium text-gray-700">{result.item.name}</span>
                  <span className="mx-1">in</span>
                  <span>{result.category.name}</span>
                </div>
              ))}
              {searchResults.length > 5 && (
                <p className="text-xs text-gray-400">
                  +{searchResults.length - 5} more results
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MenuSearch
