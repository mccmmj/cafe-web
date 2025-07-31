'use client'

import Navigation from '@/components/Navigation'
import Breadcrumbs from '@/components/layout/Breadcrumbs'
import { MapPin, Clock, Phone, Mail } from 'lucide-react'

export default function Contact() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <Breadcrumbs />
      
      {/* Hero Section */}
      <section className="pt-16 py-20 bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Visit <span className="text-amber-600">Little Cafe</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We&apos;d love to see you! Stop by for a coffee, pastry, or a quick bite. Find all the information you need to visit us below.
          </p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Details */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Get in Touch</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <MapPin className="h-6 w-6 text-amber-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
                    <p className="text-gray-600">
                      10400 E Alameda Ave<br/>
                      Denver, CO, 80247<br/>
                      <span className="text-sm italic">Just inside the Kaiser Permanente medical complex</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <Clock className="h-6 w-6 text-amber-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Hours</h3>
                    <p className="text-gray-600">
                      Monday – Friday: 8:00 AM – 6:00 PM<br/>
                      <span className="text-sm text-amber-600">Weekend hours coming soon!</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <Phone className="h-6 w-6 text-amber-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                    <p className="text-gray-600">
                      <a href="tel:+1234567890" className="hover:text-amber-600 transition-colors">
                        (123) 456-7890
                      </a>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <Mail className="h-6 w-6 text-amber-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                    <p className="text-gray-600">
                      <a href="mailto:hello@littlecafe.com" className="hover:text-amber-600 transition-colors">
                        hello@littlecafe.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Special Notes */}
              <div className="mt-8 p-6 bg-amber-50 rounded-2xl">
                <h3 className="font-semibold text-gray-900 mb-3">📍 Finding Us</h3>
                <p className="text-gray-600 text-sm">
                  We&apos;re conveniently located inside the Kaiser Permanente medical complex. 
                  Perfect for visitors, patients, and medical staff looking for a quick coffee break or snack.
                </p>
              </div>
            </div>

            {/* Map */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Location</h2>
              <div className="bg-gradient-to-br from-amber-100 to-orange-200 rounded-2xl p-4 h-96">
                <iframe
                  title="Cafe Location Map"
                  src="https://www.google.com/maps?q=10400+E+Alameda+Ave,+Denver,+CO,+80247&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0, borderRadius: '1rem', width: '100%', height: '100%' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
              
              {/* Directions */}
              <div className="mt-6 p-6 bg-gray-50 rounded-2xl">
                <h3 className="font-semibold text-gray-900 mb-3">🚗 Parking & Access</h3>
                <p className="text-gray-600 text-sm">
                  Free parking is available in the Kaiser Permanente parking lot. 
                  Enter through the main medical complex entrance and you&apos;ll find us easily inside.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready for Your Next Coffee?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Whether you&apos;re here for a medical appointment or just passing through, 
            we&apos;re excited to serve you our freshly made drinks and treats.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/menu"
              className="bg-amber-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-amber-700 transition-colors duration-200 inline-block"
            >
              Browse Our Menu
            </a>
            <a
              href="tel:+1234567890"
              className="border-2 border-amber-600 text-amber-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-amber-600 hover:text-white transition-colors duration-200 inline-block"
            >
              Call Ahead
            </a>
          </div>
        </div>
      </section>

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