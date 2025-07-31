'use client'

import Navigation from '@/components/Navigation'
import SmoothScrollNav from '@/components/navigation/SmoothScrollNav'
import Image from 'next/image'
import Link from 'next/link'

const scrollSections = [
  { id: 'hero', label: 'Home', href: '#hero' },
  { id: 'highlights', label: 'Highlights', href: '#highlights' },
  { id: 'contact', label: 'Contact', href: '#contact' }
]

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <SmoothScrollNav sections={scrollSections} />
      
      {/* Hero Section */}
      <section id="hero" className="pt-16 min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <Image
                src="/images/coffee-cup.png"
                alt="Little Cafe Coffee Cup Logo"
                width={240}
                height={240}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
              Welcome to{' '}
              <span className="text-amber-600">Little Cafe</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Where every cup tells a story. Experience the perfect blend of comfort, 
              community, and exceptional coffee in our warm and inviting space.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/menu"
                className="bg-amber-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-amber-700 transition-colors duration-200 inline-block text-center"
              >
                View Our Menu
              </Link>
              <Link
                href="/contact"
                className="border-2 border-amber-600 text-amber-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-amber-600 hover:text-white transition-colors duration-200 inline-block text-center"
              >
                Visit Us Today
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Highlights */}
      <section id="highlights" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Little Cafe?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your friendly neighborhood cafe serving quality drinks and fresh treats.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-amber-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">☕</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Quality Coffee</h3>
              <p className="text-gray-600">Every drink is made to order using quality ingredients.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-amber-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🥐</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Fresh Pastries</h3>
              <p className="text-gray-600">Our pastries and sandwiches are always fresh and delicious.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-amber-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📍</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Convenient Location</h3>
              <p className="text-gray-600">Located inside Kaiser Permanente medical complex.</p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Link
              href="/about"
              className="text-amber-600 font-semibold hover:text-amber-700 transition-colors"
            >
              Learn more about our story →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-12">
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