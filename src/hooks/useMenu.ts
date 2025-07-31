'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAsync } from './useAsync'
import { useDebounce } from './useDebounce'
import { fetchMenu, searchMenuItems } from '@/lib/api/menu'
import type { MenuCategory, MenuItem } from '@/types/menu'

export interface UseMenuState {
  categories: MenuCategory[]
  loading: boolean
  error: string | null
  searchTerm: string
  searchResults: MenuItem[]
  isSearching: boolean
  setSearchTerm: (term: string) => void
  refreshMenu: () => Promise<any>
  getItemById: (itemId: string) => MenuItem | null
  getCategoryById: (categoryId: string) => MenuCategory | null
  getItemsByCategory: (categoryId: string) => MenuItem[]
}

export function useMenu(): UseMenuState {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<MenuItem[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Fetch menu data
  const {
    data: menuData,
    loading,
    error,
    execute: refreshMenu
  } = useAsync(fetchMenu, true)

  const categories = menuData?.categories || []

  // Search functionality
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchTerm.trim()) {
        setSearchResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      try {
        const results = await searchMenuItems(debouncedSearchTerm)
        if (results.categories) {
          // Flatten all items from search results
          const allItems = results.categories.flatMap(category => category.items)
          setSearchResults(allItems)
        }
      } catch (err) {
        console.error('Search error:', err)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    performSearch()
  }, [debouncedSearchTerm])

  // Helper functions
  const getItemById = useCallback((itemId: string): MenuItem | null => {
    for (const category of categories) {
      const item = category.items.find(item => item.id === itemId)
      if (item) return item
    }
    return null
  }, [categories])

  const getCategoryById = useCallback((categoryId: string): MenuCategory | null => {
    return categories.find(category => category.id === categoryId) || null
  }, [categories])

  const getItemsByCategory = useCallback((categoryId: string): MenuItem[] => {
    const category = getCategoryById(categoryId)
    return category ? category.items : []
  }, [getCategoryById])

  return {
    categories,
    loading,
    error,
    searchTerm,
    searchResults,
    isSearching,
    setSearchTerm,
    refreshMenu,
    getItemById,
    getCategoryById,
    getItemsByCategory
  }
}