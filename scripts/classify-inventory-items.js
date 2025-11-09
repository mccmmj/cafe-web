#!/usr/bin/env node

/**
 * Inventory Classification Helper
 *
 * Scans inventory_items and suggests item_type + auto_decrement values
 * based on heuristics. Run with --apply to persist updates.
 *
 * Examples:
 *   node scripts/classify-inventory-items.js
 *   node scripts/classify-inventory-items.js --apply
 */

require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase configuration. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const args = process.argv.slice(2)
const APPLY_CHANGES = args.includes('--apply')
const SHOW_ALL = args.includes('--all')

const MANUAL_OVERRIDES = {
  'avocados': { item_type: 'ingredient', auto_decrement: false, reason: 'manual override' }
}

const KEYWORDS = {
  ingredient: [
    'bean', 'beans', 'milk', 'syrup', 'sauce', 'powder', 'mix', 'sugar', 'spice', 'extract',
    'honey', 'syrups', 'concentrate', 'cream', 'base', 'matcha', 'chai', 'puree'
  ],
  prepared: [
    'latte', 'americano', 'cappuccino', 'espresso', 'frappuccino', 'macchiato', 'mocha',
    'brew', 'cold brew', 'pour over', 'tea', 'refresher', 'smoothie', 'lemonade', 'hot chocolate'
  ],
  prepackaged: [
    'burrito', 'sandwich', 'wrap', 'muffin', 'cookie', 'croissant', 'bagel',
    'protein bar', 'granola bar', 'bar', 'pack', 'bottle', 'bottled', 'juice',
    'water', 'snack', 'yogurt', 'parfait', 'salad'
  ],
  supply: [
    'cup', 'lid', 'napkin', 'straw', 'sleeve', 'bag', 'container', 'towel',
    'glove', 'wrapper', 'filter', 'sticker'
  ]
}

function classifyItem(item) {
  const name = item.item_name?.toLowerCase() || ''

  if (MANUAL_OVERRIDES[name]) {
    return { ...MANUAL_OVERRIDES[name], source: 'override' }
  }

  if (item.is_ingredient) {
    return { item_type: 'ingredient', auto_decrement: false, source: 'is_ingredient flag' }
  }

  if (matchesKeyword(name, KEYWORDS.ingredient)) {
    return { item_type: 'ingredient', auto_decrement: false, source: 'ingredient keyword' }
  }

  if (matchesKeyword(name, KEYWORDS.supply)) {
    return { item_type: 'supply', auto_decrement: false, source: 'supply keyword' }
  }

  if (matchesKeyword(name, KEYWORDS.prepared)) {
    return { item_type: 'prepared', auto_decrement: false, source: 'prepared keyword' }
  }

  if (matchesKeyword(name, KEYWORDS.prepackaged)) {
    return { item_type: 'prepackaged', auto_decrement: true, source: 'prepackaged keyword' }
  }

  // Default fallback for everything else
  return { item_type: 'prepackaged', auto_decrement: false, source: 'fallback' }
}

function matchesKeyword(name, keywords) {
  return keywords.some(keyword => name.includes(keyword))
}

async function fetchInventoryItems() {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, item_name, item_type, auto_decrement, is_ingredient')
    .order('item_name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch inventory items: ${error.message}`)
  }

  return data || []
}

async function applyUpdates(changes) {
  for (const change of changes) {
    const { id, nextType, nextAuto, nextIngredient } = change
    const { error } = await supabase
      .from('inventory_items')
      .update({
        item_type: nextType,
        auto_decrement: nextAuto,
        is_ingredient: nextIngredient
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to update ${change.name}: ${error.message}`)
    }
  }
}

function formatChange(change) {
  const parts = []
  if (change.currentType !== change.nextType) {
    parts.push(`type ${change.currentType} -> ${change.nextType}`)
  }
  if (change.currentAuto !== change.nextAuto) {
    parts.push(`auto ${change.currentAuto ? 'true' : 'false'} -> ${change.nextAuto ? 'true' : 'false'}`)
  }
  if (change.currentIngredient !== change.nextIngredient) {
    parts.push(`ingredient ${change.currentIngredient ? 'true' : 'false'} -> ${change.nextIngredient ? 'true' : 'false'}`)
  }
  return parts.join(', ')
}

async function main() {
  console.log('🔍 Classifying inventory items...')
  const items = await fetchInventoryItems()
  const changes = []

  for (const item of items) {
    const { item_type: currentType, auto_decrement: currentAuto } = item
    const classification = classifyItem(item)
    const nextType = classification.item_type
    const nextAuto = classification.auto_decrement

    const typeChanged = currentType !== nextType
    const autoChanged = currentAuto !== nextAuto

    const nextIngredient = nextType === 'ingredient'
    const ingredientChanged = (item.is_ingredient || false) !== nextIngredient

    if (typeChanged || autoChanged || ingredientChanged || SHOW_ALL) {
      changes.push({
        id: item.id,
        name: item.item_name,
        currentType,
        nextType,
        currentAuto,
        nextAuto,
        currentIngredient: item.is_ingredient || false,
        nextIngredient,
        reason: classification.source,
        isIngredientFlag: item.is_ingredient
      })
    }
  }

  if (changes.length === 0) {
    console.log('✅ No changes required. All items already match the heuristics.')
    return
  }

  console.log(`\nFound ${changes.length} item(s) with differences:\n`)
  changes.forEach(change => {
    console.log(`- ${change.name}: ${formatChange(change)} (${change.reason})`)
  })

  if (!APPLY_CHANGES) {
    console.log('\nDry run complete. Re-run with --apply to persist these updates.')
    return
  }

  console.log('\nApplying updates...')
  await applyUpdates(changes)
  console.log('✅ Updates applied successfully.')
}

main().catch(error => {
  console.error('❌ Classification script failed:', error.message)
  process.exit(1)
})
