#!/usr/bin/env node

/**
 * Simple Square Tax Creation
 * 
 * Creates a basic tax configuration using minimal structure
 */

require('dotenv').config({ path: '.env.local' })

const SQUARE_BASE_URL = 'https://connect.squareupsandbox.com'
const SQUARE_VERSION = '2024-12-18'

function getHeaders() {
  return {
    'Square-Version': SQUARE_VERSION,
    'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  }
}

async function createSimpleTax() {
  console.log('🏪 Creating Simple Tax Configuration')
  console.log('====================================')
  
  try {
    // Try the most basic tax object structure possible
    const taxObject = {
      type: 'TAX',
      id: `#tax_${Date.now()}`,
      tax_data: {
        name: 'Sales Tax',
        calculation_phase: 'TAX_SUBTOTAL_PHASE',
        inclusion_type: 'ADDITIVE',
        percentage: '8.25',
        enabled: true
      }
    }
    
    console.log('📝 Tax object structure:')
    console.log(JSON.stringify(taxObject, null, 2))
    
    const response = await fetch(`${SQUARE_BASE_URL}/v2/catalog/upsert`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        idempotency_key: `tax-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        object: taxObject
      })
    })
    
    console.log('\n📡 API Response Status:', response.status)
    console.log('📡 API Response Headers:', Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const result = await response.json()
      console.log('\n✅ Tax created successfully!')
      console.log('📋 Response:', JSON.stringify(result, null, 2))
    } else {
      const errorText = await response.text()
      console.log('\n❌ Tax creation failed')
      console.log('📋 Error Response:', errorText)
      
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.errors) {
          console.log('\n🔍 Error Details:')
          errorJson.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error.category}: ${error.code}`)
            console.log(`     ${error.detail}`)
            if (error.field) console.log(`     Field: ${error.field}`)
          })
        }
      } catch (e) {
        // Error response wasn't JSON
      }
    }
    
  } catch (error) {
    console.error('\n❌ Script Error:', error.message)
    console.error(error.stack)
  }
}

createSimpleTax()