// Menu API operations
import type { MenuCategory } from '@/types/menu'
import { API_ENDPOINTS } from '@/lib/constants'

export interface MenuApiResponse {
  categories: MenuCategory[]
  error?: string
}

export interface MenuApiError {
  error: string
  details?: string
}

// Fetch menu data from API
export const fetchMenu = async (): Promise<MenuApiResponse> => {
  try {
    const response = await fetch(API_ENDPOINTS.MENU, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add cache control for better performance
      next: { revalidate: 300 } // Revalidate every 5 minutes
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error)
    }

    return {
      categories: data.categories || [],
      error: undefined
    }
  } catch (error) {
    console.error('Menu fetch error:', error)
    return {
      categories: [],
      error: error instanceof Error ? error.message : 'Failed to fetch menu'
    }
  }
}

// Search menu items
export const searchMenuItems = async (query: string): Promise<MenuApiResponse> => {
  try {
    const response = await fetch(`${API_ENDPOINTS.MENU}?search=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      categories: data.categories || [],
      error: data.error
    }
  } catch (error) {
    console.error('Menu search error:', error)
    return {
      categories: [],
      error: error instanceof Error ? error.message : 'Failed to search menu'
    }
  }
}

// Get specific menu category
export const fetchMenuCategory = async (categoryId: string): Promise<{ category: MenuCategory | null; error?: string }> => {
  try {
    const menuResponse = await fetchMenu()
    
    if (menuResponse.error) {
      return { category: null, error: menuResponse.error }
    }

    const category = menuResponse.categories.find(cat => cat.id === categoryId)
    
    return {
      category: category || null,
      error: category ? undefined : 'Category not found'
    }
  } catch (error) {
    console.error('Category fetch error:', error)
    return {
      category: null,
      error: error instanceof Error ? error.message : 'Failed to fetch category'
    }
  }
}

// Check menu item availability
export const checkItemAvailability = async (itemId: string): Promise<{ available: boolean; error?: string }> => {
  try {
    const menuResponse = await fetchMenu()
    
    if (menuResponse.error) {
      return { available: false, error: menuResponse.error }
    }

    // Find item across all categories
    let itemFound = false
    for (const category of menuResponse.categories) {
      const item = category.items.find(item => item.id === itemId)
      if (item) {
        itemFound = true
        // Check if item is available (you can add more complex logic here)
        return { available: true }
      }
    }

    return {
      available: false,
      error: itemFound ? undefined : 'Item not found'
    }
  } catch (error) {
    console.error('Availability check error:', error)
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Failed to check availability'
    }
  }
}