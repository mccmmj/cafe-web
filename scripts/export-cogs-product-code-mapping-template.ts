#!/usr/bin/env node

/**
 * Export a starter CSV for product_code mapping from `cogs_products`.
 *
 * - Pulls products from Supabase (service key).
 * - Generates a suggested Product Code from the product name (uppercased, underscore-safe).
 * - Ensures uniqueness by suffixing with the last 5 chars of Square Item ID when needed.
 *
 * Usage:
 *  node scripts/export-cogs-product-code-mapping-template.js
 *
 * Flags:
 *  --env <path>           Env file path (default: .env.local)
 *  --out <path>           Output CSV path (default: data/cogs-product-code-mapping-template.csv)
 *
 * Required env vars:
 *  SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *  SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

type Options = {
  envPath: string
  outPath: string
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    envPath: '.env.local',
    outPath: 'data/cogs-product-code-mapping-template.csv',
  }

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--env') options.envPath = argv[i + 1] ?? options.envPath
    else if (arg === '--out') options.outPath = argv[i + 1] ?? options.outPath
    else if (arg === '--help' || arg === '-h') {
      console.log(`
Export COGS product_code mapping template CSV.

Usage:
  node scripts/export-cogs-product-code-mapping-template.js

Flags:
  --env <path>           Env file path (default: .env.local)
  --out <path>           Output CSV path (default: data/cogs-product-code-mapping-template.csv)
`)
      process.exit(0)
    } else {
      console.error(`Unknown argument: ${arg}`)
      process.exit(1)
    }
    if (arg === '--env' || arg === '--out') i += 1
  }

  return options
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function getSupabaseServiceKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

function normalizeProductCodeFromName(name: string) {
  const upper = name.trim().toUpperCase()
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

function csvEscape(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/\"/g, '""')}"`
  }
  return value
}

async function main() {
  const options = parseArgs(process.argv)
  dotenv.config({ path: options.envPath })

  const supabaseUrl = getSupabaseUrl()
  const serviceKey = getSupabaseServiceKey()
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)')
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: products, error } = await supabase
    .from('cogs_products')
    .select('square_item_id, name, category, is_active')
    .order('name', { ascending: true })

  if (error) throw new Error(`Failed loading cogs_products: ${error.message}`)

  const used = new Set<string>()
  const rows: Array<{ square_item_id: string; name: string; category: string | null; is_active: boolean; product_code: string }> = []

  for (const p of products ?? []) {
    const name = typeof p.name === 'string' ? p.name : ''
    const squareItemId = typeof p.square_item_id === 'string' ? p.square_item_id : ''
    if (!name || !squareItemId) continue

    let code = normalizeProductCodeFromName(name) ?? 'UNNAMED'
    if (used.has(code)) {
      const suffix = squareItemId.slice(-5).toUpperCase()
      const base = code.slice(0, Math.max(0, 64 - (suffix.length + 1)))
      code = `${base}_${suffix}`
    }
    used.add(code)

    rows.push({
      square_item_id: squareItemId,
      name,
      category: typeof p.category === 'string' ? p.category : null,
      is_active: Boolean(p.is_active),
      product_code: code,
    })
  }

  const header = ['Square Item ID', 'Name', 'Category', 'Active', 'Product Code']
  const lines = [
    header.join(','),
    ...rows.map(r => [
      csvEscape(r.square_item_id),
      csvEscape(r.name),
      csvEscape(r.category ?? ''),
      csvEscape(String(r.is_active)),
      csvEscape(r.product_code),
    ].join(',')),
  ]

  const outPath = options.outPath
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8')

  console.log(`Wrote ${rows.length} rows to ${outPath}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

