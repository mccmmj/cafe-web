// Dynamic imports to avoid build issues
let Fuse: any = null
let stringSimilarity: any = null

async function getMatchingLibraries() {
  if (!Fuse || !stringSimilarity) {
    try {
      Fuse = (await import('fuse.js')).default
      // @ts-expect-error string-similarity has no type definitions
      stringSimilarity = await import('string-similarity')
    } catch (error) {
      console.error('Failed to load matching libraries:', error)
      throw new Error('Matching libraries not available')
    }
  }
  return { Fuse, stringSimilarity }
}

export interface InventoryItem {
  id: string
  item_name: string
  current_stock: number
  unit_cost: number
  unit_type: string
  pack_size?: number
  supplier_name?: string
  square_item_id?: string
}

export interface InvoiceItem {
  id: string
  item_description: string
  supplier_item_code?: string
  quantity: number
  unit_price: number
  package_size?: string
  unit_type?: string
}

export interface ItemMatch {
  inventory_item_id: string
  inventory_item: InventoryItem
  confidence: number
  match_reasons: string[]
  match_method: 'exact' | 'fuzzy' | 'sku' | 'supplier' | 'manual'
  quantity_conversion?: {
    invoice_quantity: number
    inventory_quantity: number
    conversion_factor: number
    package_info: string
  }
}

export interface MatchingOptions {
  supplier_name?: string
  fuzzy_threshold?: number // 0-1, default 0.6
  exact_match_boost?: number // default 0.3
  supplier_match_boost?: number // default 0.1
  sku_match_boost?: number // default 0.2
  max_suggestions?: number // default 5
}

/**
 * Find matching inventory items for an invoice item
 */
export async function findItemMatches(
  invoiceItem: InvoiceItem,
  inventoryItems: InventoryItem[],
  options: MatchingOptions = {}
): Promise<ItemMatch[]> {
  try {
    const {
      supplier_name,
      fuzzy_threshold = 0.6,
      exact_match_boost = 0.3,
      supplier_match_boost = 0.1,
      sku_match_boost = 0.2,
      max_suggestions = 5
    } = options

    const { Fuse, stringSimilarity } = await getMatchingLibraries()

    console.log('🔍 Finding matches for:', invoiceItem.item_description)

    const matches: ItemMatch[] = []

    // 1. Exact name match
    const exactMatches = inventoryItems.filter(item => 
      item.item_name.toLowerCase() === invoiceItem.item_description.toLowerCase()
    )

    for (const item of exactMatches) {
      matches.push({
        inventory_item_id: item.id,
        inventory_item: item,
        confidence: 1.0,
        match_reasons: ['Exact name match'],
        match_method: 'exact',
        quantity_conversion: calculateQuantityConversion(invoiceItem, item)
      })
    }

    // 2. SKU/Item Code match
    if (invoiceItem.supplier_item_code) {
      const skuMatches = inventoryItems.filter(item => 
        item.square_item_id?.toLowerCase() === invoiceItem.supplier_item_code?.toLowerCase()
      )

      for (const item of skuMatches) {
        const existingMatch = matches.find(m => m.inventory_item_id === item.id)
        if (!existingMatch) {
          matches.push({
            inventory_item_id: item.id,
            inventory_item: item,
            confidence: 0.95,
            match_reasons: ['SKU/Item code match'],
            match_method: 'sku',
            quantity_conversion: calculateQuantityConversion(invoiceItem, item)
          })
        }
      }
    }

    // 3. Fuzzy matching using Fuse.js
    const fuseOptions = {
      keys: ['item_name'],
      threshold: 1 - fuzzy_threshold, // Fuse uses inverted threshold
      includeScore: true,
      minMatchCharLength: 3
    }

    const fuse = new Fuse(inventoryItems, fuseOptions)
    const fuzzyResults = fuse.search(invoiceItem.item_description)

    for (const result of fuzzyResults.slice(0, max_suggestions)) {
      const item = result.item
      const existingMatch = matches.find(m => m.inventory_item_id === item.id)
      
      if (!existingMatch) {
        let confidence = 1 - (result.score || 0.5) // Convert Fuse score to confidence
        const reasons = [`Fuzzy name match (${Math.round(confidence * 100)}%)`]

        // Apply boosts
        if (supplier_name && item.supplier_name?.toLowerCase() === supplier_name.toLowerCase()) {
          confidence += supplier_match_boost
          reasons.push('Same supplier')
        }

        // Unit type similarity
        if (invoiceItem.unit_type && item.unit_type === invoiceItem.unit_type) {
          confidence += 0.05
          reasons.push('Unit type match')
        }

        matches.push({
          inventory_item_id: item.id,
          inventory_item: item,
          confidence: Math.min(0.95, confidence), // Cap at 95% for fuzzy matches
          match_reasons: reasons,
          match_method: 'fuzzy',
          quantity_conversion: calculateQuantityConversion(invoiceItem, item)
        })
      }
    }

    // 4. String similarity as backup
    const unmatchedItems = inventoryItems.filter(item => 
      !matches.find(m => m.inventory_item_id === item.id)
    )

    for (const item of unmatchedItems) {
      const similarity = stringSimilarity.compareTwoStrings(
        invoiceItem.item_description.toLowerCase(),
        item.item_name.toLowerCase()
      )

      if (similarity >= fuzzy_threshold) {
        let confidence = similarity
        const reasons = [`String similarity (${Math.round(similarity * 100)}%)`]

        // Apply boosts
        if (supplier_name && item.supplier_name?.toLowerCase() === supplier_name.toLowerCase()) {
          confidence += supplier_match_boost
          reasons.push('Same supplier')
        }

        matches.push({
          inventory_item_id: item.id,
          inventory_item: item,
          confidence: Math.min(0.9, confidence), // Cap at 90% for string similarity
          match_reasons: reasons,
          match_method: 'fuzzy',
          quantity_conversion: calculateQuantityConversion(invoiceItem, item)
        })
      }
    }

    // Sort by confidence and return top matches
    const sortedMatches = matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, max_suggestions)

    console.log(`✅ Found ${sortedMatches.length} matches for "${invoiceItem.item_description}"`)
    
    return sortedMatches

  } catch (error: any) {
    console.error('Item matching error:', error)
    return []
  }
}

