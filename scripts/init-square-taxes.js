#!/usr/bin/env node

/**
 * Square Sandbox Tax Initialization Script
 * 
 * This script sets up basic tax configuration in the Square sandbox environment.
 * It creates a standard sales tax rate that can be used for testing purposes.
 * 
 * Usage:
 *   node scripts/init-square-taxes.js
 * 
 * Requirements:
 *   - SQUARE_ACCESS_TOKEN (sandbox)
 *   - SQUARE_LOCATION_ID (sandbox)
 *   - SQUARE_ENVIRONMENT=sandbox
 */

require('dotenv').config({ path: '.env.local' })

const SQUARE_BASE_URL = 'https://connect.squareupsandbox.com'
const SQUARE_VERSION = '2024-12-18'

function getHeaders() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN
  
  if (!accessToken) {
    throw new Error('SQUARE_ACCESS_TOKEN environment variable is required')
  }

  return {
    'Square-Version': SQUARE_VERSION,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
}

function getLocationId() {
  const locationId = process.env.SQUARE_LOCATION_ID
  
  if (!locationId) {
    throw new Error('SQUARE_LOCATION_ID environment variable is required')
  }
  
  return locationId
}

async function listExistingTaxes() {
  try {
    console.log('🔍 Checking for existing tax configuration...')
    
    const response = await fetch(`${SQUARE_BASE_URL}/v2/catalog/search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        object_types: ['TAX']
        // Remove the problematic exact_query - we'll filter enabled taxes in code
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Failed to search taxes: ${response.status} ${errorData}`)
    }

    const result = await response.json()
    // Filter for enabled taxes in code since API query was problematic
    const allTaxes = result.objects || []
    return allTaxes.filter(tax => tax.tax_data && tax.tax_data.enabled)
  } catch (error) {
    console.error('Error checking existing taxes:', error)
    return []
  }
}

async function createSalesTax() {
  try {
    console.log('📝 Creating sales tax configuration...')
    
    // Simplified tax object structure based on Square API docs
    const taxData = {
      type: 'TAX',
      id: `#tax_${Math.random().toString(36).substr(2, 9)}`,
      tax_data: {
        name: 'Sales Tax',
        calculation_phase: 'TAX_SUBTOTAL_PHASE',
        inclusion_type: 'ADDITIVE',
        percentage: '8.25',
        enabled: true,
        applies_to_custom_amounts: true
      }
    }

    const response = await fetch(`${SQUARE_BASE_URL}/v2/catalog/upsert`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        idempotency_key: `tax-init-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        object: taxData
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Tax creation failed:', errorData)
      throw new Error(`Failed to create tax: ${response.status} ${errorData}`)
    }

    const result = await response.json()
    console.log('✅ Sales tax created successfully!')
    console.log('Tax ID:', result.catalog_object?.id)
    console.log('Tax Name:', result.catalog_object?.tax_data?.name)
    console.log('Tax Percentage:', result.catalog_object?.tax_data?.percentage + '%')
    
    return result.catalog_object
  } catch (error) {
    console.error('Error creating sales tax:', error)
    throw error
  }
}

async function validateEnvironment() {
  console.log('🔧 Validating environment configuration...')
  
  const requiredVars = [
    'SQUARE_ACCESS_TOKEN',
    'SQUARE_LOCATION_ID'
  ]
  
  const missing = requiredVars.filter(varName => !process.env[varName])
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(varName => console.error(`  - ${varName}`))
    process.exit(1)
  }
  
  // Verify we're in sandbox mode
  if (process.env.SQUARE_ENVIRONMENT === 'production') {
    console.error('❌ This script should only be run in sandbox mode!')
    console.error('   Set SQUARE_ENVIRONMENT=sandbox or remove it (defaults to sandbox)')
    process.exit(1)
  }
  
  console.log('✅ Environment validation passed')
  console.log(`   Environment: ${process.env.SQUARE_ENVIRONMENT || 'sandbox'}`)
  console.log(`   Location ID: ${process.env.SQUARE_LOCATION_ID}`)
}

async function main() {
  try {
    console.log('🏪 Square Sandbox Tax Initialization')
    console.log('=====================================')
    
    // Validate environment
    await validateEnvironment()
    
    // Check for existing taxes
    const existingTaxes = await listExistingTaxes()
    
    if (existingTaxes.length > 0) {
      console.log('ℹ️  Found existing tax configuration:')
      existingTaxes.forEach(tax => {
        console.log(`   - ${tax.tax_data?.name}: ${tax.tax_data?.percentage}% (${tax.tax_data?.enabled ? 'enabled' : 'disabled'})`)
      })
      
      console.log('\n⚠️  Tax configuration already exists in sandbox.')
      console.log('   The application will use the existing configuration.')
      console.log('   If you need to modify taxes, use the Square Dashboard.')
      return
    }
    
    console.log('ℹ️  No tax configuration found. Creating default tax setup...')
    
    // Create sales tax
    const taxObject = await createSalesTax()
    
    console.log('\n🎉 Tax initialization completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Test the payment flow in your application')
    console.log('2. Verify that taxes are calculated correctly')
    console.log('3. Configure additional tax rates if needed via Square Dashboard')
    console.log('\nNote: This is a sandbox configuration for testing only.')
    
  } catch (error) {
    console.error('\n❌ Tax initialization failed:', error.message)
    console.error('\nTroubleshooting:')
    console.error('1. Verify your Square sandbox credentials in .env.local')
    console.error('2. Ensure your Square application has catalog permissions')
    console.error('3. Check the Square Developer Console for additional errors')
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  main()
}

module.exports = { main, createSalesTax, listExistingTaxes }