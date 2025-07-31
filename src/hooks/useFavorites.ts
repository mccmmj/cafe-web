import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { toast } from 'react-hot-toast'

export interface Favorite {
  id: string
  user_id: string
  square_item_id: string
  item_name: string
  created_at: string
}

export function useFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch user's favorites
  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/favorites')
      
      if (!response.ok) {
        if (response.status === 401) {
          setFavorites([])
          return
        }
        throw new Error('Failed to fetch favorites')
      }

      const data = await response.json()
      setFavorites(data.favorites || [])
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch favorites'
      setError(errorMessage)
      console.error('Error fetching favorites:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Add item to favorites
  const addToFavorites = useCallback(async (squareItemId: string, itemName: string) => {
    if (!user) {
      toast.error('Please sign in to add favorites')
      return false
    }

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ squareItemId, itemName }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          toast.error('Item is already in your favorites')
        } else {
          throw new Error(data.error || 'Failed to add to favorites')
        }
        return false
      }

      // Update local state
      setFavorites(prev => [data.favorite, ...prev])
      toast.success('Added to favorites!')
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add to favorites'
      toast.error(errorMessage)
      console.error('Error adding to favorites:', err)
      return false
    }
  }, [user])

  // Remove item from favorites
  const removeFromFavorites = useCallback(async (squareItemId: string) => {
    if (!user) {
      return false
    }

    try {
      const response = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ squareItemId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove from favorites')
      }

      // Update local state
      setFavorites(prev => prev.filter(fav => fav.square_item_id !== squareItemId))
      toast.success('Removed from favorites')
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove from favorites'
      toast.error(errorMessage)
      console.error('Error removing from favorites:', err)
      return false
    }
  }, [user])

  // Check if item is favorited
  const isFavorited = useCallback((squareItemId: string) => {
    return favorites.some(fav => fav.square_item_id === squareItemId)
  }, [favorites])

  // Toggle favorite status
  const toggleFavorite = useCallback(async (squareItemId: string, itemName: string) => {
    if (isFavorited(squareItemId)) {
      return await removeFromFavorites(squareItemId)
    } else {
      return await addToFavorites(squareItemId, itemName)
    }
  }, [isFavorited, addToFavorites, removeFromFavorites])

  // Fetch favorites when user changes
  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  return {
    favorites,
    loading,
    error,
    addToFavorites,
    removeFromFavorites,
    isFavorited,
    toggleFavorite,
    refetch: fetchFavorites
  }
}