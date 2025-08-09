/**
 * Simple Square Sandbox Tax Initialization
 * Run with: node scripts/init-simple-taxes.js
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

async function listLocations() {
  try {
    const response = await fetch(`${SQUARE_BASE_URL}/v2/locations`, {
      method: 'GET',
      headers: getHeaders()
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Square API error: ${response.status} ${errorData}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error listing locations:', error)
    throw error
  }
}

async function createSalesTax(locationId) {
  try {
    const taxData = {
      tax: {
        name: 'Sales Tax',
        calculation_phase: 'TAX_SUBTOTAL_PHASE',
        inclusion_type: 'ADDITIVE',
        percentage: '8.25', // 8.25% tax rate
        enabled: true,
        applicable_location_ids: [locationId]
      }
    }

    console.log('📝 Creating sales tax with data:', JSON.stringify(taxData, null, 2))

    const response = await fetch(`${SQUARE_BASE_URL}/v2/taxes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(taxData)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Square API error: ${response.status} ${errorData}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating sales tax:', error)
    throw error
  }
}

async function listExistingTaxes() {
  try {
    const response = await fetch(`${SQUARE_BASE_URL}/v2/taxes`, {
      method: 'GET',
      headers: getHeaders()
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Square API error: ${response.status} ${errorData}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error listing taxes:', error)
    throw error
  }
}

async function initSimpleTaxes() {
  console.log('🏪 Square Sandbox Simple Tax Initialization')
  console.log('==========================================')
  
  try {
    // Check environment variables
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      throw new Error('SQUARE_ACCESS_TOKEN not found in environment')
    }

    // List locations to verify access
    console.log('🔍 Verifying location access...')
    const locationsResult = await listLocations()
    
    if (!locationsResult.locations || locationsResult.locations.length === 0) {
      throw new Error('No locations found in Square account')
    }

    const location = locationsResult.locations[0]
    console.log(`✅ Found location: ${location.name} (${location.id})`)

    // Check existing taxes
    console.log('🔍 Checking for existing tax configuration...')
    const existingTaxes = await listExistingTaxes()
    
    if (existingTaxes.taxes && existingTaxes.taxes.length > 0) {
      console.log(`ℹ️  Found ${existingTaxes.taxes.length} existing tax configurations:`)
      existingTaxes.taxes.forEach(tax => {
        console.log(`   - ${tax.name}: ${tax.percentage}% (${tax.enabled ? 'enabled' : 'disabled'})`)
      })
      console.log('✅ Tax configuration already exists')
      return
    }

    // Create new tax configuration
    console.log('📝 Creating sales tax configuration...')
    const taxResult = await createSalesTax(location.id)
    
    if (taxResult.tax) {
      console.log('✅ Sales tax created successfully!')
      console.log(`   Name: ${taxResult.tax.name}`)
      console.log(`   Rate: ${taxResult.tax.percentage}%`)
      console.log(`   Status: ${taxResult.tax.enabled ? 'Enabled' : 'Disabled'}`)
      console.log(`   Location: ${location.name}`)
    }

    console.log('\n🎉 Tax initialization complete!')
    console.log('💰 Your checkout should now calculate taxes properly')
    
  } catch (error) {
    console.error('❌ Tax initialization failed:', error.message)
    
    console.log('\nTroubleshooting:')
    console.log('1. Verify your Square sandbox credentials in .env.local')
    console.log('2. Ensure your Square application has proper permissions')
    console.log('3. Check that you are using the sandbox environment')
    
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  initSimpleTaxes()
}

module.exports = { initSimpleTaxes }