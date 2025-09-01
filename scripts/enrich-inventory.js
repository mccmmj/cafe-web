#!/usr/bin/env node

/**
 * Inventory Enrichment Tool
 * Enriches existing inventory items with business-specific data from YAML
 * Usage: node scripts/enrich-inventory.js <yaml-file> [--dry-run] [--admin-email=email]
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
  console.log('\n🔄 Inventory Enrichment Tool')
  console.log('\nUsage:')
  console.log('  node scripts/enrich-inventory.js <yaml-file> [options]')
  console.log('\nOptions:')
  console.log('  --dry-run           Preview changes without applying them')
  console.log('  --admin-email=EMAIL Admin email for verification (default: jerry.mccommas@gmail.com)')
  console.log('\nExamples:')
  console.log('  node scripts/enrich-inventory.js inventory-enrichment-example.yaml --dry-run')
  console.log('  node scripts/enrich-inventory.js my-enrichments.yaml')
  console.log('  node scripts/enrich-inventory.js enrichments.yaml --admin-email=admin@example.com')
  console.log('')
}

function parseArgs() {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showUsage()
    process.exit(0)
  }

  const yamlFile = args[0]
  const dryRun = args.includes('--dry-run')
  
  let adminEmailArg = adminEmail
  const emailArg = args.find(arg => arg.startsWith('--admin-email='))
  if (emailArg) {
    adminEmailArg = emailArg.split('=')[1]
  }

  return { yamlFile, dryRun, adminEmail: adminEmailArg }
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

async function loadEnrichmentYaml(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`)
      process.exit(1)
    }

    const fileContent = fs.readFileSync(filePath, 'utf8')
    const data = yaml.load(fileContent)

    if (!data || !data.inventory_enrichments || !Array.isArray(data.inventory_enrichments)) {
      console.error('❌ Invalid YAML format. Expected structure:')
      console.error('   inventory_enrichments:')
      console.error('     - square_item_id: "..."')
      console.error('       unit_cost: 5.99')
      console.error('       ...')
      process.exit(1)
    }

    console.log(`✅ Loaded ${data.inventory_enrichments.length} enrichment entries from ${filePath}`)
    return data
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

    console.log(`✅ Found ${suppliers.length} suppliers for mapping`)
    return supplierMap
  } catch (error) {
    console.error('❌ Error getting supplier mappings:', error.message)
    process.exit(1)
  }
}

async function getExistingInventoryItems(supabase) {
  try {
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('id, square_item_id, item_name, unit_cost, current_stock, minimum_threshold, reorder_point, supplier_id, location, notes')

    if (error) {
      console.error('❌ Error fetching existing inventory:', error.message)
      process.exit(1)
    }

    const itemMap = {}
    items.forEach(item => {
      itemMap[item.square_item_id] = item
    })

    console.log(`✅ Found ${items.length} existing inventory items`)
    return itemMap
  } catch (error) {
    console.error('❌ Error getting existing inventory items:', error.message)
    process.exit(1)
  }
}

function validateEnrichments(enrichments, supplierMap, existingItems) {
  const errors = []
  const warnings = []

  enrichments.forEach((enrichment, index) => {
    const itemIndex = index + 1

    // Check required fields
    if (!enrichment.square_item_id) {
      errors.push(`Item ${itemIndex}: Missing required field "square_item_id"`)
    }

    // Check if item exists (for enrichment, not creation)
    const existingItem = existingItems[enrichment.square_item_id]
    if (!existingItem) {
      warnings.push(`Item ${itemIndex}: square_item_id "${enrichment.square_item_id}" not found in inventory (will be skipped)`)
      return // Skip further validation for non-existent items
    }

    // Validate supplier exists if specified
    if (enrichment.supplier_name && !supplierMap[enrichment.supplier_name]) {
      errors.push(`Item ${itemIndex}: Supplier "${enrichment.supplier_name}" not found in database`)
    }

    // Validate numeric fields
    const numericFields = ['unit_cost', 'current_stock', 'minimum_threshold', 'reorder_point']
    numericFields.forEach(field => {
      if (enrichment[field] !== undefined && (isNaN(enrichment[field]) || enrichment[field] < 0)) {
        errors.push(`Item ${itemIndex}: Field "${field}" must be a non-negative number`)
      }
    })

    // Validate reorder_point >= minimum_threshold
    if (enrichment.reorder_point !== undefined && enrichment.minimum_threshold !== undefined) {
      if (enrichment.reorder_point < enrichment.minimum_threshold) {
        errors.push(`Item ${itemIndex}: reorder_point (${enrichment.reorder_point}) must be >= minimum_threshold (${enrichment.minimum_threshold})`)
      }
    }

    // Validate unit_type if specified
    const validUnitTypes = ['each', 'lb', 'oz', 'gallon', 'liter', 'ml']
    if (enrichment.unit_type && !validUnitTypes.includes(enrichment.unit_type)) {
      errors.push(`Item ${itemIndex}: Invalid unit_type "${enrichment.unit_type}". Must be one of: ${validUnitTypes.join(', ')}`)
    }
  })

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    warnings.forEach(warning => console.log(`   ${warning}`))
  }

  if (errors.length > 0) {
    console.error('\n❌ Validation errors found:')
    errors.forEach(error => console.error(`   ${error}`))
    process.exit(1)
  }

  console.log('✅ All enrichment entries validated successfully')
}

function processEnrichments(enrichments, supplierMap, existingItems, enrichmentSettings) {
  const updates = []
  const stockMovements = []
  const stats = {
    processed: 0,
    updated: 0,
    skipped: 0,
    stockChanges: 0
  }

  console.log('\n🔄 Processing enrichment entries...')

  enrichments.forEach(enrichment => {
    stats.processed++
    
    const existingItem = existingItems[enrichment.square_item_id]
    if (!existingItem) {
      console.log(`⏩ Skipping non-existent item: ${enrichment.square_item_id}`)
      stats.skipped++
      return
    }

    // Build update object with only changed fields
    const updates_obj = {}
    const changes = []

    // Process each enrichment field
    Object.keys(enrichment).forEach(field => {
      if (field === 'square_item_id') return // Skip ID field
      
      let dbField = field
      let newValue = enrichment[field]

      // Handle special field mappings
      if (field === 'supplier_name') {
        dbField = 'supplier_id'
        newValue = supplierMap[enrichment[field]]
      } else if (field === 'custom_fields') {
        // Skip custom fields for now - would need JSON column or separate table
        return
      }

      // Check if value actually changed
      if (existingItem[dbField] !== newValue) {
        updates_obj[dbField] = newValue
        
        const oldValue = existingItem[dbField] || 'null'
        changes.push(`${field}: ${oldValue} → ${newValue}`)
        
        // Track stock changes for movements
        if (field === 'current_stock' && typeof newValue === 'number') {
          const previousStock = existingItem.current_stock || 0
          const stockChange = newValue - previousStock
          
          if (stockChange !== 0) {
            stockMovements.push({
              inventory_item_id: existingItem.id,
              movement_type: stockChange > 0 ? 'adjustment' : 'adjustment',
              quantity_change: stockChange,
              previous_stock: previousStock,
              new_stock: newValue,
              reference_id: 'ENRICHMENT',
              notes: `Stock adjustment via enrichment: ${stockChange > 0 ? '+' : ''}${stockChange}`
            })
            stats.stockChanges++
          }
        }
      }
    })

    if (Object.keys(updates_obj).length > 0) {
      updates.push({
        id: existingItem.id,
        square_item_id: existingItem.square_item_id,
        item_name: existingItem.item_name,
        updates: updates_obj,
        changes: changes
      })
      stats.updated++
      
      console.log(`✨ Updating ${existingItem.item_name}: ${changes.join(', ')}`)
    } else {
      console.log(`⏭  No changes for ${existingItem.item_name}`)
    }
  })

  return { updates, stockMovements, stats }
}

async function applyEnrichments(supabase, updates, stockMovements, dryRun) {
  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made')
    return { updatedItems: updates.length, movementsCreated: 0 }
  }

  if (updates.length === 0) {
    console.log('\nℹ️  No updates to apply')
    return { updatedItems: 0, movementsCreated: 0 }
  }

  console.log(`\n💾 Applying ${updates.length} enrichment updates...`)
  
  try {
    // Apply updates one by one for better error handling
    let successCount = 0
    
    for (const update of updates) {
      try {
        const { error } = await supabase
          .from('inventory_items')
          .update(update.updates)
          .eq('id', update.id)

        if (error) {
          console.error(`❌ Error updating ${update.item_name}:`, error.message)
        } else {
          successCount++
        }
      } catch (error) {
        console.error(`❌ Error updating ${update.item_name}:`, error.message)
      }
    }

    console.log(`✅ Successfully updated ${successCount} inventory items`)
    
    // Create stock movements
    let movementsCreated = 0
    if (stockMovements.length > 0) {
      console.log(`📊 Creating ${stockMovements.length} stock movements...`)
      
      const { data, error } = await supabase
        .from('stock_movements')
        .insert(stockMovements)
        .select('id')

      if (error) {
        console.error('⚠️  Warning: Could not create stock movements:', error.message)
      } else {
        movementsCreated = data.length
        console.log(`✅ Created ${movementsCreated} stock movement records`)
      }
    }

    return { updatedItems: successCount, movementsCreated }
  } catch (error) {
    console.error('❌ Error applying enrichments:', error.message)
    process.exit(1)
  }
}

function displayEnrichmentSummary(stats, applyResult, dryRun) {
  console.log('\n🎉 Inventory enrichment completed!')
  console.log('\n📋 Enrichment Summary:')
  console.log(`   🔄 Entries Processed: ${stats.processed}`)
  console.log(`   ✨ Items Updated: ${stats.updated}`)
  console.log(`   ⏭  Items Unchanged: ${stats.processed - stats.updated - stats.skipped}`)
  console.log(`   ⏩ Items Skipped: ${stats.skipped}`)
  console.log(`   📊 Stock Adjustments: ${stats.stockChanges}`)
  
  if (!dryRun) {
    console.log(`   💾 Database Updates Applied: ${applyResult.updatedItems}`)
    console.log(`   📈 Stock Movements Created: ${applyResult.movementsCreated}`)
  } else {
    console.log('   🔍 Mode: DRY RUN (no changes made)')
  }

  console.log('\n💡 Next steps:')
  console.log('   1. Review updated items at /admin/inventory')
  console.log('   2. Verify stock levels match physical counts')
  console.log('   3. Check supplier mappings are correct')
  if (dryRun) {
    console.log('   4. Run without --dry-run to apply changes')
  }
}

async function main() {
  const { yamlFile, dryRun, adminEmail: userEmail } = parseArgs()

  console.log('🔄 Inventory Enrichment Tool')
  console.log(`📄 YAML File: ${yamlFile}`)
  console.log(`🔍 Mode: ${dryRun ? 'DRY RUN' : 'APPLY CHANGES'}`)
  console.log(`👤 Admin: ${userEmail}`)
  console.log('')

  // Validate environment
  await validateEnvironment()

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Validate admin access
  await validateAdminAccess(supabase, userEmail)

  // Load enrichment YAML
  const enrichmentData = await loadEnrichmentYaml(yamlFile)

  // Get supplier mappings
  const supplierMap = await getSupplierMappings(supabase)

  // Get existing inventory items
  const existingItems = await getExistingInventoryItems(supabase)

  // Validate enrichment entries
  validateEnrichments(enrichmentData.inventory_enrichments, supplierMap, existingItems)

  // Process enrichments
  const { updates, stockMovements, stats } = processEnrichments(
    enrichmentData.inventory_enrichments, 
    supplierMap, 
    existingItems,
    enrichmentData.enrichment_settings
  )

  // Apply enrichments
  const applyResult = await applyEnrichments(supabase, updates, stockMovements, dryRun)

  // Display summary
  displayEnrichmentSummary(stats, applyResult, dryRun)
}

// Run the tool
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error.message)
    process.exit(1)
  })
}

module.exports = { main }