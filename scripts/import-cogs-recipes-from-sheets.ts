#!/usr/bin/env node

/**
 * Import product base recipes from a Google Sheet (CSV export).
 *
 * - Source of truth for products remains Square (`cogs_products`).
 * - Sheet defines recipes keyed by `cogs_products.product_code` and `inventory_items.item_name`.
 * - Lines are replaced to match the sheet for each (product_code, effective_from) recipe header.
 *
 * Usage:
 *  node scripts/import-cogs-recipes-from-sheets.js --dry-run
 *  node scripts/import-cogs-recipes-from-sheets.js --apply
 *
 * Flags:
 *  --dry-run              Print plan only (no writes) (default)
 *  --apply                Apply changes
 *  --env <path>           Env file path (default: .env.local)
 *  --csv-url <url>        Override COGS_RECIPES_SHEET_CSV_URL env var
 *  --csv-path <path>      Read CSV from a local file path (no network)
 *
 * Required env vars:
 *  COGS_RECIPES_SHEET_CSV_URL (unless --csv-url provided)
 *  SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *  SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import fs from 'fs'

type Options = {
  dryRun: boolean
  envPath: string
  csvUrl: string | null
  csvPath: string | null
}

type RawRow = Record<string, string>

type RecipeLineRow = {
  productCode: string
  effectiveFrom: string
  yieldQty: number
  yieldUnit: string
  ingredientName: string
  ingredientQty: number
  ingredientUnit: string
  lossPct: number
  recipeNotes: string | null
  rowNumber: number
}

type RecipeHeaderKey = `${string}__${string}` // productCode__effectiveFromIso

type RecipeHeader = {
  key: RecipeHeaderKey
  productCode: string
  effectiveFromIso: string
  yieldQty: number
  yieldUnit: string
  recipeNotes: string | null
  lines: Array<{
    ingredientName: string
    ingredientQty: number
    ingredientUnit: string
    lossPct: number
    rowNumber: number
  }>
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    dryRun: true,
    envPath: '.env.local',
    csvUrl: null,
    csvPath: null,
  }

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--apply') options.dryRun = false
    else if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--env') options.envPath = argv[i + 1] ?? '.env.local'
    else if (arg === '--csv-url') options.csvUrl = argv[i + 1] ?? null
    else if (arg === '--csv-path') options.csvPath = argv[i + 1] ?? null
    else if (arg === '--help' || arg === '-h') {
      printHelpAndExit(0)
    } else {
      console.error(`Unknown argument: ${arg}`)
      printHelpAndExit(1)
    }
    if (arg === '--env' || arg === '--csv-url' || arg === '--csv-path') i += 1
  }

  return options
}

function printHelpAndExit(code: number) {
  console.log(`
Import COGS product base recipes from Google Sheets (CSV).

Usage:
  node scripts/import-cogs-recipes-from-sheets.js --dry-run
  node scripts/import-cogs-recipes-from-sheets.js --apply

Flags:
  --dry-run              Print plan only (default)
  --apply                Apply changes
  --env <path>           Env file path (default: .env.local)
  --csv-url <url>        Override COGS_RECIPES_SHEET_CSV_URL
  --csv-path <path>      Read CSV from a local file path (no network)
`)
  process.exit(code)
}

function normalizeHeader(value: string) {
  const withoutBom = value.replace(/^\uFEFF/, '')
  return withoutBom
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
}

function parseDelimitedLine(line: string, delimiter: ',' | '\t') {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }
    current += ch
  }
  cells.push(current)
  return cells.map(c => c.trim())
}

function detectDelimiter(headerLine: string): ',' | '\t' {
  const commaCount = (headerLine.match(/,/g) || []).length
  const tabCount = (headerLine.match(/\t/g) || []).length
  return tabCount > commaCount ? '\t' : ','
}

function parseCsv(text: string): { rows: RawRow[]; headers: string[] } {
  const cleaned = text.replace(/^\uFEFF/, '')
  const lines = cleaned
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim().length > 0)

  if (lines.length === 0) return { rows: [], headers: [] }

  const delimiter = detectDelimiter(lines[0])
  const headerCells = parseDelimitedLine(lines[0], delimiter)
  const headers = headerCells.map(normalizeHeader)

  const rows: RawRow[] = []
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseDelimitedLine(lines[i], delimiter)
    const row: RawRow = {}
    for (let c = 0; c < headers.length; c += 1) {
      row[headers[c]] = cells[c] ?? ''
    }
    rows.push(row)
  }
  return { rows, headers }
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseNumber(value: string, fallback: number) {
  const cleaned = value.trim()
  if (!cleaned) return fallback
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : fallback
}

function parseDateToUtcMidnightIso(value: string) {
  const raw = value.trim()
  if (!raw) return null
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const [_, y, mo, d] = m
  return new Date(`${y}-${mo}-${d}T00:00:00.000Z`).toISOString()
}

function toRecipeLineRow(row: RawRow, rowNumber: number) {
  const productCode = normalizeText(row['product code'])
  const effectiveFromIso = parseDateToUtcMidnightIso(normalizeText(row['effective from']))
  const yieldQty = parseNumber(normalizeText(row['yield qty']), 1)
  const yieldUnit = normalizeText(row['yield unit']) || 'each'
  const ingredientName = normalizeText(row['ingredient name'])
  const ingredientQty = parseNumber(normalizeText(row['ingredient qty']), NaN)
  const ingredientUnit = normalizeText(row['ingredient unit']) || 'each'
  const lossPct = parseNumber(normalizeText(row['loss %']), 0)
  const recipeNotes = normalizeText(row['recipe notes']) || null

  const errors: string[] = []
  if (!productCode) errors.push('Missing Product Code')
  if (!effectiveFromIso) errors.push('Effective From must be YYYY-MM-DD')
  if (!Number.isFinite(yieldQty) || yieldQty <= 0) errors.push('Yield Qty must be > 0')
  if (!yieldUnit) errors.push('Missing Yield Unit')
  if (!ingredientName) errors.push('Missing Ingredient Name')
  if (!Number.isFinite(ingredientQty) || ingredientQty <= 0) errors.push('Ingredient Qty must be > 0')
  if (!ingredientUnit) errors.push('Missing Ingredient Unit')
  if (!Number.isFinite(lossPct) || lossPct < 0 || lossPct > 100) errors.push('Loss % must be between 0 and 100')

  if (errors.length > 0) {
    return { ok: false as const, errors, rowNumber }
  }

  const normalizedProductCode = productCode.toUpperCase()
  if (!/^[A-Z0-9][A-Z0-9_]{0,63}$/.test(normalizedProductCode)) {
    return { ok: false as const, errors: ['Product Code must match ^[A-Z0-9][A-Z0-9_]{0,63}$'], rowNumber }
  }

  return {
    ok: true as const,
    row: {
      productCode: normalizedProductCode,
      effectiveFrom: effectiveFromIso!,
      yieldQty,
      yieldUnit,
      ingredientName,
      ingredientQty,
      ingredientUnit,
      lossPct,
      recipeNotes,
      rowNumber,
    } satisfies RecipeLineRow,
  }
}

function groupRows(rows: RecipeLineRow[]) {
  const byKey = new Map<RecipeHeaderKey, RecipeHeader>()
  const errors: string[] = []

  for (const row of rows) {
    const key = `${row.productCode}__${row.effectiveFrom}` as RecipeHeaderKey
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, {
        key,
        productCode: row.productCode,
        effectiveFromIso: row.effectiveFrom,
        yieldQty: row.yieldQty,
        yieldUnit: row.yieldUnit,
        recipeNotes: row.recipeNotes,
        lines: [{
          ingredientName: row.ingredientName,
          ingredientQty: row.ingredientQty,
          ingredientUnit: row.ingredientUnit,
          lossPct: row.lossPct,
          rowNumber: row.rowNumber,
        }],
      })
      continue
    }

    if (existing.yieldQty !== row.yieldQty) {
      errors.push(`Row ${row.rowNumber}: Yield Qty differs within ${row.productCode} @ ${row.effectiveFrom}`)
    }
    if (existing.yieldUnit !== row.yieldUnit) {
      errors.push(`Row ${row.rowNumber}: Yield Unit differs within ${row.productCode} @ ${row.effectiveFrom}`)
    }
    const existingNotes = existing.recipeNotes ?? ''
    const rowNotes = row.recipeNotes ?? ''
    if (existingNotes && rowNotes && existingNotes !== rowNotes) {
      errors.push(`Row ${row.rowNumber}: Recipe Notes differs within ${row.productCode} @ ${row.effectiveFrom}`)
    }
    if (!existing.recipeNotes && row.recipeNotes) {
      existing.recipeNotes = row.recipeNotes
    }

    existing.lines.push({
      ingredientName: row.ingredientName,
      ingredientQty: row.ingredientQty,
      ingredientUnit: row.ingredientUnit,
      lossPct: row.lossPct,
      rowNumber: row.rowNumber,
    })
  }

  for (const header of byKey.values()) {
    const seen = new Map<string, number>()
    for (const line of header.lines) {
      const k = line.ingredientName.toLowerCase()
      if (seen.has(k)) {
        errors.push(`Row ${line.rowNumber}: Duplicate Ingredient Name "${line.ingredientName}" for ${header.productCode} @ ${header.effectiveFromIso.slice(0, 10)}`)
      } else {
        seen.set(k, line.rowNumber)
      }
    }
  }

  return { headers: Array.from(byKey.values()), errors }
}

function loadEnv(envPath: string) {
  dotenv.config({ path: envPath })
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function getSupabaseServiceKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

function createSupabase(): SupabaseClient {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceKey()
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

async function fetchCsv(csvUrl: string) {
  const res = await fetch(csvUrl, { method: 'GET' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to fetch CSV: ${res.status} ${text}`)
  }
  const contentType = res.headers.get('content-type') || ''
  const text = await res.text()
  const looksLikeHtml = /^\s*</.test(text) && /<html[\s>]/i.test(text)
  if (contentType.includes('text/html') || looksLikeHtml) {
    throw new Error('The provided URL returned HTML, not CSV. Use a Google Sheets CSV export/published CSV URL.')
  }
  return text
}

async function main() {
  const options = parseArgs(process.argv)
  loadEnv(options.envPath)

  let csvText = ''
  if (options.csvPath) {
    csvText = fs.readFileSync(options.csvPath, 'utf8')
  } else {
    const csvUrl = options.csvUrl || process.env.COGS_RECIPES_SHEET_CSV_URL || ''
    if (!csvUrl) {
      console.error('Missing COGS_RECIPES_SHEET_CSV_URL (or pass --csv-url / --csv-path)')
      process.exit(1)
    }
    csvText = await fetchCsv(csvUrl)
  }

  const parsedCsv = parseCsv(csvText)
  const rawRows = parsedCsv.rows
  if (rawRows.length === 0) {
    console.log('No rows found in CSV.')
    process.exit(0)
  }

  const requiredHeaders = [
    'product code',
    'effective from',
    'yield qty',
    'yield unit',
    'ingredient name',
    'ingredient qty',
    'ingredient unit',
    'loss %',
  ]
  const missingHeaders = requiredHeaders.filter(h => !parsedCsv.headers.includes(h))
  if (missingHeaders.length > 0) {
    console.error('CSV is missing required headers:')
    for (const h of missingHeaders) console.error(`- ${h}`)
    console.error(`Found headers: ${parsedCsv.headers.join(', ') || '(none)'}`)
    process.exit(1)
  }

  const parsed: RecipeLineRow[] = []
  const rowErrors: string[] = []

  for (let i = 0; i < rawRows.length; i += 1) {
    const rowNumber = i + 2
    const result = toRecipeLineRow(rawRows[i], rowNumber)
    if (!result.ok) {
      rowErrors.push(`Row ${rowNumber}: ${result.errors.join('; ')}`)
      continue
    }
    parsed.push(result.row)
  }

  const grouped = groupRows(parsed)
  const allErrors = [...rowErrors, ...grouped.errors]
  if (allErrors.length > 0) {
    console.error('Validation errors:')
    for (const err of allErrors) console.error(`- ${err}`)
    process.exit(1)
  }

  const supabase = createSupabase()

  const productCodes = Array.from(new Set(grouped.headers.map(h => h.productCode)))
  const { data: products, error: productsError } = await supabase
    .from('cogs_products')
    .select('id, product_code, name, is_active')
    .in('product_code', productCodes)

  if (productsError) throw new Error(`Failed loading cogs_products: ${productsError.message}`)

  const productIdByCode = new Map<string, string>()
  const missingProductCodes: string[] = []
  for (const code of productCodes) {
    const match = (products ?? []).find(p => p.product_code === code)
    if (!match) missingProductCodes.push(code)
    else productIdByCode.set(code, match.id)
  }
  if (missingProductCodes.length > 0) {
    console.error('Missing product_code in cogs_products:')
    for (const code of missingProductCodes) console.error(`- ${code}`)
    process.exit(1)
  }

  const ingredientNames = Array.from(new Set(grouped.headers.flatMap(h => h.lines.map(l => l.ingredientName))))
  const { data: inventoryItems, error: inventoryError } = await supabase
    .from('inventory_items')
    .select('id, item_name, deleted_at')
    .in('item_name', ingredientNames)

  if (inventoryError) throw new Error(`Failed loading inventory_items: ${inventoryError.message}`)

  const inventoryIdByName = new Map<string, string>()
  const missingIngredients: string[] = []
  for (const name of ingredientNames) {
    const match = (inventoryItems ?? []).find(i => i.item_name === name)
    if (!match) missingIngredients.push(name)
    else inventoryIdByName.set(name, match.id)
  }
  if (missingIngredients.length > 0) {
    console.error('Missing inventory_items.item_name:')
    for (const name of missingIngredients) console.error(`- ${name}`)
    process.exit(1)
  }

  console.log(`${options.dryRun ? 'Dry run' : 'Apply'}: ${grouped.headers.length} recipe headers`)

  let createdRecipes = 0
  let updatedRecipes = 0
  let replacedLines = 0

  for (const header of grouped.headers) {
    const productId = productIdByCode.get(header.productCode)!
    const effectiveFromIso = header.effectiveFromIso

    const { data: existingRecipes, error: existingError } = await supabase
      .from('cogs_product_recipes')
      .select('id, product_id, effective_from')
      .eq('product_id', productId)
      .eq('effective_from', effectiveFromIso)

    if (existingError) throw new Error(`Failed loading existing recipes: ${existingError.message}`)
    if ((existingRecipes ?? []).length > 1) {
      throw new Error(`Multiple recipes found for ${header.productCode} @ ${effectiveFromIso}`)
    }

    const newLines = header.lines.map(l => ({
      inventory_item_id: inventoryIdByName.get(l.ingredientName)!,
      qty: l.ingredientQty,
      unit: l.ingredientUnit,
      loss_pct: l.lossPct,
    }))

    if (options.dryRun) {
      const action = (existingRecipes ?? []).length === 0 ? 'CREATE' : 'UPDATE'
      console.log(`- ${action} ${header.productCode} @ ${effectiveFromIso.slice(0, 10)} (${newLines.length} lines)`)
      continue
    }

    const existing = (existingRecipes ?? [])[0] as { id: string } | undefined
    let recipeId = existing?.id ?? null

    if (!recipeId) {
      const { data: inserted, error: insertError } = await supabase
        .from('cogs_product_recipes')
        .insert([{
          product_id: productId,
          version: 1,
          effective_from: effectiveFromIso,
          effective_to: null,
          yield_qty: header.yieldQty,
          yield_unit: header.yieldUnit,
          notes: header.recipeNotes,
        }])
        .select('id')
        .single()

      if (insertError || !inserted) throw new Error(`Failed creating recipe for ${header.productCode}: ${insertError?.message ?? 'Unknown error'}`)
      recipeId = inserted.id
      createdRecipes += 1
    } else {
      const { error: updateError } = await supabase
        .from('cogs_product_recipes')
        .update({
          yield_qty: header.yieldQty,
          yield_unit: header.yieldUnit,
          notes: header.recipeNotes,
        })
        .eq('id', recipeId)

      if (updateError) throw new Error(`Failed updating recipe for ${header.productCode}: ${updateError.message}`)
      updatedRecipes += 1
    }

    const { error: deleteError } = await supabase
      .from('cogs_product_recipe_lines')
      .delete()
      .eq('recipe_id', recipeId)

    if (deleteError) throw new Error(`Failed deleting existing lines for ${header.productCode}: ${deleteError.message}`)

    const { error: insertLinesError } = await supabase
      .from('cogs_product_recipe_lines')
      .insert(newLines.map(l => ({ recipe_id: recipeId, ...l })))

    if (insertLinesError) throw new Error(`Failed inserting lines for ${header.productCode}: ${insertLinesError.message}`)

    replacedLines += newLines.length
  }

  if (!options.dryRun) {
    console.log(`Done. Created recipes: ${createdRecipes}, updated recipes: ${updatedRecipes}, inserted lines: ${replacedLines}`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