/**
 * Calculate quantity conversion between invoice and inventory units
 */
function calculateQuantityConversion(
  invoiceItem: InvoiceItem,
  inventoryItem: InventoryItem
): ItemMatch['quantity_conversion'] {
  const conversion = {
    invoice_quantity: invoiceItem.quantity,
    inventory_quantity: invoiceItem.quantity,
    conversion_factor: 1,
    package_info: 'Direct match'
  }

  // If inventory item has a pack size, present an equivalent-in-packs helper WITHOUT multiplying stock
  const packSize = Number((inventoryItem as any)?.pack_size) || 1
  if (packSize > 1) {
    const approxPacks = (invoiceItem.quantity || 0) / packSize
    return {
      invoice_quantity: invoiceItem.quantity,
      inventory_quantity: invoiceItem.quantity, // stock change uses invoice units
      conversion_factor: 1,
      package_info: `Invoice qty ${invoiceItem.quantity} units • Pack size ${packSize} → ~${approxPacks.toFixed(2)} packs (no extra multiplier applied)`
    }
  }

  return packSize === 1 ? conversion : undefined
}

/**
 * Match invoice to existing purchase orders
 */
export interface PurchaseOrder {
  id: string
  order_number: string
  supplier_id: string
  supplier_name: string
  order_date: string
  expected_delivery_date?: string
  status: string
  total_amount: number
  items: Array<{
    id: string
    inventory_item_id: string
    item_name: string
    quantity_ordered: number
    unit_cost: number
    total_cost: number
  }>
}

export interface OrderMatch {
  purchase_order_id: string
  purchase_order: PurchaseOrder
  confidence: number
  match_reasons: string[]
  quantity_variance: number
  amount_variance: number
  matched_items: number
  total_items: number
}

/**
 * Find matching purchase orders for an invoice
 */
