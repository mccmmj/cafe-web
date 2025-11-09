#!/usr/bin/env node

/**
 * Square Sandbox Sales Simulator
 *
 * Usage:
 *   node scripts/simulate-square-sales.js --scenario morningRush --orders 12
 *   node scripts/simulate-square-sales.js --dry-run --orders 5
 *
 * Flags:
 *   --scenario <name>    Use a predefined mix from config.scenarios (default: morningRush)
 *   --orders <count>     Number of orders to create (default: 8)
 *   --location <id>      Override Square location ID
 *   --dry-run            Do not call the Square API, only print the plan
 *   --reset-cache        Clear the simulator cache before running
 */

require('dotenv').config({ path: '.env.local' })

const crypto = require('crypto')
const { Client, Environment } = require('square/legacy')
const { simulatorConfig, validateSimulatorConfig } = require('./config/square-simulator-config')
const { loadCache, saveCache } = require('./utils/square-simulator-cache')

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    scenario: 'morningRush',
    orders: 8,
    location: simulatorConfig.locationId,
    dryRun: false,
    resetCache: false
  }

  args.forEach((arg, index) => {
    if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--reset-cache') {
      options.resetCache = true
    } else if (arg === '--scenario' && args[index + 1]) {
      options.scenario = args[index + 1]
    } else if (arg === '--orders' && args[index + 1]) {
      const parsed = Number(args[index + 1])
      if (!Number.isNaN(parsed) && parsed > 0) {
        options.orders = parsed
      }
    } else if (arg === '--location' && args[index + 1]) {
      options.location = args[index + 1]
    }
  })

  return options
}

function pickItemKey(scenarioMix) {
  const target = Math.random()
  let cumulative = 0

  for (const [key, weight] of Object.entries(scenarioMix)) {
    cumulative += weight
    if (target <= cumulative) {
      return key
    }
  }

  // Fallback in case rounding errors leave us short
  const keys = Object.keys(scenarioMix)
  return keys[Math.floor(Math.random() * keys.length)]
}

function buildLineItem(template) {
  const [minQty, maxQty] = template.defaultQuantityRange || [1, 2]
  const quantity = Math.max(minQty, Math.ceil(Math.random() * maxQty))

  return {
    catalogObjectId: template.variationId,
    quantity: String(quantity),
    basePriceMoney: template.basePriceMoney
      ? { ...template.basePriceMoney }
      : undefined,
    name: template.name
  }
}

async function createSquareClient() {
  if (!process.env.SQUARE_ACCESS_TOKEN) {
    throw new Error('SQUARE_ACCESS_TOKEN missing in environment')
  }

  const environment = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase() === 'production'
    ? Environment.Production
    : Environment.Sandbox

  return new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment
  })
}

async function createOrder(client, locationId, lineItems) {
  const idempotencyKey = crypto.randomUUID()

  const { result } = await client.ordersApi.createOrder({
    idempotencyKey,
    order: {
      locationId,
      lineItems
    }
  })

  return {
    order: result.order,
    idempotencyKey
  }
}

async function createPayment(client, order, currency) {
  const idempotencyKey = crypto.randomUUID()
  const orderTotal = order.netAmountDueMoney?.amount || order.totalMoney?.amount

  if (!orderTotal) {
    throw new Error(`Unable to determine order total for order ${order.id}`)
  }

  const { result } = await client.paymentsApi.createPayment({
    idempotencyKey,
    sourceId: 'CASH',
    amountMoney: {
      amount: orderTotal,
      currency
    },
    orderId: order.id,
    cashDetails: {
      buyerSuppliedMoney: {
        amount: orderTotal,
        currency
      }
    }
  })

  return {
    payment: result.payment,
    idempotencyKey
  }
}

function summarizeRun(runMeta) {
  const { orders, scenario, startedAt, dryRun } = runMeta
  console.log('\nSimulation Summary')
  console.log('------------------')
  console.log(`Scenario: ${scenario.label}`)
  console.log(`Orders planned: ${orders.length}`)
  console.log(`Dry run: ${dryRun ? 'yes' : 'no'}`)
  console.log(`Started: ${new Date(startedAt).toISOString()}`)

  const counts = orders.reduce((acc, order) => {
    order.items.forEach(item => {
      acc[item.key] = (acc[item.key] || 0) + Number(item.quantity)
    })
    return acc
  }, {})

  console.log('\nItem quantities:')
  Object.entries(counts).forEach(([key, qty]) => {
    const template = simulatorConfig.items.find(item => item.key === key)
    const name = template ? template.name : key
    console.log(`  - ${name}: ${qty}`)
  })
}

async function main() {
  const options = parseArgs()
  const scenario = simulatorConfig.scenarios[options.scenario]

  if (!scenario) {
    console.error(`Error: Unknown scenario "${options.scenario}". Available scenarios:`)
    Object.keys(simulatorConfig.scenarios).forEach(name => {
      console.error(`  - ${name}`)
    })
    process.exit(1)
  }

  const missing = validateSimulatorConfig()
  if (missing.length > 0) {
    console.error('Error: Simulator configuration incomplete. Missing:')
    missing.forEach(entry => console.error(`  - ${entry}`))
    process.exit(1)
  }

  const cache = options.resetCache ? {} : loadCache()
  const runMeta = {
    startedAt: Date.now(),
    dryRun: options.dryRun,
    scenario,
    orders: []
  }

  const templatesByKey = simulatorConfig.items.reduce((map, item) => {
    map[item.key] = item
    return map
  }, {})

  // Build the pending orders with random line items
  for (let index = 0; index < options.orders; index += 1) {
    const chosenKey = pickItemKey(scenario.mix)
    const template = templatesByKey[chosenKey]

    if (!template) {
      throw new Error(`Missing template for item key "${chosenKey}"`)
    }

    const lineItem = buildLineItem(template)

    runMeta.orders.push({
      items: [
        {
          key: chosenKey,
          quantity: lineItem.quantity
        }
      ],
      squarePayload: {
        lineItems: [lineItem]
      }
    })
  }

  summarizeRun(runMeta)

  if (options.dryRun) {
    console.log('\nDry run complete. Remove --dry-run to push orders to Square.')
    return
  }

  const client = await createSquareClient()

  for (const [index, order] of runMeta.orders.entries()) {
    const number = index + 1
    console.log(`\nCreating order ${number}/${runMeta.orders.length}...`)
    const { order: createdOrder } = await createOrder(
      client,
      options.location || simulatorConfig.locationId,
      order.squarePayload.lineItems
    )

    runMeta.orders[index].squareOrderId = createdOrder.id
    console.log(`   Order ID: ${createdOrder.id}`)

    const { payment } = await createPayment(
      client,
      createdOrder,
      simulatorConfig.currency
    )

    runMeta.orders[index].squarePaymentId = payment.id
    console.log(`   Payment ID: ${payment.id}`)

    cache.lastOrderId = createdOrder.id
    cache.lastOrderCreatedAt = createdOrder.createdAt
    cache.lastPaymentId = payment.id
    cache.lastRunScenario = options.scenario
    cache.updatedAt = new Date().toISOString()

    saveCache(cache)
  }

  console.log('\nSimulation finished successfully.')
  console.log(`Cache updated at ${cache.updatedAt}`)
}

main().catch(error => {
  console.error('\nSimulation failed:', error.message)
  if (error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
})
