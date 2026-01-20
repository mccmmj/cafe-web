#!/usr/bin/env node

/**
 * Validate Square IDs attached to inventory_items.
 *
 * Output:
 * - CSV report with valid/invalid Square IDs and display names.
 *
 * Usage:
 * - node scripts/validate-square-inventory-ids.js
 * - node scripts/validate-square-inventory-ids.js --out data/square-inventory-id-validation.csv
 * - node scripts/validate-square-inventory-ids.js --include-archived
 *
 * Env (loaded from .env.local and .env, plus shell env):
 * - NEXT_PUBLIC_SUPABASE_URL (or PUBLIC_SUPABASE_URL)
 * - SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 * - SQUARE_ACCESS_TOKEN
 * - SQUARE_ENVIRONMENT ('production' or 'sandbox')
 */

const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('@supabase/supabase-js')

let fetchFn
if (typeof globalThis.fetch === 'undefined') {
  fetchFn = require('node-fetch')
} else {
  fetchFn = globalThis.fetch
}

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const SQUARE_VERSION = '2024-12-18'

function parseArgs(argv) {
  const args = {
    out: 'data/square-inventory-id-validation.csv',
    includeArchived: false,
  }

  const tokens = argv.slice(2)
  if (tokens.includes('--help') || tokens.includes('-h')) {
    args.help = true
    return args
  }

  const outIdx = tokens.findIndex(t => t === '--out')
  if (outIdx !== -1 && tokens[outIdx + 1]) {
    args.out = tokens[outIdx + 1]
  }

  if (tokens.includes('--include-archived')) {
    args.includeArchived = true
  }

  return args
}

function showUsage() {
  console.log('\n🧾 Validate Square IDs on inventory_items')
  console.log('\nUsage:')
  console.log('  node scripts/validate-square-inventory-ids.js [options]')
  console.log('\nOptions:')
  console.log('  --out PATH             CSV output path (default: data/square-inventory-id-validation.csv)')
  console.log('  --include-archived     Include archived inventory items')
  console.log('')
  console.log('Env:')
  console.log('  NEXT_PUBLIC_SUPABASE_URL (or PUBLIC_SUPABASE_URL)')
  console.log('  SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)')
  console.log('  SQUARE_ACCESS_TOKEN')
  console.log('  SQUARE_ENVIRONMENT=production|sandbox')
  console.log('')
}

