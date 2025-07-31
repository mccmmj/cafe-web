'use client'

import { useState } from 'react'
import { Heart, Plus, Loader2 } from 'lucide-react'
import { useFavorites } from '@/hooks/useFavorites'
import { useAuth } from '@/hooks/useAuth'
import { useAddToCart } from '@/hooks/useCartData'
import Button from '@/components/ui/Button'
import { toast } from 'react-hot-toast'

export default function FavoritesList() {
  const { user } = useAuth()
  const { favorites, loading, removeFromFavorites } = useFavorites()
  const addToCart = useAddToCart()
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  const handleAddToCart = async (favorite: any) => {
    setAddingToCart(favorite.square_item_id)
    
    try {
      // Fetch full item details from menu to get proper variation ID and pricing
      const response = await fetch('/api/menu')
      const menuData = await response.json()
      
      // Find the item in the menu data
      let foundItem = null
      for (const category of menuData.categories) {
        foundItem = category.items.find((item: any) => item.id === favorite.square_item_id)
        if (foundItem) break
      }
      
      if (!foundItem) {
        toast.error('Item no longer available')
        return
      }
      
      // Get the default variation ID (first variation or item ID if no variations)
      const variationId = foundItem.variations?.[0]?.id || foundItem.id
      
      await addToCart.mutateAsync({
        itemId: foundItem.id,
        variationId: variationId,
        name: foundItem.name,
        price: foundItem.price,
        quantity: 1,
        category: 'favorites'
      })
      
      toast.success(`Added ${favorite.item_name} to cart`)
    } catch (error) {
      toast.error('Failed to add item to cart')
      console.error('Error adding to cart:', error)
    } finally {
      setAddingToCart(null)
    }
  }

  const handleRemoveFavorite = async (squareItemId: string) => {
    await removeFromFavorites(squareItemId)
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <Heart className="mx-auto text-gray-300 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in to see your favorites</h3>
        <p className="text-gray-600">Create an account to save your favorite items for quick reordering.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="mx-auto animate-spin text-amber-600 mb-4" size={48} />
        <p className="text-gray-600">Loading your favorites...</p>
      </div>
    )
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="mx-auto text-gray-300 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites yet</h3>
        <p className="text-gray-600">
          Browse our menu and click the heart icon to save your favorite items for quick reordering.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Favorites</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {favorites.map((favorite) => (
          <div
            key={favorite.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-medium text-gray-900 flex-1 pr-2">
                {favorite.item_name}
              </h3>
              <button
                onClick={() => handleRemoveFavorite(favorite.square_item_id)}
                className="text-red-500 hover:text-red-700 transition-colors"
                title="Remove from favorites"
              >
                <Heart size={20} fill="currentColor" />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Added {new Date(favorite.created_at).toLocaleDateString()}
              </span>
              
              <Button
                onClick={() => handleAddToCart(favorite)}
                disabled={addingToCart === favorite.square_item_id}
                size="sm"
                className="flex items-center gap-1"
              >
                {addingToCart === favorite.square_item_id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Add to Cart
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}