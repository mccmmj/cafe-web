#!/usr/bin/env node

/**
 * Bulk Inventory Upload Tool
 * Uploads inventory items from a YAML file to the database
 * Usage: node scripts/bulk-upload-inventory.js <yaml-file> [--replace] [--admin-email=email]
 */

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY

const adminEmail = process.env.ADMIN_EMAIL || 'jerry.mccommas@gmail.com'

function showUsage() {
  console.log('\n📋 Bulk Inventory Upload Tool')
  console.log('\nUsage:')
  console.log('  node scripts/bulk-upload-inventory.js <yaml-file> [options]')
  console.log('\nOptions:')
  console.log('  --replace           Replace all existing inventory items (default: merge)')
  console.log('  --admin-email=EMAIL Admin email for verification (default: jerry.mccommas@gmail.com)')
  console.log('\nExamples:')
  console.log('  node scripts/bulk-upload-inventory.js inventory-items-example.yaml')
  console.log('  node scripts/bulk-upload-inventory.js my-inventory.yaml --replace')
  console.log('  node scripts/bulk-upload-inventory.js inventory.yaml --admin-email=admin@example.com')
  console.log('')
}

function parseArgs() {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showUsage()
    process.exit(0)
  }

  const yamlFile = args[0]
  const replace = args.includes('--replace')
  
  let adminEmailArg = adminEmail
  const emailArg = args.find(arg => arg.startsWith('--admin-email='))
  if (emailArg) {
    adminEmailArg = emailArg.split('=')[1]
  }

  return { yamlFile, replace, adminEmail: adminEmailArg }
}

async function validateEnvironment() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - SUPABASE_SECRET_KEY')
    console.error('\n💡 Make sure these are set in your .env.local or .env file')
    process.exit(1)
  }

  console.log('✅ Environment variables loaded')
}

async function validateAdminAccess(supabase, email) {
  console.log(`🔐 Verifying admin access for: ${email}`)
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', email)
      .single()

    if (error) {
      console.error('❌ Error checking admin profile:', error.message)
      console.error('💡 Make sure the admin email exists in the profiles table with role="admin"')
      process.exit(1)
    }

    if (!profile || profile.role !== 'admin') {
      console.error('❌ Access denied: User is not an admin')
      console.error('💡 Make sure the user has role="admin" in the profiles table')
      process.exit(1)
    }

    console.log('✅ Admin access verified')
    return profile
  } catch (error) {
    console.error('❌ Failed to verify admin access:', error.message)
    process.exit(1)
  }
}