function ensureParentDir(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function toCsvRow(fields) {
  return fields
    .map(value => {
      if (value === null || value === undefined) return ''
      const text = String(value)
      if (text.includes('"') || text.includes(',') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`
      }
      return text
    })
    .join(',')
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function createSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.PUBLIC_SUPABASE_URL
    || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase config: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(url, key)
}

function getSquareBaseUrl() {
  const env = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase()
  return env === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com'
}

async function makeSquareRequest(endpoint, method, body) {
  const token = process.env.SQUARE_ACCESS_TOKEN
  if (!token) throw new Error('Missing SQUARE_ACCESS_TOKEN')

  const baseUrl = getSquareBaseUrl()
  const response = await fetchFn(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      'Square-Version': SQUARE_VERSION,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }

  if (!response.ok) {
    const detail = json?.errors?.[0]?.detail || json?.message || text
    throw new Error(`Square API error (${response.status}): ${detail}`)
  }

  return json
}

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

function buildSquareIndex(batchRetrieveResponse) {
  const byId = new Map()

  for (const obj of batchRetrieveResponse?.objects || []) {
    if (obj?.id) byId.set(obj.id, obj)
  }
  for (const obj of batchRetrieveResponse?.related_objects || []) {
    if (obj?.id) byId.set(obj.id, obj)
  }

  return byId
}

function getObjectDisplayName(squareIndex, object) {
  if (!object) return null

  if (object.type === 'ITEM') {
    return object.item_data?.name || null
  }

  if (object.type === 'ITEM_VARIATION') {
    const variationName = object.item_variation_data?.name || null
    const parentId = object.item_variation_data?.item_id || null
    const parent = parentId ? squareIndex.get(parentId) : null
    const parentName = parent?.item_data?.name || null

    if (parentName && variationName) {
      const normalizedVar = normalizeName(variationName)
      if (normalizedVar === 'regular' || normalizedVar === 'default') return parentName
      return `${parentName} - ${variationName}`
    }

    return parentName || variationName
  }

  return null
}

async function fetchInventoryItems(supabase, includeArchived) {
  let query = supabase
    .from('inventory_items')
    .select('id, item_name, square_item_id, deleted_at')
    .order('item_name', { ascending: true })

  if (!includeArchived) {
    query = query.is('deleted_at', null)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch inventory_items: ${error.message}`)
  return data ?? []
}

async function fetchSalesUsage(supabase) {
  const pageSize = 1000
  let offset = 0
  const usage = new Map()

  while (true) {
    const { data, error } = await supabase
      .from('sales_transaction_items')
      .select('square_catalog_object_id, inventory_item_id')
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) throw new Error(`Failed to fetch sales_transaction_items: ${error.message}`)
    if (!data || data.length === 0) break

    for (const row of data) {
      const id = row.square_catalog_object_id || null
      if (!id) continue
      const existing = usage.get(id) || { total: 0, matched: 0, unmatched: 0 }
      existing.total += 1
      if (row.inventory_item_id) existing.matched += 1
      else existing.unmatched += 1
      usage.set(id, existing)
    }

    offset += pageSize
  }

  return usage
}

async function main() {
  const args = parseArgs(process.argv)
  if (args.help) {
    showUsage()
    process.exit(0)
  }

  const supabase = createSupabase()
  const squareEnv = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase()
  console.log(`📦 Square environment: ${squareEnv}`)

  console.log('📥 Loading inventory items...')
  const inventoryItems = await fetchInventoryItems(supabase, args.includeArchived)

  const withSquareId = inventoryItems.filter(item => item.square_item_id)
  const uniqueInventoryIds = [...new Set(withSquareId.map(item => item.square_item_id))]

  console.log('📊 Loading sales usage...')
  const salesUsage = await fetchSalesUsage(supabase)
  const salesIds = [...salesUsage.keys()]

  // Union so we can reason about ITEM vs VARIATION presence across inventory and sales.
  const allSquareIds = [...new Set([...uniqueInventoryIds, ...salesIds])]

  console.log(`🔎 Fetching Square metadata for ${allSquareIds.length} IDs (inventory + sales)...`)
  const squareIndex = new Map()
  const missingIds = new Set()

  // Square batch retrieve max size depends on API; use 100 for safety.
  for (const part of chunk(allSquareIds, 100)) {
    const res = await makeSquareRequest('/v2/catalog/batch-retrieve', 'POST', {
      object_ids: part,
      include_related_objects: true,
    })
    const index = buildSquareIndex(res)
    for (const [id, obj] of index.entries()) {
      squareIndex.set(id, obj)
    }
    for (const id of part) {
      if (!squareIndex.has(id)) missingIds.add(id)
    }
  }

  const rows = []
  let validCount = 0
  let invalidCount = 0
  let missingCount = 0

  for (const item of inventoryItems) {
    const squareId = item.square_item_id || null
    if (!squareId) {
      missingCount += 1
      continue
    }

    const squareObj = squareIndex.get(squareId) || null
    const squareName = getObjectDisplayName(squareIndex, squareObj)
    const status = squareObj ? 'valid' : 'invalid'
    const squareType = squareObj?.type || null

    const usage = salesUsage.get(squareId) || { total: 0, matched: 0, unmatched: 0 }
    const salesPresent = usage.total > 0

    // Check if sales are hitting a child variation while inventory is on the ITEM id.
    let variationSalesPresent = false
    if (squareObj?.type === 'ITEM') {
      for (const [id, obj] of squareIndex.entries()) {
        if (obj?.type !== 'ITEM_VARIATION') continue
        const parentId = obj.item_variation_data?.item_id
        if (parentId === squareId) {
          const childUsage = salesUsage.get(id)
          if (childUsage?.total > 0) {
            variationSalesPresent = true
            break
          }
        }
      }
    }

    const suspectItemVariationMismatch = squareObj?.type === 'ITEM' && !salesPresent && variationSalesPresent

    if (status === 'valid') validCount += 1
    if (status === 'invalid') invalidCount += 1

    rows.push({
      status,
      inventory_id: item.id,
      inventory_name: item.item_name,
      square_item_id: squareId,
      square_item_name: squareName,
      square_object_type: squareType,
      inventory_archived: item.deleted_at ? 'true' : 'false',
      sales_total_for_square_id: usage.total,
      sales_matched_for_square_id: usage.matched,
      sales_unmatched_for_square_id: usage.unmatched,
      sales_present: salesPresent ? 'true' : 'false',
      variation_sales_present: variationSalesPresent ? 'true' : 'false',
      suspect_item_variation_mismatch: suspectItemVariationMismatch ? 'true' : 'false',
    })
  }

  ensureParentDir(args.out)
  const header = [
    'status',
    'inventory_id',
    'inventory_name',
    'square_item_id',
    'square_item_name',
    'square_object_type',
    'inventory_archived',
    'sales_total_for_square_id',
    'sales_matched_for_square_id',
    'sales_unmatched_for_square_id',
    'sales_present',
    'variation_sales_present',
    'suspect_item_variation_mismatch',
  ]
  const csv = [
    toCsvRow(header),
    ...rows.map(row => toCsvRow(header.map(key => row[key]))),
  ].join('\n')

  fs.writeFileSync(args.out, csv, 'utf8')

  console.log(`✅ Report written to ${args.out}`)
  console.log(`Inventory items: ${inventoryItems.length}`)
  console.log(`With Square ID: ${withSquareId.length}`)
  console.log(`Valid Square IDs: ${validCount}`)
  console.log(`Invalid Square IDs: ${invalidCount}`)
  console.log(`Missing Square ID: ${missingCount}`)
}

main().catch((error) => {
  console.error('❌ Validation failed:', error.message)
  process.exit(1)
})
