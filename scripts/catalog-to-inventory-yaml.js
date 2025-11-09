#!/usr/bin/env node

/**
 * Convert Square catalog JSON export into inventory YAML.
 *
 * Usage:
 *   node scripts/catalog-to-inventory-yaml.js \
 *     --in data/square-catalog-export.json \
 *     --out data/inventory-seed.yaml
 *
 * Options:
 *   --in <file>          Square catalog export JSON (required)
 *   --out <file>         Output YAML path (default: data/inventory-from-square.yaml)
 *   --defaults <json>    JSON file providing default fields (unit_type, supplier_name, etc.)
 *   --prepared <regex>   Regex (case-insensitive) to tag matches as prepared drinks
 *   --ingredients <regex> Regex to tag matches as ingredient
 */

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

const DEFAULT_OUTPUT = path.join('data', 'inventory-from-square.yaml')

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
    input: null,
    output: DEFAULT_OUTPUT,
    defaults: null,
    preparedPattern: null,
    ingredientPattern: null,
    patternFile: null
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if ((arg === '--in' || arg === '--input') && args[i + 1]) {
      options.input = args[i + 1]
      i += 1
    } else if (arg === '--out' && args[i + 1]) {
      options.output = args[i + 1]
      i += 1
    } else if (arg === '--defaults' && args[i + 1]) {
      options.defaults = args[i + 1]
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
      console.log(`Square Catalog -> Inventory YAML

Usage:
  node scripts/catalog-to-inventory-yaml.js --in data/square-catalog-export.json [--out file]

Options:
  --in FILE            Square catalog export JSON (required)
  --out FILE           Output YAML (default: ${DEFAULT_OUTPUT})
  --defaults FILE      JSON file with default values (see docs)
  --prepared REGEX     Regex to mark variations as prepared drinks
  --ingredients REGEX  Regex to mark variations as ingredient items
  --patterns FILE      JSON/YAML file with { prepared: [], ingredients: [] }
`)
      process.exit(0)
    }
  }

  if (!options.input) {
    console.error('Error: --in <file> is required')
    process.exit(1)
  }

  return options
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

function ensureOutputDir(filepath) {
  const dir = path.dirname(filepath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function resolveSupplier(defaults, variation) {
  if (defaults.supplierByCategory && variation.category_name) {
    const match = defaults.supplierByCategory[variation.category_name.toLowerCase()]
    if (match) return match
  }
  if (defaults.defaultSupplier) return defaults.defaultSupplier
  return null
}

function determineUnitType(defaults, variation) {
  if (defaults.unitByCategory && variation.category_name) {
    const unit = defaults.unitByCategory[variation.category_name.toLowerCase()]
    if (unit) return unit
  }
  return defaults.defaultUnitType || 'each'
}

function classifyVariation(variation, options, defaults) {
  const name = `${variation.item_name} ${variation.variation_name || ''}`.trim()
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

  // Default classification
  const defaultType = defaults.defaultItemType || 'prepackaged'
  const defaultAuto = defaultType === 'prepackaged'
  return { item_type: defaultType, auto_decrement: defaultAuto }
}

function buildInventoryRecords(payload, options) {
  const defaults = loadDefaults(options.defaults)
  const variations = payload?.data?.variations || []
  const itemsById = new Map(payload?.data?.items?.map(item => [item.id, item]))
  const categoriesById = new Map(payload?.data?.categories?.map(cat => [cat.id, cat]))

  return variations
    .filter(variation => !variation.is_archived)
    .map(variation => {
      const item = itemsById.get(variation.item_id) || {}
      const category = categoriesById.get(item.category_id) || {}

      const { item_type, auto_decrement } = classifyVariation(variation, options, defaults)

      return {
        square_item_id: variation.id,
        item_name: variation.variation_name
          ? `${item.name} - ${variation.variation_name}`
          : item.name || variation.variation_name || 'Unnamed Item',
        current_stock: defaults.defaultCurrentStock ?? 0,
        minimum_threshold: defaults.defaultMinimumThreshold ?? 5,
        reorder_point: defaults.defaultReorderPoint ?? 10,
        unit_cost: defaults.defaultUnitCost ?? 0,
        unit_type: determineUnitType(defaults, {
          category_name: category.name,
          variation_name: variation.variation_name
        }),
        supplier_name: resolveSupplier(defaults, {
          category_name: category.name
        }),
        location: defaults.defaultLocation || 'Main',
        notes: `Square item: ${item.name} (${variation.variation_name || 'Default'})`,
        is_ingredient: item_type === 'ingredient',
        item_type,
        auto_decrement,
        metadata: {
          square_item_id: variation.item_id,
          square_variation_id: variation.id,
          category: category.name || null,
          product_type: item.product_type || null,
          sku: variation.sku || null,
          price_money: variation.price_money || null
        }
      }
    })
}

function writeYaml(records, outputPath) {
  ensureOutputDir(outputPath)
  const body = {
    inventory_items: records
  }
  const yamlString = yaml.dump(body, { lineWidth: 80 })
  fs.writeFileSync(outputPath, yamlString, 'utf8')
}

async function main() {
  const options = parseArgs()
  const patternConfig = loadPatternConfig(options.patternFile)

  if (patternConfig.prepared && Array.isArray(patternConfig.prepared)) {
    options.preparedRegex = new RegExp(patternConfig.prepared.join('|'), 'i')
  }

  if (patternConfig.ingredients && Array.isArray(patternConfig.ingredients)) {
    options.ingredientRegex = new RegExp(patternConfig.ingredients.join('|'), 'i')
  }

  const payload = readJson(options.input)
  const records = buildInventoryRecords(payload, options)

  console.log(`📄 Loaded ${records.length} variations from ${options.input}`)
  console.log(`• Sample: ${records.slice(0, 2).map(r => r.item_name).join(', ') || 'n/a'}`)

  writeYaml(records, options.output)
  console.log(`✅ Inventory YAML saved to ${options.output}`)
  console.log('You can now run:')
  console.log(`  node scripts/bulk-upload-inventory.js ${options.output}`)
}

main().catch(error => {
  console.error('❌ Catalog conversion failed:', error.message)
  process.exit(1)
})
