#!/usr/bin/env node

/**
 * Fix Square -> inventory_items mapping
 *
 * Problem:
 * - `sync-square-sales` matches Square order line `catalog_object_id` / `variation_id`
 *   to `inventory_items.square_item_id`.
 * - If inventory items store Square ITEM IDs (or outdated/incorrect IDs), most sales
 *   lines become `impact_type = 'ignored'` and inventory is not decremented.
 *
 * What this script does:
 * - Reads `sales_transaction_items` to learn which Square catalog IDs are actually
 *   present on order lines.
 * - Fetches Square catalog metadata for those IDs (ITEM_VARIATION or ITEM).
 * - Proposes updates to `inventory_items.square_item_id` so they match the IDs used
 *   in sales lines, using:
 *   - direct matches (already correct)
 *   - ITEM -> ITEM_VARIATION conversion when the inventory ID is an ITEM id but sales
 *     uses one of its variations
 *   - name similarity suggestions for unmapped items
 *
 * Safety:
 * - Default is dry-run (no DB writes).
 * - Use `--apply` to persist changes.
 *
 * Usage:
 * - node scripts/fix-square-inventory-mapping.js
 * - node scripts/fix-square-inventory-mapping.js --dry-run
 * - node scripts/fix-square-inventory-mapping.js --apply
 * - node scripts/fix-square-inventory-mapping.js --apply --min-score 0.85
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
const stringSimilarity = require('string-similarity')

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
    dryRun: true,
    apply: false,
    onlyIgnored: true,
    minScore: 0.8,
    limitInventory: null,
    limitSalesIds: null,
    out: 'data/square-inventory-mapping-fixes.csv',
  }

  const tokens = argv.slice(2)
  if (tokens.includes('--help') || tokens.includes('-h')) {
    args.help = true
    return args
  }

  if (tokens.includes('--apply')) {
    args.apply = true
    args.dryRun = false
  }
  if (tokens.includes('--dry-run')) {
    args.dryRun = true
    args.apply = false
  }

  if (tokens.includes('--all-sales')) {
    args.onlyIgnored = false
  }

  const minScoreIdx = tokens.findIndex(t => t === '--min-score')
  if (minScoreIdx !== -1 && tokens[minScoreIdx + 1]) {
    args.minScore = Number(tokens[minScoreIdx + 1])
  }

  const outIdx = tokens.findIndex(t => t === '--out')
  if (outIdx !== -1 && tokens[outIdx + 1]) {
    args.out = tokens[outIdx + 1]
  }

  const invIdx = tokens.findIndex(t => t === '--limit-inventory')
  if (invIdx !== -1 && tokens[invIdx + 1]) {
    args.limitInventory = Number(tokens[invIdx + 1])
  }

  const salesIdx = tokens.findIndex(t => t === '--limit-sales-ids')
  if (salesIdx !== -1 && tokens[salesIdx + 1]) {
    args.limitSalesIds = Number(tokens[salesIdx + 1])
  }

  return args
}

function showUsage() {
  console.log('\n🧭 Fix Square -> inventory mapping')
  console.log('\nUsage:')
  console.log('  node scripts/fix-square-inventory-mapping.js [options]')
  console.log('\nOptions:')
  console.log('  --dry-run                Preview changes (default)')
  console.log('  --apply                  Persist updates to inventory_items.square_item_id')
  console.log('  --min-score N            Name match threshold (default: 0.8)')
  console.log('  --all-sales              Use all sales IDs (not just ignored lines)')
  console.log('  --limit-inventory N       Only consider first N inventory items')
  console.log('  --limit-sales-ids N       Only consider first N sales Square IDs')
  console.log('  --out PATH                CSV output path (default: data/square-inventory-mapping-fixes.csv)')
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
    const details = json?.errors?.[0]?.detail || JSON.stringify(json).slice(0, 500)
    throw new Error(`Square API error ${response.status} ${endpoint}: ${details}`)
  }

  return json
}

async function fetchInventoryItems(supabase, limitInventory) {
  let query = supabase
    .from('inventory_items')
    .select('id, item_name, square_item_id, item_type, auto_decrement, deleted_at, created_at, updated_at')
    .order('item_name', { ascending: true })

  if (typeof limitInventory === 'number' && Number.isFinite(limitInventory)) {
    query = query.limit(limitInventory)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch inventory_items: ${error.message}`)
  return data ?? []
}

async function fetchSalesSquareIds(supabase, onlyIgnored) {
  const pageSize = 1000
  let offset = 0
  const ids = new Set()

  while (true) {
    let query = supabase
      .from('sales_transaction_items')
      .select('square_catalog_object_id')
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (onlyIgnored) {
      query = query.eq('impact_type', 'ignored')
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch sales_transaction_items: ${error.message}`)
    if (!data || data.length === 0) break

    for (const row of data) {
      if (row.square_catalog_object_id) ids.add(row.square_catalog_object_id)
    }
    offset += pageSize
  }

  return [...ids.values()]
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

function pickVariationForItem(squareIndex, itemObj, salesIdSet) {
  if (!itemObj || itemObj.type !== 'ITEM') return null

  const variations = itemObj.item_data?.variations || []
  const variationIds = variations
    .map(v => v?.id)
    .filter(Boolean)

  const present = variationIds.filter(id => salesIdSet.has(id))
  if (present.length === 0) return null
  if (present.length === 1) return present[0]

  const resolved = present
    .map(id => {
      const obj = squareIndex.get(id)
      const name = obj?.item_variation_data?.name || null
      return { id, name, normalized: normalizeName(name) }
    })

  const preferred = resolved.find(v => v.normalized === 'regular' || v.normalized === 'default')
  return (preferred || resolved[0]).id
}

function buildInventoryIdUsage(inventoryItems) {
  const map = new Map()
  for (const item of inventoryItems) {
    const id = item.square_item_id
    if (!id) continue
    const list = map.get(id) || []
    list.push(item)
    map.set(id, list)
  }
  return map
}

function bestNameMatch(targetName, salesCandidates, minScore) {
  const target = normalizeName(targetName)
  if (!target) return null

  let best = null
  for (const candidate of salesCandidates) {
    if (!candidate.displayName) continue
    const score = stringSimilarity.compareTwoStrings(target, normalizeName(candidate.displayName))
    if (score >= minScore && (!best || score > best.score)) {
      best = { ...candidate, score }
    }
  }
  return best
}

async function main() {
  const args = parseArgs(process.argv)
  if (args.help) {
    showUsage()
    process.exit(0)
  }

  if (args.apply) {
    console.log('⚠️  APPLY mode enabled: this will update inventory_items.square_item_id')
  } else {
    console.log('🧪 Dry run (no DB writes). Use --apply to persist.')
  }

  const supabase = createSupabase()
  const squareEnv = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase()
  console.log(`📦 Square environment: ${squareEnv}`)

  console.log('📥 Loading inventory items...')
  const inventoryItems = await fetchInventoryItems(supabase, args.limitInventory)
  const inventoryUsage = buildInventoryIdUsage(inventoryItems)

  console.log(`📥 Loading Square IDs from sales (${args.onlyIgnored ? 'ignored only' : 'all sales'})...`)
  let salesIds = await fetchSalesSquareIds(supabase, args.onlyIgnored)
  if (typeof args.limitSalesIds === 'number' && Number.isFinite(args.limitSalesIds)) {
    salesIds = salesIds.slice(0, args.limitSalesIds)
  }

  const salesIdSet = new Set(salesIds)
  console.log(`Found ${salesIds.length} distinct Square IDs in sales data`)

  console.log('🔎 Fetching Square catalog metadata for sales IDs...')
  const squareIndex = new Map()
  const missingFromSquare = []

  // Square batch retrieve max size depends on API; use 100 for safety.
  for (const part of chunk(salesIds, 100)) {
    const res = await makeSquareRequest('/v2/catalog/batch-retrieve', 'POST', {
      object_ids: part,
      include_related_objects: true,
    })
    const index = buildSquareIndex(res)
    for (const [id, obj] of index.entries()) {
      squareIndex.set(id, obj)
    }
    for (const id of part) {
      if (!squareIndex.has(id)) missingFromSquare.push(id)
    }
  }

  const salesCandidates = salesIds.map(id => {
    const obj = squareIndex.get(id) || null
    return {
      squareId: id,
      type: obj?.type || 'UNKNOWN',
      displayName: getObjectDisplayName(squareIndex, obj),
      raw: obj,
    }
  })

  const proposed = []
  const skipped = []

  for (const inv of inventoryItems) {
    if (!inv.square_item_id) continue
    if (inv.deleted_at) continue

    const currentId = inv.square_item_id
    const currentInSales = salesIdSet.has(currentId)
    const currentObj = squareIndex.get(currentId) || null

    if (currentInSales && currentObj?.type === 'ITEM_VARIATION') {
      skipped.push({ inventory: inv, reason: 'Already mapped to sales variation id' })
      continue
    }

    // If inventory stores an ITEM id but sales uses one of its variations, convert.
    if (currentInSales && currentObj?.type === 'ITEM') {
      const variationId = pickVariationForItem(squareIndex, currentObj, salesIdSet)
      if (variationId && variationId !== currentId) {
        proposed.push({
          inventory_id: inv.id,
          inventory_name: inv.item_name,
          current_square_item_id: currentId,
          proposed_square_item_id: variationId,
          reason: 'Convert Square ITEM id to sales ITEM_VARIATION id',
          score: null,
          square_display_name: getObjectDisplayName(squareIndex, squareIndex.get(variationId)),
        })
        continue
      }
    }

    // Name-based suggestion from sales IDs.
    const best = bestNameMatch(inv.item_name, salesCandidates, args.minScore)
    if (best) {
      proposed.push({
        inventory_id: inv.id,
        inventory_name: inv.item_name,
        current_square_item_id: currentId,
        proposed_square_item_id: best.squareId,
        reason: 'Name similarity match to sales catalog id',
        score: best.score,
        square_display_name: best.displayName,
      })
      continue
    }

    skipped.push({ inventory: inv, reason: 'No confident match found' })
  }

  // De-dupe proposals to avoid multiple inventory rows claiming the same Square ID.
  const conflicts = []
  const safe = []
  const claimed = new Map()

  for (const p of proposed) {
    const nextId = p.proposed_square_item_id
    const prevClaim = claimed.get(nextId)
    if (prevClaim) {
      conflicts.push({ type: 'multiple_inventory_claim_same_square_id', squareId: nextId, a: prevClaim, b: p })
      continue
    }

    const existingUsers = inventoryUsage.get(nextId) || []
    const otherActiveUser = existingUsers.find(i => i.id !== p.inventory_id && !i.deleted_at)
    if (otherActiveUser) {
      conflicts.push({
        type: 'square_id_already_used',
        squareId: nextId,
        inventory_id: p.inventory_id,
        inventory_name: p.inventory_name,
        existing_inventory_id: otherActiveUser.id,
        existing_inventory_name: otherActiveUser.item_name,
      })
      continue
    }

    claimed.set(nextId, p)
    safe.push(p)
  }

  ensureParentDir(args.out)
  const headers = [
    'inventory_id',
    'inventory_name',
    'current_square_item_id',
    'proposed_square_item_id',
    'square_display_name',
    'reason',
    'score',
  ]

  const csvRows = [toCsvRow(headers)]
  for (const row of safe) {
    csvRows.push(toCsvRow([
      row.inventory_id,
      row.inventory_name,
      row.current_square_item_id,
      row.proposed_square_item_id,
      row.square_display_name,
      row.reason,
      row.score === null ? '' : row.score.toFixed(4),
    ]))
  }
  fs.writeFileSync(args.out, csvRows.join('\n') + '\n', 'utf8')

  console.log(`\nWrote CSV: ${args.out}`)
  console.log(`Inventory items scanned: ${inventoryItems.length}`)
  console.log(`Proposed updates (safe): ${safe.length}`)
  console.log(`Conflicts skipped: ${conflicts.length}`)
  console.log(`Square IDs missing from catalog lookup: ${missingFromSquare.length}`)

  if (conflicts.length > 0) {
    console.log('\n⚠️  Conflicts found (not applied). Re-run with a higher --min-score or resolve duplicates manually.')
    const sample = conflicts.slice(0, 10)
    for (const c of sample) {
      if (c.type === 'square_id_already_used') {
        console.log(`- Square ID already used: ${c.squareId} (existing: ${c.existing_inventory_name}, candidate: ${c.inventory_name})`)
      } else if (c.type === 'multiple_inventory_claim_same_square_id') {
        console.log(`- Multiple claims: ${c.squareId}`)
      }
    }
  }

  if (!args.apply) {
    console.log('\nDry run complete. Review the CSV and re-run with --apply to write updates.')
    return
  }

  console.log('\n✍️  Applying updates...')
  for (const row of safe) {
    if (row.current_square_item_id === row.proposed_square_item_id) continue
    const { error } = await supabase
      .from('inventory_items')
      .update({
        square_item_id: row.proposed_square_item_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.inventory_id)

    if (error) {
      throw new Error(`Failed updating ${row.inventory_name} (${row.inventory_id}): ${error.message}`)
    }
  }

  console.log('✅ Updates applied.')
}

main().catch(error => {
  console.error('❌ Fix script failed:', error.message)
  process.exit(1)
})

