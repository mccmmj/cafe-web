/**
 * Audit Square -> inventory mapping coverage
 *
 * Goal:
 * - Identify Square catalog object IDs seen in `sales_transaction_items` that do not map
 *   to any `inventory_items.square_item_id`.
 * - Suggest likely inventory matches by name similarity.
 *
 * This script does NOT modify any database tables.
 *
 * Usage:
 * - node scripts/audit-square-inventory-mapping.js
 * - node scripts/audit-square-inventory-mapping.js --limit 50
 * - node scripts/audit-square-inventory-mapping.js --out data/square-inventory-mapping-suggestions.csv
 *
 * Env:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config({ path: '.env.local' })
const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('@supabase/supabase-js')
const stringSimilarity = require('string-similarity')

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.PUBLIC_SUPABASE_URL
    || process.env.SUPABASE_URL

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL (or PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

function parseArgs(argv) {
  const args = {
    limit: 200,
    out: 'data/square-inventory-mapping-suggestions.csv',
    minIgnored: 1,
    minScore: 0.6,
    topK: 3,
  }

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i]
    const next = argv[i + 1]

    if (token === '--limit' && next) {
      args.limit = Number(next)
      i += 1
      continue
    }
    if (token === '--out' && next) {
      args.out = next
      i += 1
      continue
    }
    if (token === '--min-ignored' && next) {
      args.minIgnored = Number(next)
      i += 1
      continue
    }
    if (token === '--min-score' && next) {
      args.minScore = Number(next)
      i += 1
      continue
    }
    if (token === '--top' && next) {
      args.topK = Number(next)
      i += 1
      continue
    }
    if (token === '--help') {
      args.help = true
      continue
    }
  }

  return args
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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

function ensureParentDir(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function fetchInventoryItems(supabase) {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, item_name, square_item_id, item_type, auto_decrement, created_at, deleted_at')

  if (error) throw new Error(`Failed to fetch inventory_items: ${error.message}`)
  return data ?? []
}

async function fetchIgnoredSalesIdStats(supabase) {
  const byId = new Map()
  const pageSize = 1000
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('sales_transaction_items')
      .select('square_catalog_object_id, name, created_at')
      .eq('impact_type', 'ignored')
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) throw new Error(`Failed to fetch sales_transaction_items page: ${error.message}`)
    if (!data || data.length === 0) break

    for (const row of data) {
      const id = row.square_catalog_object_id
      if (!id) continue
      const prev = byId.get(id) || {
        square_catalog_object_id: id,
        example_name: row.name || null,
        first_seen: row.created_at || null,
        last_seen: row.created_at || null,
        ignored_lines: 0,
      }

      prev.ignored_lines += 1
      if (!prev.example_name && row.name) prev.example_name = row.name
      if (row.created_at) {
        if (!prev.first_seen || row.created_at < prev.first_seen) prev.first_seen = row.created_at
        if (!prev.last_seen || row.created_at > prev.last_seen) prev.last_seen = row.created_at
      }

      byId.set(id, prev)
    }

    offset += pageSize
  }

  return [...byId.values()].sort((a, b) => (b.ignored_lines || 0) - (a.ignored_lines || 0))
}

function suggestMatches(exampleName, inventoryItems, topK, minScore) {
  const target = normalizeName(exampleName)
  if (!target) return []

  const ratings = []
  for (const item of inventoryItems) {
    const candidate = normalizeName(item.item_name)
    if (!candidate) continue
    const score = stringSimilarity.compareTwoStrings(target, candidate)
    if (score >= minScore) {
      ratings.push({ item, score })
    }
  }

  ratings.sort((a, b) => b.score - a.score)
  return ratings.slice(0, topK)
}

function buildInventoryMap(inventoryItems) {
  const map = new Map()
  for (const item of inventoryItems) {
    if (item.square_item_id) {
      map.set(item.square_item_id, item)
    }
  }
  return map
}

async function main() {
  const args = parseArgs(process.argv)

  if (args.help) {
    console.log('Usage: node scripts/audit-square-inventory-mapping.js [--limit N] [--out PATH]')
    console.log('  --min-ignored N   Only include IDs with >= N ignored lines (default: 1)')
    console.log('  --min-score N     Minimum name similarity (default: 0.6)')
    console.log('  --top N           Candidate suggestions per ID (default: 3)')
    process.exit(0)
  }

  const supabase = createSupabaseClient()
  const inventoryItems = await fetchInventoryItems(supabase)
  const inventoryBySquareId = buildInventoryMap(inventoryItems)
  const salesStats = await fetchIgnoredSalesIdStats(supabase)

  const filtered = (salesStats || [])
    .filter(row => Number(row.ignored_lines || 0) >= args.minIgnored)
    .slice(0, args.limit)

  ensureParentDir(args.out)

  const headers = [
    'square_catalog_object_id',
    'example_name',
    'ignored_lines',
    'first_seen',
    'last_seen',
    'has_inventory_mapping',
    'mapped_inventory_item_id',
    'mapped_inventory_item_name',
    'mapped_inventory_created_at',
    'note',
    'suggested_inventory_item_id',
    'suggested_inventory_item_name',
    'suggested_inventory_square_item_id',
    'suggested_score',
  ]

  const rows = [toCsvRow(headers)]
  const summary = {
    inventoryItems: inventoryItems.length,
    distinctSalesIdsInReport: filtered.length,
    unmappedSalesIdsInReport: 0,
  }

  for (const stat of filtered) {
    const squareId = stat.square_catalog_object_id
    const mappedInventory = inventoryBySquareId.get(squareId) || null

    const hasMapping = Boolean(mappedInventory)
    if (!hasMapping) summary.unmappedSalesIdsInReport += 1

    const baseFields = [
      squareId,
      stat.example_name,
      stat.ignored_lines,
      stat.first_seen,
      stat.last_seen,
      hasMapping,
      mappedInventory?.id || null,
      mappedInventory?.item_name || null,
      mappedInventory?.created_at || null,
    ]

    const note = hasMapping
      ? (mappedInventory.created_at && stat.first_seen && mappedInventory.created_at > stat.first_seen
        ? 'Mapping exists now; early rows likely imported before inventory item existed'
        : 'Mapping exists; ignored rows may be from earlier imports and are not reclassified automatically')
      : 'No inventory item maps to this Square catalog ID'

    if (hasMapping) {
      rows.push(toCsvRow([
        ...baseFields,
        note,
        null,
        null,
        null,
        null,
      ]))
      continue
    }

    const suggestions = suggestMatches(stat.example_name, inventoryItems, args.topK, args.minScore)
    if (suggestions.length === 0) {
      rows.push(toCsvRow([
        ...baseFields,
        note,
        null,
        null,
        null,
        null,
      ]))
      continue
    }

    for (const suggestion of suggestions) {
      rows.push(toCsvRow([
        ...baseFields,
        note,
        suggestion.item.id,
        suggestion.item.item_name,
        suggestion.item.square_item_id,
        suggestion.score.toFixed(4),
      ]))
    }
  }

  fs.writeFileSync(args.out, rows.join('\n') + '\n', 'utf8')
  console.log(`Wrote: ${args.out}`)
  console.log(`Inventory items: ${summary.inventoryItems}`)
  console.log(`Sales IDs in report: ${summary.distinctSalesIdsInReport}`)
  console.log(`Unmapped IDs in report: ${summary.unmappedSalesIdsInReport}`)
  console.log('Note: This script does not modify any tables.')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
