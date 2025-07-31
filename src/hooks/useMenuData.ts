'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { menuItemUpdateSchema, searchQuerySchema } from '@/lib/validations'
import type { MenuItem, MenuCategory, MenuSearch } from '@/types/menu'

// Query Keys
export const menuQueryKeys = {
  all: ['menu'] as const,
  categories: () => [...menuQueryKeys.all, 'categories'] as const,
  category: (id: string) => [...menuQueryKeys.categories(), id] as const,
  items: () => [...menuQueryKeys.all, 'items'] as const,
  item: (id: string) => [...menuQueryKeys.items(), id] as const,
  search: (query: MenuSearch) => [...menuQueryKeys.all, 'search', query] as const,
  featured: () => [...menuQueryKeys.all, 'featured'] as const,
  popular: () => [...menuQueryKeys.all, 'popular'] as const,
}

// API Functions
const fetchMenuCategories = async (): Promise<MenuCategory[]> => {
  const response = await fetch('/api/menu')
  if (!response.ok) {
    throw new Error('Failed to fetch menu categories')
  }
  return response.json()
}

const fetchMenuItem = async (id: string): Promise<MenuItem> => {
  const response = await fetch(`/api/menu/items/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch menu item')
  }
  return response.json()
}

const searchMenuItems = async (searchParams: MenuSearch): Promise<MenuItem[]> => {
  const validatedSearch = searchQuerySchema.safeParse(searchParams)
  if (!validatedSearch.success) {
    throw new Error('Invalid search parameters')
  }
  
  const params = new URLSearchParams()
  if (validatedSearch.data.query) params.append('q', validatedSearch.data.query)
  if (validatedSearch.data.categories?.length) {
    params.append('categories', validatedSearch.data.categories.join(','))
  }
  if (validatedSearch.data.sortBy) params.append('sortBy', validatedSearch.data.sortBy)
  if (validatedSearch.data.sortOrder) params.append('sortOrder', validatedSearch.data.sortOrder)

  const response = await fetch(`/api/menu/search?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Failed to search menu items')
  }
  return response.json()
}

const fetchFeaturedItems = async (): Promise<MenuItem[]> => {
  const response = await fetch('/api/menu/featured')
  if (!response.ok) {
    throw new Error('Failed to fetch featured items')
  }
  return response.json()
}

const fetchPopularItems = async (): Promise<MenuItem[]> => {
  const response = await fetch('/api/menu/popular')
  if (!response.ok) {
    throw new Error('Failed to fetch popular items')
  }
  return response.json()
}

const updateMenuItem = async (id: string, updates: Partial<MenuItem>): Promise<MenuItem> => {
  const validatedUpdates = menuItemUpdateSchema.safeParse(updates)
  if (!validatedUpdates.success) {
    throw new Error('Invalid menu item updates')
  }

  const response = await fetch(`/api/menu/items/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validatedUpdates.data),
  })
  
  if (!response.ok) {
    throw new Error('Failed to update menu item')
  }
  return response.json()
}

// Custom Hooks
export const useMenuCategories = () => {
  return useQuery({
    queryKey: menuQueryKeys.categories(),
    queryFn: fetchMenuCategories,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })
}

export const useMenuItem = (id: string) => {
  return useQuery({
    queryKey: menuQueryKeys.item(id),
    queryFn: () => fetchMenuItem(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useMenuSearch = (searchParams: MenuSearch) => {
  return useQuery({
    queryKey: menuQueryKeys.search(searchParams),
    queryFn: () => searchMenuItems(searchParams),
    enabled: !!searchParams.query && searchParams.query.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export const useFeaturedItems = () => {
  return useQuery({
    queryKey: menuQueryKeys.featured(),
    queryFn: fetchFeaturedItems,
    staleTime: 1000 * 60 * 15, // 15 minutes
  })
}

export const usePopularItems = () => {
  return useQuery({
    queryKey: menuQueryKeys.popular(),
    queryFn: fetchPopularItems,
    staleTime: 1000 * 60 * 15, // 15 minutes
  })
}

export const useUpdateMenuItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<MenuItem> }) =>
      updateMenuItem(id, updates),
    onSuccess: (updatedItem) => {
      // Update the item in cache
      queryClient.setQueryData(menuQueryKeys.item(updatedItem.id), updatedItem)
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: menuQueryKeys.categories() })
      queryClient.invalidateQueries({ queryKey: menuQueryKeys.items() })
      queryClient.invalidateQueries({ queryKey: menuQueryKeys.featured() })
      queryClient.invalidateQueries({ queryKey: menuQueryKeys.popular() })
    },
    onError: (error) => {
      console.error('Failed to update menu item:', error)
    },
  })
}

// Utility hook for menu item availability
export const useMenuItemAvailability = (itemId: string) => {
  const { data: item } = useMenuItem(itemId)
  
  return {
    isAvailable: item?.isAvailable ?? false,
    stockLevel: item?.stockLevel,
    isOutOfStock: item?.stockLevel !== undefined && item.stockLevel <= 0,
    isLowStock: item?.stockLevel !== undefined && item.stockLevel > 0 && item.stockLevel <= 5,
  }
}

// Prefetch utilities
export const usePrefetchMenuItem = () => {
  const queryClient = useQueryClient()

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: menuQueryKeys.item(id),
      queryFn: () => fetchMenuItem(id),
      staleTime: 1000 * 60 * 5,
    })
  }
}

export const usePrefetchMenuSearch = () => {
  const queryClient = useQueryClient()

  return (searchParams: MenuSearch) => {
    queryClient.prefetchQuery({
      queryKey: menuQueryKeys.search(searchParams),
      queryFn: () => searchMenuItems(searchParams),
      staleTime: 1000 * 60 * 2,
    })
  }
}