// Application-wide constants
export const APP_NAME = 'Little Cafe'
export const APP_DESCRIPTION = 'Fresh Coffee & Pastries'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Business Information
export const BUSINESS_INFO = {
  name: 'Little Cafe',
  address: '10400 E Alameda Ave, Denver, CO',
  phone: '(303) 123-4567', // Placeholder phone
  email: 'info@littlecafe.com', // Placeholder email
  hours: {
    monday: '8:00 AM - 6:00 PM',
    tuesday: '8:00 AM - 6:00 PM',
    wednesday: '8:00 AM - 6:00 PM',
    thursday: '8:00 AM - 6:00 PM',
    friday: '8:00 AM - 6:00 PM',
    saturday: 'Closed',
    sunday: 'Closed'
  }
} as const

// Navigation Routes
export const ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  MENU: '/menu',
  GALLERY: '/gallery',
  CONTACT: '/contact',
  CART: '/cart',
  PROFILE: '/profile',
  AUTH: '/auth',
  ADMIN: '/admin'
} as const

// API Endpoints
export const API_ENDPOINTS = {
  MENU: '/api/menu',
  SQUARE: {
    PROCESS_PAYMENT: '/api/square/process-payment',
    TEST_CONNECTION: '/api/square/test-connection',
    TEST_ORDER: '/api/square/test-order',
    VALIDATE_CATALOG: '/api/square/validate-catalog'
  },
  TEST: {
    DATABASE: '/api/test-database',
    CATALOG: '/api/test-catalog',
    SQUARE: '/api/test-square',
    SUPABASE: '/api/test-supabase'
  }
} as const

// Local Storage Keys
export const STORAGE_KEYS = {
  CART: 'cafe-cart',
  USER_PREFERENCES: 'cafe-user-preferences',
  ONBOARDING_COMPLETED: 'cafe-onboarding-completed',
  THEME: 'cafe-theme'
} as const

// Environment Variables
export const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  SQUARE_ENVIRONMENT: process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT,
  SQUARE_APPLICATION_ID: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
} as const