#!/usr/bin/env node

/**
 * Export Square catalog items (& variations) to JSON.
 *
 * Usage:
 *   node scripts/export-square-catalog.js --out data/square-catalog-export.json
 *
 * Options:
 *   --out <file>        Output path (default: data/square-catalog-export.json)
 *   --include-archived  Include archived catalog objects (default: false)
 */

require('dotenv').config({ path: '.env.local' })

const fs = require('fs')
const path = require('path')
const { Client } = require('square/legacy')

const DEFAULT_OUTPUT = path.join('data', 'square-catalog-export.json')

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    out: DEFAULT_OUTPUT,
    includeArchived: false
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--out' && args[i + 1]) {
      options.out = args[i + 1]
      i += 1
    } else if (arg === '--include-archived') {
      options.includeArchived = true
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Square Catalog Export

Usage:
  node scripts/export-square-catalog.js [--out FILE] [--include-archived]

Options:
  --out FILE            Output JSON file (default: ${DEFAULT_OUTPUT})
  --include-archived    Include archived catalog objects
`)
      process.exit(0)
    }
  }

  return options
}

function ensureOutputDir(filepath) {
  const dir = path.dirname(filepath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function fetchCatalog({ includeArchived }) {
  const client = new Client({
    bearerAuthCredentials: {
      accessToken: process.env.SQUARE_ACCESS_TOKEN
    },
    environment: (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase()
  })

  const items = []
  let cursor
  do {
    const response = await client.catalogApi.listCatalog(cursor, 'ITEM,CATEGORY,MODIFIER_LIST')

    if (response?.result?.objects) {
      items.push(...response.result.objects)
    }

    cursor = response?.result?.cursor
  } while (cursor)

  return includeArchived ? items : items.filter(item => !item.isDeleted)
}

function extractVariations(catalogObjects) {
  const categories = new Map()
  const items = []
  const variations = []

  const normalizeMoney = money => {
    if (!money) return null
    return {
      amount: money.amount !== undefined ? Number(money.amount) : null,
      currency: money.currency || null
    }
  }

  for (const obj of catalogObjects) {
    if (obj.type === 'CATEGORY' && obj.categoryData) {
      categories.set(obj.id, {
        id: obj.id,
        name: obj.categoryData.name,
        is_deleted: obj.isDeleted || false
      })
    } else if (obj.type === 'ITEM' && obj.itemData) {
      items.push({
        id: obj.id,
        name: obj.itemData.name,
        description: obj.itemData.description,
        abbreviation: obj.itemData.abbreviation,
        label_color: obj.itemData.labelColor,
        category_id: obj.itemData.categoryId,
        product_type: obj.itemData.productType,
        is_taxable: obj.itemData.isTaxable,
        is_archived: obj.isDeleted || false,
        variations: obj.itemData.variations?.map(variation => variation.id) || []
      })

      for (const variation of obj.itemData.variations || []) {
        if (!variation.itemVariationData) continue

        variations.push({
          id: variation.id,
          item_id: obj.id,
          item_name: obj.itemData.name,
          variation_name: variation.itemVariationData.name,
          sku: variation.itemVariationData.sku,
          price_money: normalizeMoney(variation.itemVariationData.priceMoney),
          pricing_type: variation.itemVariationData.pricingType,
          location_overrides: (variation.itemVariationData.locationOverrides || []).map(override => ({
            location_id: override.locationId,
            price_money: normalizeMoney(override.priceMoney),
            pricing_type: override.pricingType,
            track_inventory: override.trackInventory,
            inventory_alert_type: override.inventoryAlertType,
            inventory_alert_threshold: override.inventoryAlertThreshold
          })),
          track_inventory: variation.itemVariationData.trackInventory,
          available_for_sale: variation.presentAtAllLocations !== false,
          is_archived: variation.isDeleted || false
        })
      }
    }
  }

  return { categories: Array.from(categories.values()), items, variations }
}

async function main() {
  const options = parseArgs()

  if (!process.env.SQUARE_ACCESS_TOKEN) {
    console.error('Missing SQUARE_ACCESS_TOKEN in environment')
    process.exit(1)
  }

  console.log('📦 Fetching Square catalog...')
  const catalogObjects = await fetchCatalog(options)
  console.log(`✅ Retrieved ${catalogObjects.length} catalog objects`)

  const extracted = extractVariations(catalogObjects)

  console.log(`• Categories: ${extracted.categories.length}`)
  console.log(`• Items: ${extracted.items.length}`)
  console.log(`• Variations: ${extracted.variations.length}`)

  ensureOutputDir(options.out)
  const payload = {
    fetched_at: new Date().toISOString(),
    options,
    data: extracted
  }

  fs.writeFileSync(options.out, JSON.stringify(payload, (key, value) => {
    if (typeof value === 'bigint') {
      return Number(value)
    }
    return value
  }, 2), 'utf8')
  console.log(`💾 Catalog export saved to ${options.out}`)
}

main().catch(error => {
  console.error('❌ Catalog export failed:', error.message)
  process.exit(1)
})
