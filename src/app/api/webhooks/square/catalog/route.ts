import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!
const squareWebhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN!
const squareEnvironment = process.env.SQUARE_ENVIRONMENT

if (!supabaseUrl || !supabaseServiceKey || !squareAccessToken) {
  throw new Error('Missing required environment variables for Square webhook')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Square API configuration
const SQUARE_BASE_URL = squareEnvironment === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com'
const SQUARE_VERSION = '2024-12-18'

interface SquareCatalogWebhookEvent {
  type: 'catalog.version.updated'
  event_id: string
  created_at: string
  merchant_id: string
  data: {
    type: 'catalog_version'
    object: {
      catalog_version: {
        updated_at: string
      }
    }
  }
}

// Verify Square webhook signature
function verifySquareSignature(body: string, signature: string, secret: string): boolean {
  if (!secret || !signature) {
    console.warn('⚠️  Webhook signature verification skipped (no secret configured)')
    return true // Allow in development
  }

  try {
    const url = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/square/catalog`
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const payload = `${url}${body}${timestamp}`
    
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64')

    const expectedSignature = `sha256=${hash}`
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

function getSquareHeaders() {
  return {
    'Square-Version': SQUARE_VERSION,
    'Authorization': `Bearer ${squareAccessToken}`,
    'Content-Type': 'application/json'
  }
}

async function getLastCatalogSync() {
  try {
    const { data: lastSync, error } = await supabase
      .from('webhook_events')
      .select('processed_at, event_data')
      .eq('event_type', 'catalog.version.updated')
      .order('processed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn('Warning: Could not fetch last catalog sync time')
      return null
    }

    return lastSync?.processed_at ? new Date(lastSync.processed_at) : null
  } catch (error) {
    console.warn('Warning: Could not fetch last catalog sync time')
    return null
  }
}

async function fetchCatalogChanges(sinceTimestamp?: Date) {
  try {
    const query: any = {
      object_types: ['ITEM', 'CATEGORY'],
      include_related_objects: true
    }

    // If we have a timestamp, only fetch changes since then
    if (sinceTimestamp) {
      query.begin_time = sinceTimestamp.toISOString()
    }

    const response = await fetch(`${SQUARE_BASE_URL}/v2/catalog/search`, {
      method: 'POST',
      headers: getSquareHeaders(),
      body: JSON.stringify(query)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Square API error: ${response.status} ${errorData}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching catalog changes:', error)
    throw error
  }
}

async function syncCatalogChanges(catalogData: any) {
  if (!catalogData.objects || catalogData.objects.length === 0) {
    return { newItems: 0, updatedItems: 0, categories: 0 }
  }

  const categories = catalogData.objects.filter((obj: any) => obj.type === 'CATEGORY')
  const items = catalogData.objects.filter((obj: any) => obj.type === 'ITEM')
  
  let newItems = 0
  let updatedItems = 0

  // Get existing inventory items
  const { data: existingItems, error } = await supabase
    .from('inventory_items')
    .select('id, square_item_id, item_name, updated_at')

  if (error) {
    throw new Error(`Failed to fetch existing inventory: ${error.message}`)
  }

  const existingItemMap = new Map()
  existingItems.forEach(item => {
    existingItemMap.set(item.square_item_id, item)
  })

  // Get supplier mappings
  const { data: suppliers, error: supplierError } = await supabase
    .from('suppliers')
    .select('id, name')

  if (supplierError) {
    throw new Error(`Failed to fetch suppliers: ${supplierError.message}`)
  }

  // Process catalog items
  for (const item of items) {
    const existingItem = existingItemMap.get(item.id)
    
    if (existingItem) {
      // Update existing item (only item name and description from Square)
      const updates: any = {}
      
      if (item.item_data?.name && item.item_data.name !== existingItem.item_name) {
        updates.item_name = item.item_data.name
        updates.notes = (existingItem.notes || '') + ` [Square update: ${new Date().toISOString()}]`
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('inventory_items')
          .update(updates)
          .eq('id', existingItem.id)

        if (!updateError) {
          updatedItems++
          console.log(`✨ Updated item: ${item.item_data?.name}`)
        }
      }
    } else {
      // Create new inventory item with intelligent defaults
      const categoryObj = categories.find((cat: any) => cat.id === item.item_data?.category_id)
      const supplierId = mapItemToSupplier(item, categoryObj, suppliers)
      const defaults = generateInventoryDefaults(item, categoryObj)

      const newInventoryItem = {
        square_item_id: item.id,
        item_name: item.item_data?.name || 'Unknown Item',
        current_stock: defaults.current_stock,
        minimum_threshold: defaults.minimum_threshold,
        reorder_point: defaults.reorder_point,
        unit_cost: 0, // Default to 0, will be enriched later
        unit_type: defaults.unit_type,
        is_ingredient: defaults.is_ingredient,
        supplier_id: supplierId,
        location: defaults.location,
        notes: `Auto-created from Square webhook - Category: ${categoryObj?.category_data?.name || 'Unknown'}`
      }

      const { error: insertError } = await supabase
        .from('inventory_items')
        .insert([newInventoryItem])

      if (!insertError) {
        newItems++
        console.log(`🆕 Created new item: ${item.item_data?.name}`)
      }
    }
  }

  return { newItems, updatedItems, categories: categories.length }
}

// Helper functions (reused from other sync tools)
function mapItemToSupplier(item: any, category: any, suppliers: any[]) {
  const itemName = item.item_data?.name?.toLowerCase() || ''
  const categoryName = category?.category_data?.name?.toLowerCase() || ''
  
  const patterns = {
    'coffee': 'Premium Coffee Roasters',
    'dairy': 'Local Dairy Cooperative',
    'bakery': 'Denver Bakery Supply Co',
    'produce': 'Mountain Fresh Produce',
    'packaging': 'Eco-Friendly Packaging'
  }

  for (const [pattern, supplierName] of Object.entries(patterns)) {
    if (itemName.includes(pattern) || categoryName.includes(pattern)) {
      const supplier = suppliers.find(s => s.name === supplierName)
      if (supplier) return supplier.id
    }
  }

  return suppliers.length > 0 ? suppliers[0].id : null
}

function generateInventoryDefaults(item: any, category: any) {
  const itemName = item.item_data?.name?.toLowerCase() || ''
  
  let defaultStock = 10
  let minThreshold = 3
  let reorderPoint = 6
  let unitType: 'each' | 'lb' | 'oz' | 'gallon' | 'liter' | 'ml' = 'each'
  let location = 'main'
  let isIngredient = true

  // Apply intelligent defaults based on item patterns
  if (itemName.includes('coffee') || itemName.includes('bean')) {
    defaultStock = 25
    minThreshold = 5
    reorderPoint = 10
    unitType = 'lb'
    location = 'Coffee Storage'
  } else if (itemName.includes('milk')) {
    defaultStock = 20
    minThreshold = 5
    reorderPoint = 10
    unitType = 'gallon'
    location = 'Refrigerator'
  } else if (itemName.includes('muffin') || itemName.includes('cookie')) {
    defaultStock = 24
    minThreshold = 6
    reorderPoint = 12
    location = 'Display Case'
    isIngredient = false
  } else if (itemName.includes('cup')) {
    defaultStock = 500
    minThreshold = 100
    reorderPoint = 200
    location = 'Storage Room'
    isIngredient = false
  }

  return {
    current_stock: defaultStock,
    minimum_threshold: minThreshold,
    reorder_point: reorderPoint,
    unit_type: unitType,
    location: location,
    is_ingredient: isIngredient
  }
}

async function logWebhookEvent(event: SquareCatalogWebhookEvent, syncResult: any) {
  try {
    // Log webhook processing for audit trail
    const { error } = await supabase
      .from('webhook_events')
      .insert([{
        event_id: event.event_id,
        event_type: event.type,
        merchant_id: event.merchant_id,
        event_data: event,
        sync_result: syncResult,
        processed_at: new Date().toISOString()
      }])

    if (error) {
      console.warn('Warning: Could not log webhook event:', error.message)
    }
  } catch (error) {
    console.warn('Warning: Could not log webhook event:', error instanceof Error ? error.message : 'Unknown error')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const event: SquareCatalogWebhookEvent = JSON.parse(body)

    // Verify webhook signature if configured
    const headersList = await headers()
    const signature = headersList.get('x-square-signature') || ''
    if (squareWebhookSecret && !verifySquareSignature(body, signature, squareWebhookSecret)) {
      console.error('❌ Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log('📨 Received Square catalog webhook:', event.event_id)
    console.log('📅 Catalog updated at:', event.data.object.catalog_version.updated_at)

    // Check if this event was already processed
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('event_id', event.event_id)
      .maybeSingle()

    if (existingEvent) {
      console.log('⏩ Event already processed, skipping')
      return NextResponse.json({ message: 'Event already processed' })
    }

    // Get last sync timestamp
    const lastSync = await getLastCatalogSync()
    
    // Fetch catalog changes since last sync
    const catalogData = await fetchCatalogChanges(lastSync || undefined)
    
    // Sync changes to inventory
    const syncResult = await syncCatalogChanges(catalogData)
    
    // Log the webhook event
    await logWebhookEvent(event, syncResult)

    console.log('✅ Catalog webhook processed successfully')
    console.log(`🆕 New items: ${syncResult.newItems}`)
    console.log(`✨ Updated items: ${syncResult.updatedItems}`)

    return NextResponse.json({
      success: true,
      message: 'Catalog webhook processed successfully',
      event_id: event.event_id,
      sync_result: syncResult,
      processed_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Catalog webhook error:', error)
    
    // Always return 200 to Square to prevent retries for application errors
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processed_at: new Date().toISOString()
    }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Square catalog webhook endpoint',
    methods: ['POST'],
    description: 'Receives catalog.version.updated events from Square',
    features: [
      'Real-time catalog synchronization',
      'Automatic inventory item creation',
      'Intelligent supplier mapping',
      'Duplicate event prevention',
      'Audit trail logging'
    ],
    webhook_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/square/catalog`,
    required_permissions: ['ITEMS_READ'],
    required_env_vars: [
      'SQUARE_ACCESS_TOKEN',
      'SQUARE_WEBHOOK_SIGNATURE_KEY (optional but recommended)'
    ]
  })
}