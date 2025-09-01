#!/usr/bin/env node

/**
 * Hybrid Inventory Sync Tool
 * Combines Square catalog sync with YAML enrichment for complete inventory management
 * Usage: node scripts/hybrid-sync.js [--dry-run] [--enrichment-file=yaml] [--admin-email=email]
 */

const fs = require('fs')
const yaml = require('js-yaml')
const { createClient } = require('@supabase/supabase-js')
const { main: squareSync } = require('./sync-square-catalog.js')
const { main: enrichInventory } = require('./enrich-inventory.js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY
const adminEmail = process.env.ADMIN_EMAIL || 'jerry.mccommas@gmail.com'

function showUsage() {
  console.log('\n🔄 Hybrid Inventory Sync Tool')
  console.log('\nCombines Square catalog discovery with YAML enrichment for complete inventory management.')
  console.log('\nUsage:')
  console.log('  node scripts/hybrid-sync.js [options]')
  console.log('\nOptions:')
  console.log('  --dry-run                    Preview all changes without applying them')
  console.log('  --enrichment-file=YAML       YAML file for enrichment (default: inventory-enrichment-example.yaml)')
  console.log('  --skip-square-sync           Skip Square catalog sync, only run enrichment')
  console.log('  --skip-enrichment            Skip enrichment, only run Square sync')
  console.log('  --admin-email=EMAIL          Admin email for verification (default: jerry.mccommas@gmail.com)')
  console.log('\nWorkflow:')
  console.log('  1. 📦 Sync Square catalog (discover new items)')
  console.log('  2. 🔄 Apply YAML enrichments (business data overlay)')
  console.log('  3. 📊 Generate comprehensive report')
  console.log('\nExamples:')
  console.log('  node scripts/hybrid-sync.js --dry-run')
  console.log('  node scripts/hybrid-sync.js --enrichment-file=my-enrichments.yaml')
  console.log('  node scripts/hybrid-sync.js --skip-square-sync')
  console.log('')
}

function parseArgs() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    showUsage()
    process.exit(0)
  }

  const dryRun = args.includes('--dry-run')
  const skipSquareSync = args.includes('--skip-square-sync')
  const skipEnrichment = args.includes('--skip-enrichment')
  
  let enrichmentFile = 'inventory-enrichment-example.yaml'
  const fileArg = args.find(arg => arg.startsWith('--enrichment-file='))
  if (fileArg) {
    enrichmentFile = fileArg.split('=')[1]
  }

  let adminEmailArg = adminEmail
  const emailArg = args.find(arg => arg.startsWith('--admin-email='))
  if (emailArg) {
    adminEmailArg = emailArg.split('=')[1]
  }

  return { dryRun, enrichmentFile, skipSquareSync, skipEnrichment, adminEmail: adminEmailArg }
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

