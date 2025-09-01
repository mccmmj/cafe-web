import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables for hybrid sync')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface HybridSyncRequest {
  adminEmail: string
  dryRun?: boolean
  skipSquareSync?: boolean
  skipEnrichment?: boolean
  enrichmentData?: {
    inventory_enrichments: any[]
    enrichment_settings?: any
  }
}

interface ConflictResolution {
  strategy: 'square_wins' | 'yaml_wins' | 'merge'
  fieldStrategies?: Record<string, 'square_wins' | 'yaml_wins'>
}

async function validateAdminAccess(adminEmail: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('email', adminEmail)
    .single()

  if (error || !profile || profile.role !== 'admin') {
    throw new Error('Admin access required')
  }

  return profile
}

async function getInventoryStats() {
  const { data: items, error } = await supabase
    .from('inventory_items')
    .select('id, current_stock, unit_cost, supplier_id')

  if (error) {
    console.warn('Warning: Could not fetch inventory stats')
    return { totalItems: 0, totalValue: 0, itemsWithSuppliers: 0, itemsWithStock: 0 }
  }

  return {
    totalItems: items.length,
    totalValue: items.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.unit_cost || 0)), 0),
    itemsWithSuppliers: items.filter(item => item.supplier_id).length,
    itemsWithStock: items.filter(item => item.current_stock > 0).length
  }
}

