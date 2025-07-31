'use client'

import { Heart } from 'lucide-react'
import { useFavorites } from '@/hooks/useFavorites'
import { useAuth } from '@/hooks/useAuth'

interface FavoriteButtonProps {
  squareItemId: string
  itemName: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export default function FavoriteButton({ 
  squareItemId, 
  itemName, 
  className = '',
  size = 'md',
  showText = false
}: FavoriteButtonProps) {
  const { user } = useAuth()
  const { isFavorited, toggleFavorite } = useFavorites()
  
  const favorited = isFavorited(squareItemId)
  
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  }
  
  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering parent click events
    
    if (!user) {
      // Handle not logged in - could show login prompt
      return
    }
    
    await toggleFavorite(squareItemId, itemName)
  }

  // Don't show button if user is not logged in
  if (!user) {
    return null
  }

  return (
    <button
      onClick={handleClick}
      className={`
        rounded-full transition-all duration-200 hover:scale-110
        ${favorited 
          ? 'bg-red-100 text-red-600 hover:bg-red-200' 
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-500'
        }
        ${sizeClasses[size]}
        ${className}
      `}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <div className="flex items-center gap-1">
        <Heart 
          size={iconSizes[size]} 
          fill={favorited ? 'currentColor' : 'none'}
        />
        {showText && (
          <span className="text-sm font-medium">
            {favorited ? 'Favorited' : 'Favorite'}
          </span>
        )}
      </div>
    </button>
  )
}