async function checkEnrichmentFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Enrichment file not found: ${filePath}`)
    console.log('   Skipping enrichment phase')
    return false
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8')
    const data = yaml.load(fileContent)

    if (!data || !data.inventory_enrichments || !Array.isArray(data.inventory_enrichments)) {
      console.log(`⚠️  Invalid enrichment file format: ${filePath}`)
      console.log('   Skipping enrichment phase')
      return false
    }

    console.log(`✅ Enrichment file validated: ${data.inventory_enrichments.length} entries`)
    return true
  } catch (error) {
    console.log(`⚠️  Error reading enrichment file: ${error.message}`)
    console.log('   Skipping enrichment phase')
    return false
  }
}

async function getInventoryStats(supabase) {
  try {
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('id, current_stock, unit_cost, supplier_id')

    if (error) {
      console.error('Warning: Could not fetch inventory stats')
      return { totalItems: 0, totalValue: 0, itemsWithSuppliers: 0 }
    }

    const stats = {
      totalItems: items.length,
      totalValue: items.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.unit_cost || 0)), 0),
      itemsWithSuppliers: items.filter(item => item.supplier_id).length,
      itemsWithStock: items.filter(item => item.current_stock > 0).length
    }

    return stats
  } catch (error) {
    console.error('Warning: Could not fetch inventory stats')
    return { totalItems: 0, totalValue: 0, itemsWithSuppliers: 0, itemsWithStock: 0 }
  }
}

async function runSquareSync(dryRun, adminEmailArg) {
  console.log('\n📦 PHASE 1: Square Catalog Sync')
  console.log('=' .repeat(50))

  try {
    // Temporarily modify process.argv for the square sync script
    const originalArgv = process.argv
    process.argv = ['node', 'sync-square-catalog.js']
    
    if (dryRun) process.argv.push('--dry-run')
    process.argv.push(`--admin-email=${adminEmailArg}`)

    // Run square sync (this will handle all the logging)
    await squareSync()

    // Restore original argv
    process.argv = originalArgv

    console.log('✅ Square catalog sync completed')
    return true
  } catch (error) {
    console.error('❌ Square catalog sync failed:', error.message)
    process.argv = process.argv.slice(0, 2) // Restore argv on error too
    return false
  }
}

async function runEnrichment(enrichmentFile, dryRun, adminEmailArg) {
  console.log('\n🔄 PHASE 2: YAML Enrichment')
  console.log('=' .repeat(50))

  try {
    // Temporarily modify process.argv for the enrichment script
    const originalArgv = process.argv
    process.argv = ['node', 'enrich-inventory.js', enrichmentFile]
    
    if (dryRun) process.argv.push('--dry-run')
    process.argv.push(`--admin-email=${adminEmailArg}`)

    // Run enrichment (this will handle all the logging)
    await enrichInventory()

    // Restore original argv
    process.argv = originalArgv

    console.log('✅ Inventory enrichment completed')
    return true
  } catch (error) {
    console.error('❌ Inventory enrichment failed:', error.message)
    process.argv = process.argv.slice(0, 2) // Restore argv on error too
    return false
  }
}

function displayHybridSummary(beforeStats, afterStats, squareSyncRan, enrichmentRan, dryRun) {
  console.log('\n🎉 HYBRID SYNC COMPLETE!')
  console.log('=' .repeat(50))
  
  console.log('\n📊 Overall Summary:')
  console.log(`   📦 Total Inventory Items: ${beforeStats.totalItems} → ${afterStats.totalItems}`)
  
  const itemsAdded = afterStats.totalItems - beforeStats.totalItems
  if (itemsAdded > 0) {
    console.log(`   ✨ New Items Added: ${itemsAdded}`)
  }
  
  console.log(`   💰 Total Inventory Value: $${beforeStats.totalValue.toFixed(2)} → $${afterStats.totalValue.toFixed(2)}`)
  console.log(`   🏢 Items with Suppliers: ${beforeStats.itemsWithSuppliers} → ${afterStats.itemsWithSuppliers}`)
  console.log(`   📊 Items with Stock: ${beforeStats.itemsWithStock} → ${afterStats.itemsWithStock}`)
  
  console.log('\n🔄 Phases Executed:')
  console.log(`   📦 Square Catalog Sync: ${squareSyncRan ? '✅ Completed' : '⏩ Skipped'}`)
  console.log(`   🔄 YAML Enrichment: ${enrichmentRan ? '✅ Completed' : '⏩ Skipped'}`)
  console.log(`   🔍 Mode: ${dryRun ? 'DRY RUN (no changes made)' : 'CHANGES APPLIED'}`)

  console.log('\n💡 Recommended Workflow:')
  console.log('   1. 📦 Run hybrid sync to discover and enrich inventory')
  console.log('   2. 🔍 Review items at /admin/inventory')
  console.log('   3. 📝 Update enrichment YAML with accurate business data')
  console.log('   4. 🔄 Re-run enrichment to apply business data updates')
  console.log('   5. 📅 Schedule periodic Square sync for new menu items')

  if (dryRun) {
    console.log('\n🔄 To apply these changes, run without --dry-run')
  }
}

async function main() {
  const { dryRun, enrichmentFile, skipSquareSync, skipEnrichment, adminEmail: userEmail } = parseArgs()

  console.log('🔄 Hybrid Inventory Sync Tool')
  console.log(`👤 Admin: ${userEmail}`)
  console.log(`🔍 Mode: ${dryRun ? 'DRY RUN' : 'APPLY CHANGES'}`)
  console.log(`📄 Enrichment File: ${enrichmentFile}`)
  console.log('')

  // Validate environment
  await validateEnvironment()

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Validate admin access
  await validateAdminAccess(supabase, userEmail)

  // Get initial inventory stats
  console.log('📊 Collecting initial inventory statistics...')
  const beforeStats = await getInventoryStats(supabase)

  let squareSyncRan = false
  let enrichmentRan = false

  // Phase 1: Square Catalog Sync
  if (!skipSquareSync) {
    squareSyncRan = await runSquareSync(dryRun, userEmail)
    if (!squareSyncRan) {
      console.log('⚠️  Square sync failed, but continuing with enrichment phase...')
    }
  } else {
    console.log('\n📦 PHASE 1: Square Catalog Sync')
    console.log('=' .repeat(50))
    console.log('⏩ Skipping Square catalog sync (--skip-square-sync specified)')
  }

  // Phase 2: YAML Enrichment
  if (!skipEnrichment) {
    const enrichmentFileExists = await checkEnrichmentFile(enrichmentFile)
    
    if (enrichmentFileExists) {
      enrichmentRan = await runEnrichment(enrichmentFile, dryRun, userEmail)
      if (!enrichmentRan) {
        console.log('⚠️  Enrichment failed')
      }
    } else {
      console.log('\n🔄 PHASE 2: YAML Enrichment')
      console.log('=' .repeat(50))
      console.log('⏩ Skipping enrichment phase (file not found or invalid)')
    }
  } else {
    console.log('\n🔄 PHASE 2: YAML Enrichment')
    console.log('=' .repeat(50))
    console.log('⏩ Skipping YAML enrichment (--skip-enrichment specified)')
  }

  // Get final inventory stats
  console.log('\n📊 Collecting final inventory statistics...')
  const afterStats = await getInventoryStats(supabase)

  // Display comprehensive summary
  displayHybridSummary(beforeStats, afterStats, squareSyncRan, enrichmentRan, dryRun)
}

// Run the tool
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error.message)
    process.exit(1)
  })
}

module.exports = { main }