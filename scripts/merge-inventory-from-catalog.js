#!/usr/bin/env node

/**
 * Merge Square catalog export with existing inventory.
 *
 * Produces a YAML file that preserves live inventory fields (stock, cost, type, etc.)
 * for existing items while adding new Square variations with sensible defaults.
 *
 * Usage:
 *   node scripts/merge-inventory-from-catalog.js \
 *     --catalog data/square-catalog-export.json \
 *     --out data/inventory-merged.yaml \
 *     --defaults data/inventory-defaults.json
 *
 * After generating the YAML, run:
 *   node scripts/bulk-upload-inventory.js data/inventory-merged.yaml
 */

require('dotenv').config({ path: '.env.local' })

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { createClient } = require('@supabase/supabase-js')

const DEFAULT_OUTPUT = path.join('data', 'inventory-merged.yaml')

function loadPatternConfig(filePath) {
  if (!filePath) return {}
  if (!fs.existsSync(filePath)) {
    throw new Error(`Pattern config not found: ${filePath}`)
  }
  const raw = fs.readFileSync(filePath, 'utf8')
  const data = filePath.endsWith('.yaml') || filePath.endsWith('.yml')
    ? yaml.load(raw)
    : JSON.parse(raw)
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid pattern config file')
  }
  return data
}

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    catalogPath: null,
    outputPath: DEFAULT_OUTPUT,
    defaultsPath: null,
    preparedPattern: null,
    ingredientPattern: null,
    patternFile: null
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if ((arg === '--catalog' || arg === '--in') && args[i + 1]) {
      options.catalogPath = args[i + 1]
      i += 1
    } else if (arg === '--out' && args[i + 1]) {
      options.outputPath = args[i + 1]
      i += 1
    } else if (arg === '--defaults' && args[i + 1]) {
      options.defaultsPath = args[i + 1]
      i += 1
    } else if (arg === '--prepared' && args[i + 1]) {
      options.preparedPattern = new RegExp(args[i + 1], 'i')
      i += 1
    } else if (arg === '--ingredients' && args[i + 1]) {
      options.ingredientPattern = new RegExp(args[i + 1], 'i')
      i += 1
    } else if (arg === '--patterns' && args[i + 1]) {
      options.patternFile = args[i + 1]
      i += 1
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Merge Inventory from Square Catalog

Usage:
  node scripts/merge-inventory-from-catalog.js --catalog data/square-catalog-export.json [options]

Options:
  --catalog FILE       Square catalog export JSON (required)
  --out FILE           Output YAML path (default: ${DEFAULT_OUTPUT})
  --defaults FILE      Defaults JSON (supplier/unit mappings, thresholds, etc.)
  --prepared REGEX     Regex to tag prepared drinks
  --ingredients REGEX  Regex to tag ingredient SKUs
  --patterns FILE      JSON/YAML file with { prepared: [], ingredients: [] }
`)
      process.exit(0)
    }
  }

  if (!options.catalogPath) {
    console.error('Error: --catalog <file> is required')
    process.exit(1)
  }

  return options
}

function ensureOutputDir(filepath) {
  const dir = path.dirname(filepath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  const raw = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(raw)
}

function loadDefaults(defaultsPath) {
  if (!defaultsPath) return {}
  if (!fs.existsSync(defaultsPath)) {
    throw new Error(`Defaults file not found: ${defaultsPath}`)
  }
  return JSON.parse(fs.readFileSync(defaultsPath, 'utf8'))
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local')
  }

  return createClient(url, serviceKey)
}

async function fetchExistingInventory(supabase) {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, square_item_id, item_name, current_stock, minimum_threshold, reorder_point, unit_cost, unit_type, is_ingredient, item_type, auto_decrement, supplier_id, location, notes')

  if (error) {
    throw new Error(`Failed to fetch inventory_items: ${error.message}`)
  }

  const map = new Map()
  for (const item of data || []) {
    if (item.square_item_id) {
      map.set(item.square_item_id, item)
    }
  }

  const unmatched = (data || []).filter(item => !item.square_item_id)
  return { existingBySquareId: map, unmatched }
}

async function fetchSuppliers(supabase) {
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name')

  if (error) {
    throw new Error(`Failed to fetch suppliers: ${error.message}`)
  }

  const byId = new Map()
  const byName = new Map()
  for (const supplier of data || []) {
    byId.set(supplier.id, supplier.name)
    byName.set((supplier.name || '').toLowerCase(), supplier.id)
  }

  return { byId, byName }
}

function normalizeMoney(money) {
  if (!money) return null
  return {
    amount: money.amount !== undefined ? Number(money.amount) : null,
    currency: money.currency || null
  }
}

function classifyVariation(name, existing, options, defaults) {
  if (existing?.item_type) {
    return {
      item_type: existing.item_type,
      auto_decrement: existing.auto_decrement ?? (existing.item_type === 'prepackaged')
    }
  }

  if (options.preparedRegex && options.preparedRegex.test(name)) {
    return { item_type: 'prepared', auto_decrement: false }
  }
  if (options.ingredientRegex && options.ingredientRegex.test(name)) {
    return { item_type: 'ingredient', auto_decrement: false }
  }
  if (options.preparedPattern && options.preparedPattern.test(name)) {
    return { item_type: 'prepared', auto_decrement: false }
  }
  if (options.ingredientPattern && options.ingredientPattern.test(name)) {
    return { item_type: 'ingredient', auto_decrement: false }
  }

  const defaultType = defaults.defaultItemType || 'prepackaged'
  const defaultAuto = defaultType === 'prepackaged'
  return { item_type: defaultType, auto_decrement: defaultAuto }
}

function resolveSupplierName(existing, defaults, categoryName, supplierIdMap) {
  if (existing?.supplier_id) {
    return supplierIdMap.byId.get(existing.supplier_id) || null
  }

  if (defaults.supplierByCategory && categoryName) {
    const match = defaults.supplierByCategory[categoryName.toLowerCase()]
    if (match) return match
  }

  return defaults.defaultSupplier || null
}

function determineUnitType(existing, defaults, categoryName) {
  if (existing?.unit_type) return existing.unit_type

  if (defaults.unitByCategory && categoryName) {
    const unit = defaults.unitByCategory[categoryName.toLowerCase()]
    if (unit) return unit
  }

  return defaults.defaultUnitType || 'each'
}

function buildInventoryRecords(catalog, existingMap, unmatchedExisting, supplierMaps, options, defaults) {
  const itemsById = new Map((catalog.data.items || []).map(item => [item.id, item]))
  const categoriesById = new Map((catalog.data.categories || []).map(cat => [cat.id, cat]))

  const records = []
  const seenSquareIds = new Set()

  for (const variation of catalog.data.variations || []) {
    if (variation.is_archived) continue

    const existing = existingMap.get(variation.id)
    const item = itemsById.get(variation.item_id) || {}
    const category = categoriesById.get(item.category_id) || {}
    const categoryName = category.name || null

    const mergedName = existing?.item_name || (variation.variation_name
      ? `${item.name || 'Unnamed Item'} - ${variation.variation_name}`
      : item.name || variation.variation_name || 'Unnamed Item')

    const { item_type, auto_decrement } = classifyVariation(mergedName, existing, options, defaults)

    const record = {
      square_item_id: variation.id,
      item_name: mergedName,
      current_stock: existing?.current_stock ?? defaults.defaultCurrentStock ?? 0,
      minimum_threshold: existing?.minimum_threshold ?? defaults.defaultMinimumThreshold ?? 5,
      reorder_point: existing?.reorder_point ?? defaults.defaultReorderPoint ?? 10,
      unit_cost: existing?.unit_cost ?? defaults.defaultUnitCost ?? 0,
      unit_type: determineUnitType(existing, defaults, categoryName),
      supplier_name: resolveSupplierName(existing, defaults, categoryName, supplierMaps),
      location: existing?.location ?? defaults.defaultLocation ?? 'Main',
      notes: existing?.notes ?? `Square item: ${item.name || 'Unnamed'} (${variation.variation_name || 'Default'})`,
      is_ingredient: existing?.is_ingredient ?? (item_type === 'ingredient'),
      item_type,
      auto_decrement,
      metadata: {
        status: existing ? 'existing' : 'new',
        square_item_id: variation.item_id,
        square_variation_id: variation.id,
        category: categoryName,
        product_type: item.product_type || null,
        sku: variation.sku || null,
        price_money: normalizeMoney(variation.price_money)
      }
    }

    records.push(record)
    seenSquareIds.add(variation.id)
  }

  const missing = unmatchedExisting.concat(
    Array.from(existingMap.values()).filter(existing => !seenSquareIds.has(existing.square_item_id))
  )

  return { records, missing }
}

function writeYaml(records, outputPath) {
  ensureOutputDir(outputPath)
  const body = {
    inventory_items: records
  }
  const yamlString = yaml.dump(body, { lineWidth: 90 })
  fs.writeFileSync(outputPath, yamlString, 'utf8')
}

async function main() {
  const options = parseArgs()
  const defaults = loadDefaults(options.defaultsPath)
  const catalog = readJson(options.catalogPath)

  const patternConfig = loadPatternConfig(options.patternFile)
  if (patternConfig.prepared && Array.isArray(patternConfig.prepared)) {
    options.preparedRegex = new RegExp(patternConfig.prepared.join('|'), 'i')
  }
  if (patternConfig.ingredients && Array.isArray(patternConfig.ingredients)) {
    options.ingredientRegex = new RegExp(patternConfig.ingredients.join('|'), 'i')
  }

  const supabase = createSupabaseClient()
  const [{ existingBySquareId, unmatched }, supplierMaps] = await Promise.all([
    fetchExistingInventory(supabase),
    fetchSuppliers(supabase)
  ])

  const { records, missing } = buildInventoryRecords(
    catalog,
    existingBySquareId,
    unmatched,
    supplierMaps,
    options,
    defaults
  )

  console.log(`📊 Catalog variations processed: ${records.length}`)
  console.log(`  • Existing matches: ${records.filter(r => r.metadata.status === 'existing').length}`)
  console.log(`  • New variations: ${records.filter(r => r.metadata.status === 'new').length}`)

  if (missing.length > 0) {
    console.log(`⚠️  Existing inventory items without matching Square variation: ${missing.length}`)
    missing.slice(0, 5).forEach(item => {
      console.log(`   - ${item.item_name} (square_item_id: ${item.square_item_id || 'n/a'})`)
    })
    if (missing.length > 5) {
      console.log('   ...')
    }
  }

  writeYaml(records, options.outputPath)
  console.log(`💾 Merged inventory YAML written to ${options.outputPath}`)
  console.log('Next run:')
  console.log(`  node scripts/bulk-upload-inventory.js ${options.outputPath}`)
}

main().catch(error => {
  console.error('❌ Merge failed:', error.message)
  process.exit(1)
})