export async function findOrderMatches(
  supplierName: string,
  invoiceDate: string,
  invoiceTotal: number,
  invoiceItems: InvoiceItem[],
  purchaseOrders: PurchaseOrder[]
): Promise<OrderMatch[]> {
  try {
    console.log('🔍 Finding order matches for supplier:', supplierName)

    const matches: OrderMatch[] = []
    const invoiceDateTime = new Date(invoiceDate)

    // Filter orders by supplier and date range (within 30 days)
    const candidateOrders = purchaseOrders.filter(order => {
      const orderDate = new Date(order.order_date)
      const daysDiff = Math.abs((invoiceDateTime.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
      
      return (
        order.supplier_name.toLowerCase() === supplierName.toLowerCase() &&
        ['sent', 'confirmed'].includes(order.status) &&
        daysDiff <= 30
      )
    })

    for (const order of candidateOrders) {
      let confidence = 0
      const reasons: string[] = []
      let matchedItems = 0
      let quantityVariance = 0
      const amountVariance = Math.abs(invoiceTotal - order.total_amount)

      // Check supplier match (base confidence)
      if (order.supplier_name.toLowerCase() === supplierName.toLowerCase()) {
        confidence += 0.4
        reasons.push('Supplier match')
      }

      // Check date proximity
      const orderDate = new Date(order.order_date)
      const daysDiff = Math.abs((invoiceDateTime.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff <= 7) {
        confidence += 0.2
        reasons.push(`Recent order (${daysDiff} days ago)`)
      } else if (daysDiff <= 14) {
        confidence += 0.1
        reasons.push(`Order within 2 weeks`)
      }

      // Check amount similarity
      const amountDiffPercent = Math.abs(invoiceTotal - order.total_amount) / order.total_amount
      if (amountDiffPercent <= 0.05) { // Within 5%
        confidence += 0.2
        reasons.push('Amount closely matches')
      } else if (amountDiffPercent <= 0.15) { // Within 15%
        confidence += 0.1
        reasons.push('Amount reasonably matches')
      }

      // Check item matches
      for (const invoiceItem of invoiceItems) {
        const orderItem = order.items.find(item => 
          item.item_name.toLowerCase().includes(invoiceItem.item_description.toLowerCase().split(' ')[0])
        )
        
        if (orderItem) {
          matchedItems++
          quantityVariance += Math.abs(invoiceItem.quantity - orderItem.quantity_ordered)
        }
      }

      // Item matching score
      const itemMatchPercent = matchedItems / Math.max(order.items.length, invoiceItems.length)
      confidence += itemMatchPercent * 0.2

      if (matchedItems > 0) {
        reasons.push(`${matchedItems}/${order.items.length} items matched`)
      }

      // Only include matches with reasonable confidence
      if (confidence >= 0.3) {
        matches.push({
          purchase_order_id: order.id,
          purchase_order: order,
          confidence,
          match_reasons: reasons,
          quantity_variance: quantityVariance,
          amount_variance: amountVariance,
          matched_items: matchedItems,
          total_items: order.items.length
        })
      }
    }

    // Sort by confidence
    const sortedMatches = matches.sort((a, b) => b.confidence - a.confidence)

    console.log(`✅ Found ${sortedMatches.length} order matches`)
    
    return sortedMatches

  } catch (error: any) {
    console.error('Order matching error:', error)
    return []
  }
}

/**
 * Test the matching engine
 */
export async function testMatchingEngine(): Promise<boolean> {
  try {
    const sampleInvoiceItem: InvoiceItem = {
      id: 'test-1',
      item_description: 'Coffee Beans - Dark Roast',
      quantity: 5,
      unit_price: 12.99,
      package_size: '12x',
      unit_type: 'bag'
    }

    const sampleInventoryItems: InventoryItem[] = [
      {
        id: 'inv-1',
        item_name: 'Dark Roast Coffee Beans',
        current_stock: 50,
        unit_cost: 12.50,
        unit_type: 'bag'
      },
      {
        id: 'inv-2',
        item_name: 'Light Roast Coffee',
        current_stock: 30,
        unit_cost: 11.99,
        unit_type: 'bag'
      }
    ]

    const matches = await findItemMatches(sampleInvoiceItem, sampleInventoryItems)
    
    console.log('Matching engine test results:', matches)
    
    return matches.length > 0 && matches[0].confidence > 0.5

  } catch (error) {
    console.error('Matching engine test failed:', error)
    return false
  }
}
