'use client'

import Navigation from '@/components/Navigation'
import FavoritesList from '@/components/favorites/FavoritesList'

export default function FavoritesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FavoritesList />
        </div>
      </main>
    </div>
  )
}