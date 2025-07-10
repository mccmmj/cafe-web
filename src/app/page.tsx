'use client'

import Navigation from '@/components/Navigation'
import { Coffee, Clock, MapPin, Phone, Instagram, Facebook } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

export default function Home() {
  // Lightbox state for gallery
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const galleryImages = [
    '1.png','2.png','3.png','4.png','5.png','6.png','7.png','8.png','9.png','10.png','11.png','12.png','13.png','14.png','15.png','16.png','17.png','18.png','19.png','20.png','21.png','22.png','23.png','24.png','25.png','26.png','27.png','28.png','29.png','30.png','31.png','32.png','33.png'
  ];

  return (
    <main className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section id="home" className="pt-16 min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
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
              <button
                className="bg-amber-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-amber-700 transition-colors duration-200"
                onClick={() => {
                  const el = document.getElementById('menu');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                type="button"
              >
                View Our Menu
              </button>
              <button
                className="border-2 border-amber-600 text-amber-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-amber-600 hover:text-white transition-colors duration-200"
                onClick={() => {
                  const el = document.getElementById('contact');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                type="button"
              >
                Visit Us Today
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">About Little Cafe</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Little Cafe is a friendly cafe stand located inside the medical complex, serving both visitors and staff. We offer a convenient spot to grab a quality coffee, refreshing drink, or a quick bite as you go about your day.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Crafted for Your Day
              </h3>
              <p className="text-gray-600 mb-6">
                Every drink is made to order using quality ingredients, and our pastries and sandwiches are always fresh. Whether you're stopping by for a morning coffee, a midday treat, or a quick lunch, we're here to serve you with a smile.
              </p>
              <p className="text-gray-600 mb-6">
                While we don't have a full dining area, we do have a couple of tables where you can enjoy your pastry or ice cream before heading on your way.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-600">5+</div>
                  <div className="text-gray-600">Years of Service</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-600">1000+</div>
                  <div className="text-gray-600">Happy Customers</div>
                </div>
              </div>
            </div>
            {/* Image Content */}
            <div className="flex items-center justify-center">
              <Image
                src="/images/cafe-from-right.jpg"
                alt="Cafe Interior"
                width={320}
                height={220}
                className="rounded-2xl object-cover shadow-lg w-full h-auto max-w-xs"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Menu Section */}
      <section id="menu" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Menu</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Freshly prepared drinks, pastries, sandwiches, and more. Enjoy a quick bite or a treat as you go about your day!
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Breakfast Burritos & Sammies */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Breakfast</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900">Breakfast Burritos <span className='text-amber-600'>$8.95</span></h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>Chicken Chorizo</li>
                    <li>Bacon</li>
                    <li>Sausage</li>
                    <li>Black Beans</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Breakfast Sammies <span className='text-amber-600'>$7.95</span></h4>
                  <p className="text-sm text-gray-600">Artisan sandwiches, heat & serve:</p>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>Egg & Cheese</li>
                    <li>Bacon, Egg & Cheese</li>
                    <li>Sausage, Egg & Cheese</li>
                    <li>Turkey Sausage, Egg & Cheese</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Pastries & Sweets */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Pastries & Sweets</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900">Muffins <span className='text-amber-600'>$4.95</span></h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>Blueberry</li>
                    <li>Chocolate Chip</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Cookies <span className='text-amber-600'>$4.95</span></h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>Chocolate Chip</li>
                    <li>Snickerdoodle</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Danish <span className='text-amber-600'>$4.95</span></h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>Cream Cheese</li>
                    <li>Assorted</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Coffee Cake <span className='text-amber-600'>$5.95</span></h4>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Savory Croissants <span className='text-amber-600'>$9.95</span></h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>Egg & Cheese</li>
                    <li>Bacon & Cheese</li>
                    <li>Ham & Cheese</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Filled Croissants <span className='text-amber-600'>$4.95</span></h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>Raspberry</li>
                    <li>Chocolate</li>
                    <li>Almond</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Butter Croissant <span className='text-amber-600'>$4.95</span></h4>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Cake Pops <span className='text-amber-600'>$3.95</span></h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>Strawberry</li>
                    <li>Chocolate</li>
                    <li>Birthday</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Ice Cream</h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>First Scoop <span className='text-amber-600'>$5.95</span></li>
                    <li>Each additional scoop <span className='text-amber-600'>$2.95</span></li>
                    <li>Pint <span className='text-amber-600'>$9.95</span></li>
                    <li>Affogato <span className='text-amber-600'>$8.95</span></li>
                    <li>Toppings <span className='text-amber-600'>$0.50</span></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Coffee, Tea, and Drinks */}
            <div className="bg-white rounded-2xl p-8 shadow-lg lg:col-span-1 md:col-span-2">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Drinks</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Coffee & Espresso</h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>Americano</li>
                    <li>Café Latte</li>
                    <li>Caramel Macchiato</li>
                    <li>Iced Brown Sugar Oat Espresso</li>
                    <li>Cold Brew / Nitro Cold Brew</li>
                  </ul>
                  <div className="text-xs text-gray-500 mt-1">Tall $3.65–$5.65 | Grande $4.45–$6.15 | Venti $4.95–$6.65</div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Tea</h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>Hot Tea</li>
                    <li>Iced Tea</li>
                    <li>Lemonade</li>
                    <li>Chai</li>
                    <li>Matcha Latte (Hot/Iced)</li>
                  </ul>
                  <div className="text-xs text-gray-500 mt-1">Tall $2.95–$4.65 | Grande $4.15–$5.65 | Venti $4.65–$6.65</div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Chocolate & More</h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>Hot Chocolate</li>
                    <li>Steamed Milk</li>
                  </ul>
                  <div className="text-xs text-gray-500 mt-1">Tall $3.25–$4.25 | Grande $3.45–$4.95</div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Signature Drinks</h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>Caramel Apple</li>
                    <li>Berry Peachy</li>
                    <li>Mango-Colada</li>
                  </ul>
                  <div className="text-xs text-gray-500 mt-1">Tall $5.45–$5.75 | Grande $6.55 | Venti $7.35</div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Frappuccinos</h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>Mango</li>
                    <li>Strawberry</li>
                    <li>Caramel</li>
                    <li>Mocha</li>
                    <li>Java Chip</li>
                    <li>Cookie Crumble</li>
                    <li>White Mocha</li>
                    <li>Matcha Crème</li>
                  </ul>
                  <div className="text-xs text-gray-500 mt-1">Tall $5.65–$5.75 | Grande $6.25–$6.55 | Venti $6.75–$7.35</div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Lotus Energy Drinks</h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>Caramel Apple</li>
                    <li>Berry Peachy</li>
                    <li>Prickly Pear Punch</li>
                    <li>Orange Creamsicle</li>
                    <li>Mango-Colada</li>
                    <li>Lavender Haze</li>
                    <li>Ocean Mist</li>
                    <li>Pinky Promise</li>
                  </ul>
                  <div className="text-xs text-gray-500 mt-1">Small $5.75 | Medium $6.55 | Large $7.35</div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Refreshers & Smoothies</h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>Mango Dragonfruit</li>
                    <li>Dragon Drink</li>
                    <li>Strawberry Acai</li>
                    <li>Pink Drink</li>
                  </ul>
                  <div className="text-xs text-gray-500 mt-1">Tall $5.65 | Grande $5.95 | Venti $6.55</div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Extras & Add-ons</h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5">
                    <li>Cold Foam <span className='text-amber-600'>$0.90</span></li>
                    <li>Fruits <span className='text-amber-600'>$0.95</span></li>
                    <li>Boba <span className='text-amber-600'>$3.00</span></li>
                    <li>Extra Flavor <span className='text-amber-600'>$0.90</span></li>
                    <li>Vegetal Milk <span className='text-amber-600'>$1.25</span></li>
                    <li>Espresso Shot <span className='text-amber-600'>$1.75</span></li>
                    <li>Power Up <span className='text-amber-600'>$1.75</span></li>
                    <li>Super Cream <span className='text-amber-600'>$1.45</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Gallery</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Starbucks Slideshow: A look at our drinks, treats, and cafe moments!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {galleryImages.map((filename) => (
              <button
                key={filename}
                className="bg-gradient-to-br from-amber-100 to-orange-200 rounded-2xl p-4 h-72 flex items-center justify-center overflow-hidden focus:outline-none"
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
        {/* Lightbox Modal */}
        {lightboxOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setLightboxOpen(false)}
            aria-modal="true"
            role="dialog"
          >
            <button
              className="absolute top-6 right-6 text-white text-3xl font-bold focus:outline-none"
              onClick={e => { e.stopPropagation(); setLightboxOpen(false); }}
              aria-label="Close"
              type="button"
            >
              &times;
            </button>
            <div className="max-w-2xl w-full flex items-center justify-center p-4">
              {lightboxImg && (
                <Image
                  src={lightboxImg}
                  alt="Enlarged Starbucks drink"
                  width={600}
                  height={800}
                  className="object-contain w-full h-auto rounded-2xl shadow-2xl"
                  style={{ objectFit: 'contain' }}
                  priority
                />
              )}
            </div>
          </div>
        )}
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Visit Us</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We'd love to see you! Stop by for a coffee, pastry, or a quick bite.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">Location & Hours</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <MapPin className="h-6 w-6 text-amber-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Address</p>
                    <p className="text-gray-600">10400 E Alameda Ave, Denver, CO, 80247<br/>Just inside the Kaiser Permanente medical complex</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Clock className="h-6 w-6 text-amber-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Hours</p>
                    <p className="text-gray-600">8AM – 6PM Monday – Friday</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-100 to-orange-200 rounded-2xl p-4 h-96 flex items-center justify-center">
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
