#!/usr/bin/env node

/**
 * Test Square API connectivity and permissions
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

async function testAPI() {
  console.log('🧪 Testing Square API Connectivity')
  console.log('===================================')
  
  try {
    // Test 1: List Locations
    console.log('\n1️⃣ Testing Locations API...')
    const locResponse = await fetch(`${SQUARE_BASE_URL}/v2/locations`, {
      method: 'GET',
      headers: getHeaders()
    })
    
    if (locResponse.ok) {
      const locData = await locResponse.json()
      console.log('✅ Locations API works')
      console.log(`   Found ${locData.locations?.length || 0} locations`)
      if (locData.locations?.[0]) {
        console.log(`   Location: ${locData.locations[0].name} (${locData.locations[0].id})`)
      }
    } else {
      console.log('❌ Locations API failed:', locResponse.status)
    }
    
    // Test 2: List Catalog Objects
    console.log('\n2️⃣ Testing Catalog API...')
    const catResponse = await fetch(`${SQUARE_BASE_URL}/v2/catalog/list`, {
      method: 'GET',
      headers: getHeaders()
    })
    
    if (catResponse.ok) {
      const catData = await catResponse.json()
      console.log('✅ Catalog API works')
      console.log(`   Found ${catData.objects?.length || 0} catalog objects`)
    } else {
      console.log('❌ Catalog API failed:', catResponse.status)
    }
    
    // Test 3: Search for Tax objects specifically
    console.log('\n3️⃣ Testing Tax Search...')
    const taxResponse = await fetch(`${SQUARE_BASE_URL}/v2/catalog/search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        object_types: ['TAX']
      })
    })
    
    if (taxResponse.ok) {
      const taxData = await taxResponse.json()
      console.log('✅ Tax search works')
      console.log(`   Found ${taxData.objects?.length || 0} tax objects`)
      if (taxData.objects?.length > 0) {
        taxData.objects.forEach(tax => {
          console.log(`   - ${tax.tax_data?.name}: ${tax.tax_data?.percentage}% (${tax.tax_data?.enabled ? 'enabled' : 'disabled'})`)
        })
      }
    } else {
      const errorText = await taxResponse.text()
      console.log('❌ Tax search failed:', taxResponse.status, errorText)
    }
    
    console.log('\n🔍 API Tests Complete!')
    
  } catch (error) {
    console.error('❌ API Test Error:', error.message)
  }
}

testAPI()