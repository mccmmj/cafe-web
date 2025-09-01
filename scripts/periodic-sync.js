#!/usr/bin/env node

/**
 * Periodic Inventory Sync Tool
 * Scheduled sync with conflict resolution for ongoing inventory management
 * Usage: node scripts/periodic-sync.js [--mode=sync|enrich|hybrid] [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Load environment variables
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY
const adminEmail = process.env.ADMIN_EMAIL || 'jerry.mccommas@gmail.com'

function showUsage() {
  console.log('\n⏰ Periodic Inventory Sync Tool')
  console.log('\nScheduled synchronization with smart conflict resolution for ongoing inventory management.')
  console.log('\nUsage:')
  console.log('  node scripts/periodic-sync.js [options]')
  console.log('\nOptions:')
  console.log('  --mode=MODE     Sync mode: sync|enrich|hybrid (default: hybrid)')
  console.log('  --dry-run       Preview changes without applying them')
  console.log('  --force         Override data freshness checks')
  console.log('  --admin-email   Admin email for verification')
  console.log('\nSync Modes:')
  console.log('  sync      Square catalog sync only (discover new items)')
  console.log('  enrich    YAML enrichment only (update business data)')
  console.log('  hybrid    Full two-phase sync (recommended for scheduled runs)')
  console.log('\nExamples:')
  console.log('  node scripts/periodic-sync.js --dry-run')
  console.log('  node scripts/periodic-sync.js --mode=sync')
  console.log('  node scripts/periodic-sync.js --mode=enrich')
  console.log('')
}

function parseArgs() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    showUsage()
    process.exit(0)
  }

  const dryRun = args.includes('--dry-run')
  const force = args.includes('--force')
  
  let mode = 'hybrid'
  const modeArg = args.find(arg => arg.startsWith('--mode='))
  if (modeArg) {
    mode = modeArg.split('=')[1]
    if (!['sync', 'enrich', 'hybrid'].includes(mode)) {
      console.error('❌ Invalid mode. Must be: sync, enrich, or hybrid')
      process.exit(1)
    }
  }

  let adminEmailArg = adminEmail
  const emailArg = args.find(arg => arg.startsWith('--admin-email='))
  if (emailArg) {
    adminEmailArg = emailArg.split('=')[1]
  }

  return { mode, dryRun, force, adminEmail: adminEmailArg }
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

async function checkDataFreshness(supabase) {
  try {
    // Check when inventory was last updated
    const { data: recentUpdate, error } = await supabase
      .from('inventory_items')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !recentUpdate) {
      return { needsSync: true, reason: 'No inventory data found' }
    }

    const lastUpdate = new Date(recentUpdate.updated_at)
    const now = new Date()
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

    // Check Square catalog freshness (if we've synced from Square before)
    const { data: squareSyncRecord, error: syncError } = await supabase
      .from('stock_movements')
      .select('created_at')
      .eq('reference_id', 'SQUARE_SYNC')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let hoursSinceSquareSync = Infinity
    if (!syncError && squareSyncRecord) {
      const lastSquareSync = new Date(squareSyncRecord.created_at)
      hoursSinceSquareSync = (now.getTime() - lastSquareSync.getTime()) / (1000 * 60 * 60)
    }

    return {
      needsSync: hoursSinceUpdate > 24 || hoursSinceSquareSync > 168, // Daily enrichment, weekly Square sync
      lastInventoryUpdate: lastUpdate,
      lastSquareSync: squareSyncRecord ? new Date(squareSyncRecord.created_at) : null,
      hoursSinceUpdate,
      hoursSinceSquareSync: hoursSinceSquareSync === Infinity ? null : hoursSinceSquareSync,
      reason: hoursSinceSquareSync > 168 ? 'Square catalog sync overdue' : 
              hoursSinceUpdate > 24 ? 'Inventory data stale' : 'Data is current'
    }
  } catch (error) {
    console.error('Warning: Could not check data freshness:', error.message)
    return { needsSync: true, reason: 'Could not determine data freshness' }
  }
}

function generatePeriodicEnrichment(existingItems) {
  // Generate smart enrichment suggestions based on patterns
  const suggestions = []
  
  existingItems.forEach(item => {
    const enrichment = {
      square_item_id: item.square_item_id,
      // Don't modify item_name - let Square manage it
    }

    let hasChanges = false

    // Suggest cost updates for zero-cost items
    if (!item.unit_cost || item.unit_cost === 0) {
      const estimatedCost = estimateUnitCost(item.item_name, item.unit_type)
      if (estimatedCost > 0) {
        enrichment.unit_cost = estimatedCost
        hasChanges = true
      }
    }

    // Suggest threshold adjustments based on item type
    const suggestedThresholds = calculateThresholds(item.item_name, item.current_stock)
    if (suggestedThresholds.minimum !== item.minimum_threshold) {
      enrichment.minimum_threshold = suggestedThresholds.minimum
      hasChanges = true
    }
    if (suggestedThresholds.reorder !== item.reorder_point) {
      enrichment.reorder_point = suggestedThresholds.reorder
      hasChanges = true
    }

    // Add location suggestions
    const suggestedLocation = suggestLocation(item.item_name)
    if (suggestedLocation !== item.location) {
      enrichment.location = suggestedLocation
      hasChanges = true
    }

    if (hasChanges) {
      suggestions.push(enrichment)
    }
  })

  return suggestions
}

function estimateUnitCost(itemName, unitType) {
  const name = itemName.toLowerCase()
  
  // Coffee and espresso
  if (name.includes('coffee') || name.includes('espresso')) {
    return unitType === 'lb' ? 10.00 : 6.00
  }
  
  // Dairy products
  if (name.includes('milk')) {
    return unitType === 'gallon' ? 4.50 : 3.00
  }
  
  // Syrups and flavorings
  if (name.includes('syrup') || name.includes('sauce')) {
    return 6.50
  }
  
  // Baked goods
  if (name.includes('muffin') || name.includes('cookie') || name.includes('croissant')) {
    return 1.80
  }
  
  // Beverages
  if (name.includes('juice') || name.includes('lemonade')) {
    return 1.25
  }
  
  // Default estimate
  return 2.00
}

function calculateThresholds(itemName, currentStock) {
  const name = itemName.toLowerCase()
  
  // High-turnover items need higher thresholds
  if (name.includes('milk') || name.includes('egg') || name.includes('bread')) {
    return {
      minimum: Math.max(Math.floor(currentStock * 0.2), 8),
      reorder: Math.max(Math.floor(currentStock * 0.4), 15)
    }
  }
  
  // Packaging supplies need very high thresholds
  if (name.includes('cup') || name.includes('lid') || name.includes('napkin')) {
    return {
      minimum: Math.max(Math.floor(currentStock * 0.15), 100),
      reorder: Math.max(Math.floor(currentStock * 0.3), 200)
    }
  }
  
  // Standard thresholds
  return {
    minimum: Math.max(Math.floor(currentStock * 0.15), 3),
    reorder: Math.max(Math.floor(currentStock * 0.25), 5)
  }
}

function suggestLocation(itemName) {
  const name = itemName.toLowerCase()
  
  if (name.includes('coffee') || name.includes('espresso') || name.includes('bean')) {
    return 'Coffee Storage'
  }
  if (name.includes('milk') || name.includes('cream') || name.includes('egg') || name.includes('dairy')) {
    return 'Walk-in Refrigerator'
  }
  if (name.includes('syrup') || name.includes('sauce') || name.includes('flavoring')) {
    return 'Beverage Station'
  }
  if (name.includes('muffin') || name.includes('cookie') || name.includes('pastry')) {
    return 'Display Case'
  }
  if (name.includes('cup') || name.includes('lid') || name.includes('packaging')) {
    return 'Storage Room'
  }
  if (name.includes('juice') || name.includes('water') || name.includes('beverage')) {
    return 'Refrigerated Cooler'
  }
  
  return 'main'
}

function displayPeriodicSummary(freshness, results, mode, dryRun) {
  console.log('\n⏰ PERIODIC SYNC COMPLETE!')
  console.log('=' .repeat(50))
  
  console.log('\n📊 Data Freshness Check:')
  console.log(`   📅 Last Inventory Update: ${freshness.lastInventoryUpdate || 'Never'}`)
  console.log(`   📦 Last Square Sync: ${freshness.lastSquareSync || 'Never'}`)
  console.log(`   ✅ Sync Needed: ${freshness.needsSync ? 'Yes' : 'No'} (${freshness.reason})`)
  
  console.log('\n🔄 Sync Results:')
  if (results.squareSync) {
    console.log(`   📦 Square Sync: ${results.squareSync.success ? '✅ Success' : '❌ Failed'}`)
    if (results.squareSync.summary) {
      console.log(`      🆕 New Items: ${results.squareSync.summary.squareStats?.new || 0}`)
    }
  }
  
  if (results.enrichment) {
    console.log(`   🔄 Enrichment: ${results.enrichment.success ? '✅ Success' : '❌ Failed'}`)
    if (results.enrichment.stats) {
      console.log(`      ✨ Items Updated: ${results.enrichment.stats.updated}`)
      console.log(`      📊 Stock Changes: ${results.enrichment.stats.stockChanges}`)
    }
  }

  console.log(`\n🔍 Mode: ${dryRun ? 'DRY RUN (no changes made)' : 'CHANGES APPLIED'}`)
  console.log(`📋 Sync Type: ${mode.toUpperCase()}`)

  console.log('\n💡 Scheduling Recommendations:')
  console.log('   🕐 Daily: Run enrichment sync to update business data')
  console.log('   📅 Weekly: Run hybrid sync to discover new Square items')
  console.log('   🛠️  Manual: Run after adding new menu items in Square')
  console.log('   🔍 Always: Use --dry-run first for large changes')
}

async function main() {
  const { mode, dryRun, force, adminEmail: userEmail } = parseArgs()

  console.log('⏰ Periodic Inventory Sync Tool')
  console.log(`📋 Mode: ${mode.toUpperCase()}`)
  console.log(`🔍 Run Type: ${dryRun ? 'DRY RUN' : 'APPLY CHANGES'}`)
  console.log(`👤 Admin: ${userEmail}`)
  console.log('')

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Validate admin access
  await validateAdminAccess(supabase, userEmail)

  // Check data freshness
  console.log('📊 Checking data freshness...')
  const freshness = await checkDataFreshness(supabase)
  
  if (!freshness.needsSync && !force) {
    console.log('✅ Inventory data is current, no sync needed')
    console.log('💡 Use --force to override this check')
    return
  }

  const results = {
    squareSync: null,
    enrichment: null
  }

  // Execute based on mode
  if (mode === 'sync' || mode === 'hybrid') {
    console.log('\n📦 Running Square catalog sync...')
    
    // For periodic sync, we'll call the API endpoints
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/inventory/sync-square`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: userEmail,
          dryRun
        })
      })

      if (response.ok) {
        results.squareSync = await response.json()
      } else {
        results.squareSync = { success: false, error: `HTTP ${response.status}` }
      }
    } catch (error) {
      results.squareSync = { success: false, error: error.message }
    }
  }

  if (mode === 'enrich' || mode === 'hybrid') {
    console.log('\n🔄 Running inventory enrichment...')
    
    // Check for default enrichment file
    const enrichmentFile = 'inventory-enrichment-example.yaml'
    if (fs.existsSync(enrichmentFile)) {
      try {
        // Run enrichment via CLI tool since it has the logic already
        const { main: enrichMain } = require('./enrich-inventory.js')
        
        // Temporarily set argv for the enrichment tool
        const originalArgv = process.argv
        process.argv = ['node', 'enrich-inventory.js', enrichmentFile]
        if (dryRun) process.argv.push('--dry-run')
        process.argv.push(`--admin-email=${userEmail}`)

        await enrichMain()
        
        // Restore argv
        process.argv = originalArgv
        
        results.enrichment = { success: true }
      } catch (error) {
        process.argv = process.argv.slice(0, 2) // Restore argv on error
        results.enrichment = { success: false, error: error.message }
      }
    } else {
      console.log('⚠️  No enrichment file found, skipping enrichment phase')
      results.enrichment = { success: false, error: 'No enrichment file found' }
    }
  }

  // Display summary
  displayPeriodicSummary(freshness, results, mode, dryRun)

  // Log sync completion for tracking
  if (!dryRun && (results.squareSync?.success || results.enrichment?.success)) {
    try {
      await supabase
        .from('stock_movements')
        .insert({
          inventory_item_id: null, // System record
          movement_type: 'adjustment',
          quantity_change: 0,
          previous_stock: 0,
          new_stock: 0,
          reference_id: 'PERIODIC_SYNC',
          notes: `Periodic sync completed - Mode: ${mode}, Results: Square=${results.squareSync?.success || 'skipped'}, Enrichment=${results.enrichment?.success || 'skipped'}`
        })
    } catch (error) {
      // Don't fail the sync if we can't log it
      console.log('Note: Could not log sync completion')
    }
  }
}

// Run the tool
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error.message)
    process.exit(1)
  })
}

module.exports = { main }