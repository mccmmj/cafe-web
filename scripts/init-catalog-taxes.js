/**
 * Square Sandbox Tax Configuration via Catalog Objects
 * Run with: node scripts/init-catalog-taxes.js
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

async function createCatalogTax() {
  try {
    const taxObject = {
      type: 'TAX',
      id: '#sales-tax',
      tax_data: {
        name: 'Sales Tax',
        calculation_phase: 'TAX_SUBTOTAL_PHASE',
        inclusion_type: 'ADDITIVE',
        percentage: '8.25',
        enabled: true,
        applies_to_custom_amounts: true
      }
    }

    console.log('📝 Creating catalog tax object...')

    const response = await fetch(`${SQUARE_BASE_URL}/v2/catalog/batch-upsert`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        idempotency_key: `tax-creation-${Date.now()}-${Math.random()}`,
        batches: [
          {
            objects: [taxObject]
          }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Square API error: ${response.status} ${errorData}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating catalog tax:', error)
    throw error
  }
}

async function listCatalogTaxes() {
  try {
    const response = await fetch(`${SQUARE_BASE_URL}/v2/catalog/search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        object_types: ['TAX'],
        limit: 100
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Square API error: ${response.status} ${errorData}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error listing catalog taxes:', error)
    throw error
  }
}

async function initCatalogTaxes() {
  console.log('🏪 Square Sandbox Catalog Tax Initialization')
  console.log('===========================================')
  
  try {
    // Check existing tax objects
    console.log('🔍 Checking for existing tax objects...')
    const existingTaxes = await listCatalogTaxes()
    
    if (existingTaxes.objects && existingTaxes.objects.length > 0) {
      console.log(`ℹ️  Found ${existingTaxes.objects.length} existing tax objects:`)
      existingTaxes.objects.forEach(tax => {
        console.log(`   - ${tax.tax_data.name}: ${tax.tax_data.percentage}% (${tax.tax_data.enabled ? 'enabled' : 'disabled'})`)
      })
      console.log('✅ Tax configuration already exists')
      return
    }

    // Create new catalog tax
    console.log('📝 Creating catalog tax object...')
    const taxResult = await createCatalogTax()
    
    if (taxResult.objects && taxResult.objects.length > 0) {
      const tax = taxResult.objects[0]
      console.log('✅ Catalog tax created successfully!')
      console.log(`   ID: ${tax.id}`)
      console.log(`   Name: ${tax.tax_data.name}`)
      console.log(`   Rate: ${tax.tax_data.percentage}%`)
      console.log(`   Status: ${tax.tax_data.enabled ? 'Enabled' : 'Disabled'}`)
    }

    console.log('\n🎉 Tax initialization complete!')
    console.log('💰 Your checkout should now calculate taxes properly')
    console.log('🔗 Test payment processing with tax calculations')
    
  } catch (error) {
    console.error('❌ Tax initialization failed:', error.message)
    
    console.log('\nNote: Some Square sandbox accounts may not support tax configuration.')
    console.log('If taxes are not critical for testing, payment processing will still work.')
    
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  initCatalogTaxes()
}

module.exports = { initCatalogTaxes }