async function runSquareSync(adminEmail: string, dryRun: boolean) {
  try {
    // Call the Square sync API endpoint internally
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/inventory/sync-square`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        adminEmail,
        dryRun
      })
    })

    if (!response.ok) {
      throw new Error(`Square sync API error: ${response.status}`)
    }

    const result = await response.json()
    return {
      success: result.success,
      summary: result.summary,
      newItems: result.newItems
    }
  } catch (error) {
    console.error('Square sync error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function runEnrichmentSync(adminEmail: string, enrichmentData: any, dryRun: boolean) {
  if (!enrichmentData || !enrichmentData.inventory_enrichments) {
    return {
      success: false,
      error: 'No enrichment data provided'
    }
  }

  try {
    // Get supplier mappings
    const { data: suppliers, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, name')

    if (supplierError) {
      throw new Error(`Failed to fetch suppliers: ${supplierError.message}`)
    }

    const supplierMap: Record<string, string> = {}
    suppliers.forEach(supplier => {
      supplierMap[supplier.name] = supplier.id
    })

    // Get existing inventory items
    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id, square_item_id, item_name, unit_cost, current_stock, minimum_threshold, reorder_point, supplier_id, location, notes')

    if (itemsError) {
      throw new Error(`Failed to fetch inventory items: ${itemsError.message}`)
    }

    const itemMap: Record<string, any> = {}
    items.forEach(item => {
      itemMap[item.square_item_id] = item
    })

    // Process enrichments with conflict resolution
    const updates: any[] = []
    const stockMovements: any[] = []
    const stats = {
      processed: 0,
      updated: 0,
      skipped: 0,
      stockChanges: 0
    }

    enrichmentData.inventory_enrichments.forEach((enrichment: any) => {
      stats.processed++
      
      const existingItem = itemMap[enrichment.square_item_id]
      if (!existingItem) {
        stats.skipped++
        return
      }

      // Build update object with conflict resolution
      const updates_obj: any = {}
      const changes: any[] = []

      // Apply enrichment settings for conflict resolution
      const settings = enrichmentData.enrichment_settings || {}
      const defaultStrategy = settings.conflict_resolution?.default_strategy || 'yaml_wins'
      const fieldStrategies = settings.conflict_resolution?.field_strategies || {}

      Object.keys(enrichment).forEach(field => {
        if (field === 'square_item_id') return
        
        let dbField = field
        let newValue = enrichment[field]

        // Handle special field mappings
        if (field === 'supplier_name') {
          dbField = 'supplier_id'
          newValue = supplierMap[enrichment[field]]
        } else if (field === 'custom_fields') {
          // Skip custom fields for now
          return
        }

        // Apply conflict resolution strategy
        const strategy = fieldStrategies[field] || defaultStrategy
        
        if (strategy === 'square_wins' && ['item_name', 'description'].includes(field)) {
          // Don't update these fields, let Square manage them
          return
        }

        // Check if value changed
        if (existingItem[dbField] !== newValue) {
          updates_obj[dbField] = newValue
          changes.push(`${field}: ${existingItem[dbField] || 'null'} → ${newValue}`)
          
          // Track stock changes
          if (field === 'current_stock' && typeof newValue === 'number') {
            const previousStock = existingItem.current_stock || 0
            const stockChange = newValue - previousStock
            
            if (stockChange !== 0) {
              stockMovements.push({
                inventory_item_id: existingItem.id,
                movement_type: 'adjustment',
                quantity_change: stockChange,
                previous_stock: previousStock,
                new_stock: newValue,
                reference_id: 'HYBRID_ENRICHMENT',
                notes: `Hybrid sync adjustment: ${stockChange > 0 ? '+' : ''}${stockChange}`
              })
              stats.stockChanges++
            }
          }
        }
      })

      if (Object.keys(updates_obj).length > 0) {
        updates.push({
          id: existingItem.id,
          updates: updates_obj,
          changes: changes
        })
        stats.updated++
      }
    })

    // Apply updates if not dry run
    if (!dryRun && updates.length > 0) {
      for (const update of updates) {
        const { error } = await supabase
          .from('inventory_items')
          .update(update.updates)
          .eq('id', update.id)

        if (error) {
          console.error(`Error updating item:`, error.message)
        }
      }

      // Create stock movements
      if (stockMovements.length > 0) {
        await supabase
          .from('stock_movements')
          .insert(stockMovements)
      }
    }

    return {
      success: true,
      stats,
      updates: dryRun ? updates : undefined
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: HybridSyncRequest = await request.json()

    if (!body.adminEmail) {
      return NextResponse.json(
        { error: 'Admin email is required' },
        { status: 400 }
      )
    }

    const dryRun = body.dryRun || false

    // Validate admin access
    await validateAdminAccess(body.adminEmail)

    // Get initial stats
    const beforeStats = await getInventoryStats()

    let squareResult = null
    let enrichmentResult = null

    // Phase 1: Square Catalog Sync
    if (!body.skipSquareSync) {
      squareResult = await runSquareSync(body.adminEmail, dryRun)
    }

    // Phase 2: YAML Enrichment
    if (!body.skipEnrichment && body.enrichmentData) {
      enrichmentResult = await runEnrichmentSync(body.adminEmail, body.enrichmentData, dryRun)
    }

    // Get final stats
    const afterStats = await getInventoryStats()

    const summary = {
      beforeStats,
      afterStats,
      phases: {
        squareSync: {
          ran: !body.skipSquareSync,
          result: squareResult
        },
        enrichment: {
          ran: !body.skipEnrichment && !!body.enrichmentData,
          result: enrichmentResult
        }
      },
      totalChanges: {
        itemsAdded: afterStats.totalItems - beforeStats.totalItems,
        valueChange: afterStats.totalValue - beforeStats.totalValue,
        supplierMappingChange: afterStats.itemsWithSuppliers - beforeStats.itemsWithSuppliers
      },
      dryRun
    }

    return NextResponse.json({
      success: true,
      message: `Hybrid inventory sync ${dryRun ? 'preview' : 'completed'} successfully`,
      summary
    })

  } catch (error) {
    console.error('Hybrid sync error:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Hybrid inventory sync API endpoint',
    methods: ['POST'],
    requiredFields: ['adminEmail'],
    optionalFields: ['dryRun', 'skipSquareSync', 'skipEnrichment', 'enrichmentData'],
    description: 'Combines Square catalog sync with YAML enrichment for complete inventory management',
    workflow: [
      'Phase 1: Sync Square catalog items (discover structure)',
      'Phase 2: Apply YAML enrichments (business data overlay)',
      'Phase 3: Generate comprehensive sync report'
    ],
    features: [
      'Two-phase hybrid approach',
      'Conflict resolution strategies',
      'Selective sync options',
      'Comprehensive reporting',
      'Admin access validation'
    ]
  })
}