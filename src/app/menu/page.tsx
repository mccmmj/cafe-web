'use client'

import Navigation from '@/components/Navigation'
import Breadcrumbs from '@/components/layout/Breadcrumbs'
import DynamicMenu from '@/components/DynamicMenu'

export default function Menu() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <Breadcrumbs />
      
      {/* Hero Section - Compact */}
      <section className="pt-16 py-12 bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Our <span className="text-amber-600">Menu</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Fresh coffee, pastries, and treats made with quality ingredients. Real-time pricing from our Square system.
          </p>
        </div>
      </section>

      {/* Menu Section */}
      <DynamicMenu />

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold text-amber-400 mb-4">Little Cafe</h3>
          <p className="text-gray-400 mb-6">
            Where every cup tells a story. Thank you for being part of our community.
          </p>
          <div className="border-t border-gray-800 pt-6">
            <p className="text-gray-400 text-sm">
              © 2024 Little Cafe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}