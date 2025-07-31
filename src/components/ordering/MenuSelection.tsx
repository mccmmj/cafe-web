'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, Star, Clock, Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useCartState } from '@/hooks/useCartData'
import { useOptimisticCart } from '@/hooks/useOptimisticCart'

interface MenuSelectionProps {
  onContinue: () => void
  canContinue: boolean
}

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  imageUrl?: string
  isAvailable: boolean
  prepTime?: number
  rating?: number
  isPopular?: boolean
  allergens?: string[]
  nutritionInfo?: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

const mockMenuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Signature Latte',
    description: 'Our house blend espresso with steamed milk and a hint of vanilla',
    price: 4.95,
    category: 'Coffee',
    imageUrl: '/images/latte.jpg',
    isAvailable: true,
    prepTime: 3,
    rating: 4.8,
    isPopular: true,
    allergens: ['dairy'],
    nutritionInfo: { calories: 150, protein: 8, carbs: 12, fat: 6 }
  },
  {
    id: '2',
    name: 'Avocado Toast',
    description: 'Fresh avocado on artisan sourdough with sea salt and microgreens',
    price: 8.50,
    category: 'Breakfast',
    imageUrl: '/images/avocado-toast.jpg',
    isAvailable: true,
    prepTime: 5,
    rating: 4.6,
    isPopular: true,
    allergens: ['gluten'],
    nutritionInfo: { calories: 320, protein: 12, carbs: 28, fat: 18 }
  },
  {
    id: '3',
    name: 'Blueberry Muffin',
    description: 'House-made muffin loaded with fresh blueberries',
    price: 3.25,
    category: 'Pastries',
    imageUrl: '/images/blueberry-muffin.jpg',
    isAvailable: true,
    prepTime: 1,
    rating: 4.4,
    allergens: ['gluten', 'eggs', 'dairy'],
    nutritionInfo: { calories: 280, protein: 6, carbs: 42, fat: 10 }
  },
  {
    id: '4',
    name: 'Chicken Caesar Wrap',
    description: 'Grilled chicken, romaine lettuce, parmesan, and caesar dressing in a flour tortilla',
    price: 9.95,
    category: 'Lunch',
    imageUrl: '/images/caesar-wrap.jpg',
    isAvailable: true,
    prepTime: 7,
    rating: 4.5,
    allergens: ['gluten', 'dairy'],
    nutritionInfo: { calories: 420, protein: 28, carbs: 32, fat: 22 }
  },
  {
    id: '5',
    name: 'Green Smoothie',
    description: 'Spinach, banana, mango, and coconut water blend',
    price: 6.75,
    category: 'Beverages',
    imageUrl: '/images/green-smoothie.jpg',
    isAvailable: true,
    prepTime: 2,
    rating: 4.3,
    allergens: [],
    nutritionInfo: { calories: 180, protein: 4, carbs: 38, fat: 2 }
  },
  {
    id: '6',
    name: 'Chocolate Croissant',
    description: 'Buttery croissant filled with rich dark chocolate',
    price: 4.25,
    category: 'Pastries',
    imageUrl: '/images/chocolate-croissant.jpg',
    isAvailable: false,
    prepTime: 3,
    rating: 4.7,
    allergens: ['gluten', 'dairy', 'eggs'],
    nutritionInfo: { calories: 340, protein: 8, carbs: 38, fat: 18 }
  }
]

const categories = ['All', 'Coffee', 'Breakfast', 'Lunch', 'Pastries', 'Beverages']

export default function MenuSelection({ onContinue, canContinue }: MenuSelectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'rating' | 'prepTime'>('name')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  
  const { cart, itemCount } = useCartState()
  const { addToCart } = useOptimisticCart()

  const filteredItems = mockMenuItems
    .filter(item => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !item.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'prepTime':
          return (a.prepTime || 0) - (b.prepTime || 0)
        default:
          return a.name.localeCompare(b.name)
      }
    })

  const handleAddToCart = useCallback(async (item: MenuItem) => {
    if (!item.isAvailable) return

    await addToCart.mutateAsync({
      itemId: item.id,
      quantity: 1,
      itemDetails: item
    })
  }, [addToCart])

  const handleItemClick = useCallback((item: MenuItem) => {
    setSelectedItem(item)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Items</h2>
        <p className="text-gray-600">Browse our menu and add items to your cart</p>
      </div>

      {/* Search and Filters */}
      <Card variant="outline" className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="price">Sort by Price</option>
              <option value="rating">Sort by Rating</option>
              <option value="prepTime">Sort by Prep Time</option>
            </select>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="px-3"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </Card>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Card 
              variant="default" 
              className={`h-full cursor-pointer transition-all hover:shadow-lg ${
                !item.isAvailable ? 'opacity-60' : ''
              }`}
              onClick={() => handleItemClick(item)}
            >
              <div className="relative">
                <div className="h-48 bg-gray-200 rounded-t-lg relative overflow-hidden">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <div className="text-2xl mb-2">🍽️</div>
                        <div className="text-sm">No image</div>
                      </div>
                    </div>
                  )}
                  
                  {item.isPopular && (
                    <div className="absolute top-2 left-2 bg-amber-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                      Popular
                    </div>
                  )}
                  
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Unavailable
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{item.name}</h3>
                    <div className="text-lg font-bold text-amber-600">${item.price.toFixed(2)}</div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-3">
                      {item.rating && (
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="ml-1">{item.rating}</span>
                        </div>
                      )}
                      {item.prepTime && (
                        <div className="flex items-center">
                          <Clock className="w-4 h-4" />
                          <span className="ml-1">{item.prepTime} min</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {item.allergens && item.allergens.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-1">Contains:</div>
                      <div className="flex flex-wrap gap-1">
                        {item.allergens.map((allergen) => (
                          <span 
                            key={allergen}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                          >
                            {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant={item.isAvailable ? "primary" : "outline"}
                    fullWidth
                    disabled={!item.isAvailable || addToCart.isPending}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddToCart(item)
                    }}
                    isLoading={addToCart.isPending}
                    className="flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {item.isAvailable ? 'Add to Cart' : 'Unavailable'}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card variant="outline" className="p-8 text-center">
          <div className="text-gray-500">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium mb-2">No items found</h3>
            <p>Try adjusting your search or category filter</p>
          </div>
        </Card>
      )}

      {/* Continue Button */}
      {canContinue && (
        <Card variant="outline" className="p-4 text-center">
          <div className="text-sm text-gray-600 mb-3">
            {itemCount} item{itemCount !== 1 ? 's' : ''} in your cart
          </div>
          <Button variant="primary" onClick={onContinue} size="lg" className="px-8">
            Review Order
          </Button>
        </Card>
      )}
    </div>
  )
}