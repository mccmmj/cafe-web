#!/usr/bin/env node

/**
 * Debug Square Environment Variables
 * 
 * This script helps debug Square environment configuration
 * without exposing sensitive tokens in logs.
 */

require('dotenv').config({ path: '.env.local' })

console.log('🔍 Square Environment Debug')
console.log('============================')

// Check environment variables (without exposing full tokens)
const vars = {
  'SQUARE_ACCESS_TOKEN': process.env.SQUARE_ACCESS_TOKEN,
  'SQUARE_LOCATION_ID': process.env.SQUARE_LOCATION_ID,
  'SQUARE_ENVIRONMENT': process.env.SQUARE_ENVIRONMENT,
  'SQUARE_APPLICATION_ID': process.env.SQUARE_APPLICATION_ID,
  'NODE_ENV': process.env.NODE_ENV
}

console.log('\n📋 Environment Variables:')
Object.entries(vars).forEach(([key, value]) => {
  if (value) {
    if (key.includes('TOKEN') || key.includes('ID')) {
      // Show only first/last few characters for security
      const masked = value.length > 8 ? 
        `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : 
        `${value.substring(0, 2)}...`
      console.log(`  ✅ ${key}: ${masked} (${value.length} chars)`)
    } else {
      console.log(`  ✅ ${key}: ${value}`)
    }
  } else {
    console.log(`  ❌ ${key}: NOT SET`)
  }
})

// Check which environment we're targeting
const environment = process.env.SQUARE_ENVIRONMENT || 'sandbox'
const baseUrl = environment === 'production' ? 
  'https://connect.squareup.com' : 
  'https://connect.squareupsandbox.com'

console.log(`\n🌍 Target Environment: ${environment}`)
console.log(`📡 API Base URL: ${baseUrl}`)

// Check if we have minimum required vars
const required = ['SQUARE_ACCESS_TOKEN', 'SQUARE_LOCATION_ID']
const missing = required.filter(varName => !process.env[varName])

if (missing.length > 0) {
  console.log('\n❌ Missing required variables:')
  missing.forEach(varName => console.log(`  - ${varName}`))
  console.log('\n💡 Make sure your .env.local file contains these variables')
} else {
  console.log('\n✅ All required environment variables are set!')
  console.log('\n🚀 Ready to run: npm run init-taxes')
}

console.log('\n📁 Environment file: .env.local')