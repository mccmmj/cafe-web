import { createOrder, createPayment, getOrder, searchAllCatalogItems } from './fetch-client'
import { validateTaxConfiguration } from './tax-validation'

interface SimpleCartItem {
  id: string
  name: string
  quantity: number
  price: number
  variationId?: string
  variationName?: string
}

// Cache for catalog items to avoid repeated API calls
let catalogItemsCache: any[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function getCatalogItems() {
  const now = Date.now()
  
  // Return cached items if cache is fresh
  if (catalogItemsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return catalogItemsCache
  }
  
  try {
    const result = await searchAllCatalogItems()
    const items = result.objects?.filter((obj: any) => obj.type === 'ITEM') || []
    
    catalogItemsCache = items
    cacheTimestamp = now
    return items
  } catch (error) {
    console.error('Error fetching catalog items:', error)
    return catalogItemsCache || [] // Return cached items or empty array on error
  }
}

async function getVariationIdForItem(itemId: string): Promise<string> {
  try {
    const catalogItems = await getCatalogItems()
    const item = catalogItems.find((obj: any) => obj.id === itemId)
    
    if (item && item.item_data?.variations && item.item_data.variations.length > 0) {
      const firstVariationId = item.item_data.variations[0].id
      console.log(`Using first variation for item ${itemId}: ${firstVariationId}`)
      return firstVariationId
    } else {
      console.warn(`No variations found for item ${itemId}, using item ID as fallback`)
      return itemId // Fallback to item ID
    }
  } catch (error) {
    console.error(`Error getting variation for item ${itemId}:`, error)
    return itemId // Fallback to item ID
  }
}

export async function previewSquareOrder(items: SimpleCartItem[]): Promise<{
  subtotal: number
  tax: number
  total: number
}> {
  try {
    console.log('Creating Square order preview for tax calculation:', items)
    
    // Validate tax configuration - REQUIRED for order creation
    const taxConfig = await validateTaxConfiguration()
    
    // For order creation, we need to use variation IDs, not item IDs
    const lineItems = await Promise.all(items.map(async (item) => {
      const catalogObjectId = item.variationId || await getVariationIdForItem(item.id)
      
      return {
        quantity: item.quantity.toString(),
        catalog_object_id: catalogObjectId
      }
    }))

    const orderData = {
      order: {
        line_items: lineItems,
        source: { name: 'Little Cafe Website' },
        taxes: [{
          catalog_object_id: taxConfig.taxId,
          scope: 'ORDER' as const
        }]
      }
    }
    
    console.log('Creating preview order with tax configuration:', orderData)
    
    // Create the order
    const result = await createOrder(orderData)
    const orderId = result.order?.id
    
    if (!orderId) {
      throw new Error('Failed to create preview order - no order ID returned')
    }
    
    // Get the order details to extract calculated totals
    const orderDetails = await getOrder(orderId)
    const order = orderDetails.order
    
    if (!order) {
      throw new Error('Failed to get preview order details')
    }
    
    // Debug: Log the full order structure to understand available fields
    console.log('Full Square order response:', JSON.stringify(order, null, 2))
    
    const subtotalAmount = order.subtotal_money?.amount || 0
    const taxAmount = order.total_tax_money?.amount || 0
    const totalAmount = order.total_money?.amount || 0
    
    // Calculate subtotal as total minus tax if subtotal_money is not available
    const calculatedSubtotal = subtotalAmount === 0 && totalAmount > 0 && taxAmount > 0
      ? totalAmount - taxAmount
      : subtotalAmount
    
    console.log('Square preview order totals:', {
      subtotal: subtotalAmount / 100,
      calculatedSubtotal: calculatedSubtotal / 100,
      tax: taxAmount / 100, 
      total: totalAmount / 100,
      availableFields: Object.keys(order)
    })
    
    return {
      subtotal: calculatedSubtotal / 100, // Use calculated subtotal if needed
      tax: taxAmount / 100,
      total: totalAmount / 100
    }
    
  } catch (error) {
    console.error('Square order preview failed:', error)
    
    // Return fallback calculations using tax service
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    try {
      const taxConfig = await validateTaxConfiguration()
      const tax = subtotal * ((taxConfig.percentage as unknown as number) / 100)
      return {
        subtotal,
        tax,
        total: subtotal + tax
      }
    } catch {
      // No tax configuration - return zero tax
      return {
        subtotal,
        tax: 0,
        total: subtotal
      }
    }
  }
}

export async function createSquareOrder(items: SimpleCartItem[], customerEmail?: string): Promise<string> {
  try {
    console.log('Creating Square order with items:', items)
    
    // Validate tax configuration - REQUIRED for order creation
    console.log('Validating tax configuration (required)...')
    const taxConfig = await validateTaxConfiguration()
    console.log('Tax configuration validated:', taxConfig)
    
    const lineItems = await Promise.all(items.map(async (item) => {
      const catalogObjectId = item.variationId || await getVariationIdForItem(item.id)
      
      return {
        quantity: item.quantity.toString(),
        catalog_object_id: catalogObjectId
        // Don't include base_price_money - let Square use the catalog price automatically
        // Remove modifiers for now until we implement proper modifier support
      }
    }))
    
    console.log('Square lineItems:', JSON.stringify(lineItems, null, 2))

    const orderData = {
      order: {
        line_items: lineItems, // Use snake_case for Square API
        source: {
          name: 'Little Cafe Website'
        },
        // Include required tax configuration
        taxes: [{
          catalog_object_id: taxConfig.taxId,
          scope: 'ORDER' as const
        }]
        // Simplified: remove fulfillments for now to get basic order creation working
        // ...(customerEmail && {
        //   fulfillments: [{
        //     type: 'PICKUP' as const,
        //     state: 'PROPOSED' as const,
        //     pickup_details: {
        //       recipient: {
        //         email_address: customerEmail,
        //         display_name: 'Customer'
        //       }
        //     }
        //   }]
        // })
      }
    }

    console.log('Creating order with data:', JSON.stringify(orderData, null, 2))
    console.log('Tax configuration included:', taxConfig.taxId)

    const result = await createOrder(orderData)
    
    if (!result.order?.id) {
      throw new Error('Failed to create order: No order ID returned')
    }

    // Get the order back to see what Square calculated as the total
    const orderDetails = await getOrder(result.order.id)
    console.log('Created order details:', JSON.stringify(orderDetails, null, 2))

    return result.order.id
  } catch (error) {
    console.error('Error creating Square order:', error)
    
    console.error('Full error details:', JSON.stringify(error, null, 2))
    
    // Log more details about the error if it's a Square API error
    if (error && typeof error === 'object') {
      console.error('Error message:', (error as any).message)
      console.error('Error stack:', (error as any).stack)
      if ((error as any).body) {
        console.error('Square API error body:', (error as any).body)
      }
      if ((error as any).errors) {
        console.error('Square API errors:', (error as any).errors)
      }
    }
    
    throw new Error('Failed to create order')
  }
}

export async function processPayment(
  paymentToken: string, 
  orderId: string | null, 
  amount: number,
  customerEmail?: string
): Promise<{ paymentId: string; status: string }> {
  try {
    const amountInCents = Math.round(amount * 100)
    console.log('Processing payment:', {
      amount,
      amountInCents,
      paymentToken: paymentToken.substring(0, 20) + '...',
      orderId,
      customerEmail
    })
    
    const paymentData = {
      source_id: paymentToken,
      amount_money: {
        amount: amountInCents,
        currency: 'USD'
      },
      autocomplete: true,
      idempotency_key: `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...(orderId && { order_id: orderId }),
      ...(customerEmail && {
        buyer_email_address: customerEmail
      })
    }

    console.log('Payment data being sent to Square:', JSON.stringify(paymentData, null, 2))
    const result = await createPayment(paymentData)
    
    if (!result.payment?.id) {
      throw new Error('Failed to process payment: No payment ID returned')
    }

    return {
      paymentId: result.payment.id,
      status: result.payment.status || 'UNKNOWN'
    }
  } catch (error) {
    console.error('Error processing payment:', error)
    throw new Error('Payment processing failed')
  }
}

// export async function getOrderStatus(orderId: string): Promise<string> {
//   try {
//     const { result } = await ordersApi.getOrder(orderId)
//     return result.order?.state || 'UNKNOWN'
//   } catch (error) {
//     console.error('Error retrieving order status:', error)
//     throw new Error('Failed to retrieve order status')
//   }
// }