'use client'

import Navigation from '@/components/Navigation'
import Breadcrumbs from '@/components/layout/Breadcrumbs'
import Image from 'next/image'
import { useState } from 'react'

export default function Gallery() {
  // Lightbox state for gallery
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const galleryImages = [
    '1.png','2.png','3.png','4.png','5.png','6.png','7.png','8.png','9.png','10.png','11.png','12.png','13.png','14.png','15.png','16.png','17.png','18.png','19.png','20.png','21.png','22.png','23.png','24.png','25.png','26.png','27.png','28.png','29.png','30.png','31.png','32.png','33.png'
  ];

  return (
    <main className="min-h-screen">
      <Navigation />
      <Breadcrumbs />
      
      {/* Hero Section */}
      <section className="pt-16 py-20 bg-gradient-to-br from-primary-50 to-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Our <span className="text-primary-600">Gallery</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Starbucks Slideshow: A look at our drinks, treats, and cafe moments! Click any image to see it larger.
          </p>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {galleryImages.map((filename) => (
              <button
                key={filename}
                className="bg-gradient-to-br from-primary-100 to-green-200 rounded-2xl p-4 h-72 flex items-center justify-center overflow-hidden focus:outline-none hover:shadow-lg transition-shadow duration-200"
                onClick={() => {
                  setLightboxImg(`/images/starbucks-slideshow/${filename}`);
                  setLightboxOpen(true);
                }}
                aria-label="Enlarge image"
                type="button"
              >
                <div className="flex items-center justify-center w-full h-44 bg-white rounded-xl">
                  <Image
                    src={`/images/starbucks-slideshow/${filename}`}
                    alt="Starbucks drink"
                    width={180}
                    height={240}
                    className="object-contain w-auto h-full"
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
          aria-modal="true"
          role="dialog"
        >
          <button
            className="absolute top-6 right-6 text-white text-3xl font-bold focus:outline-none hover:text-primary-400 transition-colors"
            onClick={e => { e.stopPropagation(); setLightboxOpen(false); }}
            aria-label="Close"
            type="button"
          >
            &times;
          </button>
          <div className="max-w-3xl w-full flex items-center justify-center p-4">
            {lightboxImg && (
              <Image
                src={lightboxImg}
                alt="Enlarged Starbucks drink"
                width={800}
                height={1000}
                className="object-contain w-full h-auto rounded-2xl shadow-2xl max-h-[90vh]"
                style={{ objectFit: 'contain' }}
                priority
              />
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold text-primary-400 mb-4">Little Cafe</h3>
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