async function loadYamlFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`)
      process.exit(1)
    }

    const fileContent = fs.readFileSync(filePath, 'utf8')
    const data = yaml.load(fileContent)

    if (!data || !data.inventory_items || !Array.isArray(data.inventory_items)) {
      console.error('❌ Invalid YAML format. Expected structure:')
      console.error('   inventory_items:')
      console.error('     - square_item_id: "..."')
      console.error('       item_name: "..."')
      console.error('       ...')
      process.exit(1)
    }

    console.log(`✅ Loaded ${data.inventory_items.length} inventory items from ${filePath}`)
    return data.inventory_items
  } catch (error) {
    console.error('❌ Error loading YAML file:', error.message)
    process.exit(1)
  }
}

async function getSupplierMappings(supabase) {
  try {
    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('id, name')

    if (error) {
      console.error('❌ Error fetching suppliers:', error.message)
      process.exit(1)
    }

    const supplierMap = {}
    suppliers.forEach(supplier => {
      supplierMap[supplier.name] = supplier.id
    })

    console.log(`✅ Found ${suppliers.length} suppliers in database`)
    return supplierMap
  } catch (error) {
    console.error('❌ Error getting supplier mappings:', error.message)
    process.exit(1)
  }
}

function validateInventoryItems(items, supplierMap) {
  const errors = []
  const requiredFields = ['square_item_id', 'item_name', 'unit_type']
  const validUnitTypes = ['each', 'lb', 'oz', 'gallon', 'liter', 'ml']

  items.forEach((item, index) => {
    // Check required fields
    requiredFields.forEach(field => {
      if (!item[field]) {
        errors.push(`Item ${index + 1}: Missing required field "${field}"`)
      }
    })

    // Validate unit_type
    if (item.unit_type && !validUnitTypes.includes(item.unit_type)) {
      errors.push(`Item ${index + 1}: Invalid unit_type "${item.unit_type}". Must be one of: ${validUnitTypes.join(', ')}`)
    }

    // Validate supplier exists
    if (item.supplier_name && !supplierMap[item.supplier_name]) {
      errors.push(`Item ${index + 1}: Supplier "${item.supplier_name}" not found in database`)
    }

    // Validate numeric fields
    const numericFields = ['current_stock', 'minimum_threshold', 'reorder_point', 'unit_cost']
    numericFields.forEach(field => {
      if (item[field] !== undefined && (isNaN(item[field]) || item[field] < 0)) {
        errors.push(`Item ${index + 1}: Field "${field}" must be a non-negative number`)
      }
    })

    // Validate reorder_point >= minimum_threshold
    if (item.reorder_point !== undefined && item.minimum_threshold !== undefined) {
      if (item.reorder_point < item.minimum_threshold) {
        errors.push(`Item ${index + 1}: reorder_point (${item.reorder_point}) must be >= minimum_threshold (${item.minimum_threshold})`)
      }
    }
  })

  if (errors.length > 0) {
    console.error('❌ Validation errors found:')
    errors.forEach(error => console.error(`   ${error}`))
    process.exit(1)
  }

  console.log('✅ All inventory items validated successfully')
}

function transformInventoryItems(items, supplierMap) {
  return items.map(item => ({
    square_item_id: item.square_item_id,
    item_name: item.item_name,
    current_stock: item.current_stock || 0,
    minimum_threshold: item.minimum_threshold || 5,
    reorder_point: item.reorder_point || 10,
    unit_cost: item.unit_cost || 0,
    unit_type: item.unit_type || 'each',
    is_ingredient: item.is_ingredient !== false, // Default to true unless explicitly false
    supplier_id: item.supplier_name ? supplierMap[item.supplier_name] : null,
    location: item.location || 'main',
    notes: item.notes || null,
    last_restocked_at: item.last_restocked_at ? new Date(item.last_restocked_at) : null
  }))
}

async function clearExistingInventory(supabase) {
  console.log('🗑️  Clearing existing inventory items...')
  
  try {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found, which is OK
      console.error('❌ Error clearing inventory:', error.message)
      process.exit(1)
    }

    console.log('✅ Existing inventory items cleared')
  } catch (error) {
    console.error('❌ Error clearing inventory:', error.message)
    process.exit(1)
  }
}

async function insertInventoryItems(supabase, items) {
  console.log(`📦 Inserting ${items.length} inventory items...`)
  
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(items)
      .select('id, item_name, current_stock')

    if (error) {
      console.error('❌ Error inserting inventory items:', error.message)
      
      if (error.code === '23505') { // Unique violation
        console.error('💡 This might be due to duplicate square_item_id values')
        console.error('💡 Use --replace flag to clear existing items first')
      }
      
      process.exit(1)
    }

    console.log('✅ Inventory items inserted successfully')
    return data
  } catch (error) {
    console.error('❌ Error inserting inventory items:', error.message)
    process.exit(1)
  }
}

async function createStockMovements(supabase, inventoryItems) {
  console.log('📊 Creating initial stock movement records...')
  
  const stockMovements = inventoryItems
    .filter(item => item.current_stock > 0)
    .map(item => ({
      inventory_item_id: item.id,
      movement_type: 'purchase',
      quantity_change: item.current_stock,
      previous_stock: 0,
      new_stock: item.current_stock,
      reference_id: 'BULK_UPLOAD',
      notes: 'Initial inventory bulk upload'
    }))

  if (stockMovements.length === 0) {
    console.log('ℹ️  No stock movements to create (all items have zero stock)')
    return
  }

  try {
    const { error } = await supabase
      .from('stock_movements')
      .insert(stockMovements)

    if (error) {
      console.error('⚠️  Warning: Could not create stock movements:', error.message)
    } else {
      console.log(`✅ Created ${stockMovements.length} stock movement records`)
    }
  } catch (error) {
    console.error('⚠️  Warning: Could not create stock movements:', error.message)
  }
}

function displaySummary(items, supplierMap) {
  const stats = {
    total: items.length,
    ingredients: items.filter(item => item.is_ingredient).length,
    finished: items.filter(item => !item.is_ingredient).length,
    suppliers: new Set(items.filter(item => item.supplier_name).map(item => item.supplier_name)).size,
    totalStock: items.reduce((sum, item) => sum + (item.current_stock || 0), 0),
    totalValue: items.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.unit_cost || 0)), 0)
  }

  console.log('\n🎉 Bulk inventory upload completed successfully!')
  console.log('\n📋 Upload Summary:')
  console.log(`   📦 Total Items: ${stats.total}`)
  console.log(`   🧪 Ingredients: ${stats.ingredients}`)
  console.log(`   🍰 Finished Products: ${stats.finished}`)
  console.log(`   🏢 Suppliers Used: ${stats.suppliers}`)
  console.log(`   📊 Total Stock Units: ${stats.totalStock}`)
  console.log(`   💰 Total Inventory Value: $${stats.totalValue.toFixed(2)}`)
  console.log('\n💡 You can now view and manage inventory at /admin/inventory')
}

async function main() {
  const { yamlFile, replace, adminEmail: userEmail } = parseArgs()

  console.log('🏗️  Bulk Inventory Upload Tool')
  console.log(`📄 YAML File: ${yamlFile}`)
  console.log(`🔄 Mode: ${replace ? 'Replace' : 'Merge'}`)
  console.log(`👤 Admin: ${userEmail}`)
  console.log('')

  // Validate environment
  await validateEnvironment()

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Validate admin access
  await validateAdminAccess(supabase, userEmail)

  // Load and validate YAML file
  const inventoryItems = await loadYamlFile(yamlFile)

  // Get supplier mappings
  const supplierMap = await getSupplierMappings(supabase)

  // Validate inventory items
  validateInventoryItems(inventoryItems, supplierMap)

  // Transform items for database
  const transformedItems = transformInventoryItems(inventoryItems, supplierMap)

  // Clear existing inventory if replace mode
  if (replace) {
    await clearExistingInventory(supabase)
  }

  // Insert inventory items
  const insertedItems = await insertInventoryItems(supabase, transformedItems)

  // Create stock movements
  await createStockMovements(supabase, insertedItems)

  // Display summary
  displaySummary(inventoryItems, supplierMap)
}

// Run the tool
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error.message)
    process.exit(1)
  })
}

module.exports = { main }