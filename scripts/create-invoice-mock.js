#!/usr/bin/env node

/**
 * Create mock invoice artifacts (PO snapshot, raw text, parsed JSON, PDF)
 * for an existing purchase order in the database.
 *
 * Usage:
 *   node scripts/create-invoice-mock.js --order PO-2025-0101 [options]
 */

require('dotenv').config({ path: '.env.local' })

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const minimist = require('minimist')
const { createClient } = require('@supabase/supabase-js')

const OUTPUT_DIR = path.join('data', 'purchase-orders')

function parseArgs() {
  const args = minimist(process.argv.slice(2), {
    string: ['order', 'order-id', 'invoice', 'date', 'due-in', 'shipping', 'tax-rate', 'output-prefix'],
    boolean: ['overwrite', 'generate-images', 'split-two'],
    alias: {
      o: 'order',
      i: 'invoice',
      d: 'date'
    },
    default: {
      shipping: '0',
      'tax-rate': '0',
      'due-in': '30',
      overwrite: false,
      'output-prefix': null,
      'generate-images': false,
      'split-two': false
    }
  })

  const orderNumber = args.order
  const orderId = args['order-id']

  if (!orderNumber && !orderId) {
    throw new Error('Please provide --order <order_number> or --order-id <uuid>')
  }

  const invoiceNumber = args.invoice || `INV-${Date.now().toString().slice(-6)}`
  const invoiceDate = args.date || new Date().toISOString().slice(0, 10)
  const dueInDays = parseInt(args['due-in'], 10)
  const dueDate = new Date(new Date(invoiceDate).getTime() + dueInDays * 86400000)
    .toISOString()
    .slice(0, 10)

  const shippingAmount = Number(args.shipping) || 0
  const taxRate = Number(args['tax-rate']) || 0

  const outputPrefix = args['output-prefix'] || (orderNumber || orderId || invoiceNumber).replace(/[^a-zA-Z0-9_-]/g, '_')

  return {
    orderNumber,
    orderId,
    invoiceNumber,
    invoiceDate,
    dueDate,
    shippingAmount,
    taxRate,
    overwrite: Boolean(args.overwrite),
    outputPrefix,
    generateImages: Boolean(args['generate-images']),
    splitIntoTwo: Boolean(args['split-two'])
  }
}

function ensureOutputDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function fetchPurchaseOrder(client, { orderNumber, orderId }) {
  let query = client
    .from('purchase_orders')
    .select(`
      *,
      suppliers!purchase_orders_supplier_id_fkey (
        id, name, email, phone, address
      ),
      purchase_order_items!purchase_order_items_purchase_order_id_fkey (
        *,
        inventory_items!purchase_order_items_inventory_item_id_fkey (
          item_name, unit_type
        )
      )
    `)

  if (orderId) {
    query = query.eq('id', orderId)
  } else if (orderNumber) {
    query = query.eq('order_number', orderNumber)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch purchase order: ${error.message}`)
  }

  if (!data) {
    throw new Error('Purchase order not found')
  }

  return data
}

function buildFiles(prefix) {
  ensureOutputDir(OUTPUT_DIR)
  return {
    poSnapshot: path.join(OUTPUT_DIR, `${prefix}_purchase_order.json`),
    rawInvoice: path.join(OUTPUT_DIR, `${prefix}_invoice_raw.txt`),
    parsedInvoice: path.join(OUTPUT_DIR, `${prefix}_invoice_parsed.json`),
    pdfInvoice: path.join(OUTPUT_DIR, `${prefix}_invoice.pdf`),
    pngInvoice: path.join(OUTPUT_DIR, `${prefix}_invoice.png`),
    jpgInvoice: path.join(OUTPUT_DIR, `${prefix}_invoice.jpg`)
  }
}

function writeFileSafely(filePath, contents, overwrite) {
  if (!overwrite && fs.existsSync(filePath)) {
    throw new Error(`File already exists: ${filePath} (use --overwrite to replace)`)
  }
  fs.writeFileSync(filePath, contents)
}

function formatCurrency(amount) {
  return amount.toFixed(2)
}

function calculateTotals(items, shippingAmount, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity_ordered * (item.unit_cost || 0), 0)
  const tax = taxRate > 0 ? subtotal * taxRate : 0
  return {
    subtotal,
    shipping: shippingAmount,
    taxRate,
    tax,
    grandTotal: subtotal + shippingAmount + tax
  }
}

function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildRawInvoiceText(order, supplierName, billingAddress, invoiceInfo, totals) {
  const lines = []

  lines.push(supplierName)
  lines.push(`Invoice #: ${invoiceInfo.invoiceNumber}`)
  if (order.order_number) {
    lines.push(`PO #: ${order.order_number}`)
  }
  lines.push(`Invoice Date: ${invoiceInfo.invoiceDate}`)
  lines.push(`Due Date: ${invoiceInfo.dueDate}`)
  lines.push('')
  lines.push('Bill To:')
  billingAddress.forEach(line => lines.push(line))
  lines.push('')
  lines.push('Line Items:')

  order.purchase_order_items.forEach((item, idx) => {
    const inventory = item.inventory_items || {}
    const name = inventory.item_name || `Inventory Item ${item.inventory_item_id}`
    const unitCost = item.unit_cost || 0
    const lineTotal = item.quantity_ordered * unitCost
    lines.push(`${idx + 1}. ${name}`)
    lines.push(`   Qty: ${item.quantity_ordered} @ $${formatCurrency(unitCost)}          $${formatCurrency(lineTotal)}`)
    lines.push('')
  })

  lines.push(`Subtotal:                    $${formatCurrency(totals.subtotal)}`)
  if (totals.shipping > 0) {
    lines.push(`Shipping:                    $${formatCurrency(totals.shipping)}`)
  }
  if (totals.tax > 0) {
    lines.push(`Tax (${(totals.taxRate * 100).toFixed(2)}%):              $${formatCurrency(totals.tax)}`)
  }
  lines.push('')
  lines.push(`TOTAL DUE:                   $${formatCurrency(totals.grandTotal)}`)
  lines.push('')
  lines.push('Notes:')
  lines.push(' - Generated for testing OCR and invoice ingestion workflows.')

  return lines.join('\n')
}

function buildParsedInvoice(order, supplier, invoiceInfo, totals, files) {
  return {
    invoice_number: invoiceInfo.invoiceNumber,
    purchase_order_number: order.order_number,
    invoice_date: invoiceInfo.invoiceDate,
    due_date: invoiceInfo.dueDate,
    supplier: {
      id: supplier?.id || order.supplier_id,
      name: supplier?.name || 'Unknown Supplier',
      email: supplier?.email || null,
      phone: supplier?.phone || null
    },
    bill_to: {
      name: 'KP3 Cafe',
      address: '123 Beans Ave, Denver, CO 80202'
    },
    line_items: order.purchase_order_items.map(item => {
      const inventory = item.inventory_items || {}
      const unitCost = item.unit_cost || 0
      return {
        description: inventory.item_name || `Inventory Item ${item.inventory_item_id}`,
        inventory_item_id: item.inventory_item_id,
        quantity: item.quantity_ordered,
        unit_cost: unitCost,
        total: Number((item.quantity_ordered * unitCost).toFixed(2))
      }
    }),
    totals: {
      subtotal: Number(totals.subtotal.toFixed(2)),
      shipping: Number(totals.shipping.toFixed(2)),
      tax: Number(totals.tax.toFixed(2)),
      grand_total: Number(totals.grandTotal.toFixed(2)),
      currency: 'USD'
    },
    metadata: {
      tax_rate: totals.taxRate,
      source_po_file: path.basename(files.poSnapshot),
      raw_invoice_file: path.basename(files.rawInvoice)
    }
  }
}

async function main() {
  try {
    const options = parseArgs()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY)')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const order = await fetchPurchaseOrder(supabase, options)

    const supplier = order.suppliers || {
      id: order.supplier_id,
      name: 'Unknown Supplier'
    }

    const filesForSnapshot = buildFiles(options.outputPrefix)

    const poSnapshot = {
      id: order.id,
      supplier_id: order.supplier_id,
      supplier_name: supplier.name,
      order_number: order.order_number,
      status: order.status,
      order_date: order.order_date,
      expected_delivery_date: order.expected_delivery_date,
      notes: order.notes,
      items: order.purchase_order_items.map(item => ({
        inventory_item_id: item.inventory_item_id,
        inventory_item_name: item.inventory_items?.item_name || null,
        quantity_ordered: item.quantity_ordered,
        unit_cost: item.unit_cost || 0,
        unit_type: item.inventory_items?.unit_type || null
      }))
    }

    writeFileSafely(filesForSnapshot.poSnapshot, JSON.stringify(poSnapshot, null, 2), options.overwrite)

    const billingAddress = [
      'KP3 Cafe',
      '123 Beans Ave',
      'Denver, CO 80202'
    ]

    const baseInvoiceInfo = {
      invoiceNumber: options.invoiceNumber,
      invoiceDate: options.invoiceDate,
      dueDate: options.dueDate
    }

    const generateArtifacts = (itemsSubset, invoiceInfo, prefix, shippingAmountShare) => {
      const clonedOrder = { ...order, purchase_order_items: itemsSubset }
      const totals = calculateTotals(itemsSubset, shippingAmountShare, options.taxRate)
      const files = buildFiles(prefix)

      const rawText = buildRawInvoiceText(clonedOrder, supplier.name || 'Supplier', billingAddress, invoiceInfo, totals)
      writeFileSafely(files.rawInvoice, rawText, options.overwrite)

      const parsedInvoice = buildParsedInvoice(clonedOrder, supplier, invoiceInfo, totals, files)
      writeFileSafely(files.parsedInvoice, JSON.stringify(parsedInvoice, null, 2), options.overwrite)

      const pdfResult = spawnSync('node', [
        path.join('scripts', 'generate-mock-invoice-pdf.js'),
        '--input', files.rawInvoice,
        '--output', files.pdfInvoice
      ], { stdio: 'inherit' })

      if (pdfResult.status !== 0) {
        throw new Error('Failed to generate PDF invoice')
      }

      if (options.generateImages) {
        const pythonResult = spawnSync(process.env.PYTHON || 'python', [
          path.join('scripts', 'render_invoice_images.py'),
          '--input', files.pdfInvoice,
          '--png', files.pngInvoice,
          '--jpg', files.jpgInvoice
        ], { stdio: 'inherit' })

        if (pythonResult.status !== 0) {
          console.warn('Warning: failed to generate PNG/JPG rendition. Check dependencies (PyMuPDF/pdf2image).')
        }
      }

      return files
    }

    let createdFiles = []

    if (options.splitIntoTwo && order.purchase_order_items.length > 1) {
      const shuffled = shuffle(order.purchase_order_items)
      const splitIndex = Math.max(1, Math.floor(shuffled.length / 2))
      const itemsA = shuffled.slice(0, splitIndex)
      const itemsB = shuffled.slice(splitIndex)
      const shippingA = options.shippingAmount / 2
      const shippingB = options.shippingAmount - shippingA

      createdFiles.push(
        generateArtifacts(
          itemsA,
          { ...baseInvoiceInfo, invoiceNumber: `${baseInvoiceInfo.invoiceNumber}-A` },
          `${options.outputPrefix}_part1`,
          shippingA
        )
      )
      createdFiles.push(
        generateArtifacts(
          itemsB,
          { ...baseInvoiceInfo, invoiceNumber: `${baseInvoiceInfo.invoiceNumber}-B` },
          `${options.outputPrefix}_part2`,
          shippingB
        )
      )
    } else {
      createdFiles.push(
        generateArtifacts(
          order.purchase_order_items,
          baseInvoiceInfo,
          options.outputPrefix,
          options.shippingAmount
        )
      )
    }

    console.log('\nArtifacts created:')
    console.log(`  • PO Snapshot: ${filesForSnapshot.poSnapshot}`)
    createdFiles.forEach((files, idx) => {
      const label = createdFiles.length > 1 ? ` (part ${idx + 1})` : ''
      console.log(`  • Invoice Raw Text${label}: ${files.rawInvoice}`)
      console.log(`  • Invoice Parsed JSON${label}: ${files.parsedInvoice}`)
      console.log(`  • Invoice PDF${label}: ${files.pdfInvoice}`)
      if (options.generateImages) {
        console.log(`  • Invoice PNG${label}: ${files.pngInvoice}`)
        console.log(`  • Invoice JPG${label}: ${files.jpgInvoice}`)
      }
    })
  } catch (error) {
    console.error('Failed to create invoice mock:', error.message)
    process.exit(1)
  }
}

main()
