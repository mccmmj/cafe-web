#!/usr/bin/env node

/**
 * Import product_code mappings for `cogs_products` from a Google Sheet (CSV export).
 *
 * Keys:
 * - Matches products by `square_item_id` (stable, Square-sourced).
 * - Updates `cogs_products.product_code` to the provided value (or clears it if blank).
 *
 * Usage:
 *  node scripts/import-cogs-product-codes-from-sheets.js --dry-run --csv-path data/cogs-product-code-mapping-template.csv
 *  node scripts/import-cogs-product-codes-from-sheets.js --apply --csv-url "https://.../export?format=csv&gid=..."
 *
 * Flags:
 *  --dry-run              Print plan only (default)
 *  --apply                Apply changes
 *  --env <path>           Env file path (default: .env.local)
 *  --csv-url <url>        CSV URL (overrides COGS_PRODUCT_CODES_SHEET_CSV_URL)
 *  --csv-path <path>      Read CSV from a local file path (no network)
 *
 * Required env vars (unless overridden):
 *  COGS_PRODUCT_CODES_SHEET_CSV_URL (unless --csv-url/--csv-path provided)
 *  SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *  SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from 'dotenv'
import fs from 'fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type Options = {
  dryRun: boolean
  envPath: string
  csvUrl: string | null
  csvPath: string | null
}

type RawRow = Record<string, string>

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
Import COGS product_code mappings from Google Sheets (CSV).

Usage:
  node scripts/import-cogs-product-codes-from-sheets.js --dry-run --csv-path data/cogs-product-code-mapping-template.csv
  node scripts/import-cogs-product-codes-from-sheets.js --apply --csv-url "https://.../export?format=csv&gid=..."

Flags:
  --dry-run              Print plan only (default)
  --apply                Apply changes
  --env <path>           Env file path (default: .env.local)
  --csv-url <url>        Override COGS_PRODUCT_CODES_SHEET_CSV_URL
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

function normalizeProductCode(value: string) {
  const raw = value.trim()
  if (!raw) return null

  const upper = raw.toUpperCase()
  const replaced = upper
    .replace(/&/g, ' AND ')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')

  const truncated = replaced.slice(0, 64)
  if (!truncated) return null
  if (!/^[A-Z0-9][A-Z0-9_]{0,63}$/.test(truncated)) return null
  return truncated
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
    const csvUrl = options.csvUrl || process.env.COGS_PRODUCT_CODES_SHEET_CSV_URL || ''
    if (!csvUrl) {
      console.error('Missing COGS_PRODUCT_CODES_SHEET_CSV_URL (or pass --csv-url / --csv-path)')
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

  const requiredHeaders = ['square item id', 'product code']
  const missingHeaders = requiredHeaders.filter(h => !parsedCsv.headers.includes(h))
  if (missingHeaders.length > 0) {
    console.error('CSV is missing required headers:')
    for (const h of missingHeaders) console.error(`- ${h}`)
    console.error(`Found headers: ${parsedCsv.headers.join(', ') || '(none)'}`)
    process.exit(1)
  }

  const rowErrors: string[] = []
  const desiredBySquareId = new Map<string, { desired: string | null; rowNumber: number }>()

  for (let i = 0; i < rawRows.length; i += 1) {
    const rowNumber = i + 2
    const row = rawRows[i]
    const squareItemId = normalizeText(row['square item id'])
    const productCodeRaw = normalizeText(row['product code'])

    if (!squareItemId) {
      rowErrors.push(`Row ${rowNumber}: Missing Square Item ID`)
      continue
    }

    const normalized = productCodeRaw ? normalizeProductCode(productCodeRaw) : null
    if (productCodeRaw && !normalized) {
      rowErrors.push(`Row ${rowNumber}: Invalid Product Code "${productCodeRaw}"`)
      continue
    }

    if (desiredBySquareId.has(squareItemId)) {
      rowErrors.push(`Row ${rowNumber}: Duplicate Square Item ID "${squareItemId}"`)
      continue
    }

    desiredBySquareId.set(squareItemId, { desired: normalized, rowNumber })
  }

  if (rowErrors.length > 0) {
    console.error('Validation errors:')
    for (const err of rowErrors) console.error(`- ${err}`)
    process.exit(1)
  }

  const supabase = createSupabase()
  const squareIds = Array.from(desiredBySquareId.keys())

  const { data: products, error } = await supabase
    .from('cogs_products')
    .select('id, square_item_id, name, product_code')
    .in('square_item_id', squareIds)

  if (error) throw new Error(`Failed loading cogs_products: ${error.message}`)

  const existingBySquareId = new Map<string, { id: string; name: string; product_code: string | null }>()
  for (const p of products ?? []) {
    existingBySquareId.set(p.square_item_id, { id: p.id, name: p.name, product_code: p.product_code ?? null })
  }

  const missingProducts = squareIds.filter(id => !existingBySquareId.has(id))
  if (missingProducts.length > 0) {
    console.error('Square Item IDs not found in cogs_products:')
    for (const id of missingProducts) console.error(`- ${id}`)
    process.exit(1)
  }

  const changes: Array<{ square_item_id: string; name: string; from: string | null; to: string | null }> = []
  for (const squareItemId of squareIds) {
    const existing = existingBySquareId.get(squareItemId)!
    const desired = desiredBySquareId.get(squareItemId)!.desired
    if ((existing.product_code ?? null) === desired) continue
    changes.push({ square_item_id: squareItemId, name: existing.name, from: existing.product_code ?? null, to: desired })
  }

  console.log(`${options.dryRun ? 'Dry run' : 'Apply'}: ${squareIds.length} rows, ${changes.length} updates`)
  for (const c of changes.slice(0, 25)) {
    console.log(`- ${c.square_item_id} (${c.name}): ${c.from ?? '(null)'} -> ${c.to ?? '(null)'}`)
  }
  if (changes.length > 25) console.log(`- ...and ${changes.length - 25} more`)

  if (options.dryRun || changes.length === 0) process.exit(0)

  // IMPORTANT:
  // Postgres checks NOT NULL constraints before ON CONFLICT resolution, so an UPSERT that omits required columns
  // (like `name`) can fail even if every row "should" conflict. Use UPDATE instead.
  for (let i = 0; i < changes.length; i += 1) {
    const change = changes[i]
    const { error: updateError } = await supabase
      .from('cogs_products')
      .update({ product_code: change.to })
      .eq('square_item_id', change.square_item_id)

    if (updateError) {
      throw new Error(`Failed updating cogs_products for ${change.square_item_id} (${change.name}): ${updateError.message}`)
    }
  }

  console.log('Done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
