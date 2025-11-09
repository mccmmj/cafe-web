#!/usr/bin/env node

/**
 * Test Square API connectivity, optionally listing catalog variation IDs.
 */

require('dotenv').config({ path: '.env.local' })

const SQUARE_BASE_URL = 'https://connect.squareupsandbox.com'
const SQUARE_VERSION = '2024-12-18'

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    listVariations: args.includes('--list-variations')
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/test-square-api.js [--list-variations]')
    console.log('\nOptions:')
    console.log('  --list-variations    Output item and variation IDs after connectivity tests')
    process.exit(0)
  }

  return options
}

function getHeaders() {
  return {
    'Square-Version': SQUARE_VERSION,
    'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  }
}

async function listCatalogVariations() {
  console.log('\nCatalog Variations')
  console.log('------------------')

  let cursor = undefined
  const items = []

  do {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
    const response = await fetch(`${SQUARE_BASE_URL}/v2/catalog/list${query}`, {
      method: 'GET',
      headers: getHeaders()
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`Error: Catalog list failed (${response.status}) ${text}`)
      return
    }

    const data = await response.json()
    const objects = data.objects || []
    objects.forEach(obj => {
      if (obj.type === 'ITEM' && obj.item_data?.variations?.length) {
        items.push({
          name: obj.item_data.name,
          variations: obj.item_data.variations.map(variation => ({
            name: variation.item_variation_data?.name,
            id: variation.id
          }))
        })
      }
    })

    cursor = data.cursor
  } while (cursor)

  if (items.length === 0) {
    console.log('No catalog items with variations found.')
    return
  }

  items.forEach(item => {
    console.log(`\nItem: ${item.name}`)
    item.variations.forEach(variation => {
      console.log(`  - ${variation.name}: ${variation.id}`)
    })
  })
}

async function testAPI(options) {
  console.log('Testing Square API Connectivity')
  console.log('===============================')
  
  try {
    // Test 1: List Locations
    console.log('\n1. Testing Locations API...')
    const locResponse = await fetch(`${SQUARE_BASE_URL}/v2/locations`, {
      method: 'GET',
      headers: getHeaders()
    })
    
    if (locResponse.ok) {
      const locData = await locResponse.json()
      console.log('   Success: Locations API reachable')
      console.log(`   Found ${locData.locations?.length || 0} locations`)
      if (locData.locations?.[0]) {
        console.log(`   Example: ${locData.locations[0].name} (${locData.locations[0].id})`)
      }
    } else {
      console.log(`   Failure: ${locResponse.status}`)
    }
    
    // Test 2: List Catalog Objects
    console.log('\n2. Testing Catalog API...')
    const catResponse = await fetch(`${SQUARE_BASE_URL}/v2/catalog/list`, {
      method: 'GET',
      headers: getHeaders()
    })
    
    if (catResponse.ok) {
      const catData = await catResponse.json()
      console.log('   Success: Catalog API reachable')
      console.log(`   Retrieved ${catData.objects?.length || 0} catalog objects (first page)`)
    } else {
      console.log(`   Failure: ${catResponse.status}`)
    }
    
    // Test 3: Search for Tax objects specifically
    console.log('\n3. Testing Tax Search...')
    const taxResponse = await fetch(`${SQUARE_BASE_URL}/v2/catalog/search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        object_types: ['TAX']
      })
    })
    
    if (taxResponse.ok) {
      const taxData = await taxResponse.json()
      console.log('   Success: Tax search reachable')
      console.log(`   Found ${taxData.objects?.length || 0} tax objects`)
      if (taxData.objects?.length > 0) {
        taxData.objects.forEach(tax => {
          const taxName = tax.tax_data?.name || 'Unnamed'
          const percentage = tax.tax_data?.percentage || '0'
          const enabled = tax.tax_data?.enabled ? 'enabled' : 'disabled'
          console.log(`   - ${taxName}: ${percentage}% (${enabled})`)
        })
      }
    } else {
      const errorText = await taxResponse.text()
      console.log(`   Failure: ${taxResponse.status} ${errorText}`)
    }
    
    console.log('\nAPI Tests Complete')

    if (options.listVariations) {
      await listCatalogVariations()
    }
    
  } catch (error) {
    console.error('API Test Error:', error.message)
  }
}

const options = parseArgs()
testAPI(options)
