import { createOrder, createPayment } from './fetch-client'

interface SimpleCartItem {
  id: string
  name: string
  quantity: number
  price: number
  variationId?: string
  variationName?: string
}

export async function createSquareOrder(items: SimpleCartItem[], customerEmail?: string): Promise<string> {
  try {
    console.log('Creating Square order with items:', items)
    
    const lineItems = items.map(item => ({
      quantity: item.quantity.toString(),
      catalogObjectId: item.id, // Now correctly receives variation ID or item ID from frontend
      // Remove modifiers for now until we implement proper modifier support
      // modifiers: item.selectedModifiers ? 
      //   Object.entries(item.selectedModifiers).map(([modifierId, quantity]) => ({
      //     catalogObjectId: modifierId,
      //     quantity: quantity.toString()
      //   })) : undefined
    }))
    
    console.log('Square lineItems:', JSON.stringify(lineItems, null, 2))

    const orderData = {
      order: {
        lineItems,
        source: {
          name: 'Little Cafe Website'
        },
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

    const result = await createOrder(orderData)
    
    if (!result.order?.id) {
      throw new Error('Failed to create order: No order ID returned')
    }

    return result.order.id
  } catch (error) {
    console.error('Error creating Square order:', error)
    console.error('Full error details:', JSON.stringify(error, null, 2))
    
    // Log more details about the error if it's a Square API error
    if (error && typeof error === 'object') {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      if (error.body) {
        console.error('Square API error body:', error.body)
      }
      if (error.errors) {
        console.error('Square API errors:', error.errors)
      }
    }
    
    throw new Error('Failed to create order')
  }
}

export async function processPayment(
  paymentToken: string, 
  orderId: string, 
  amount: number,
  customerEmail?: string
): Promise<{ paymentId: string; status: string }> {
  try {
    const paymentData = {
      sourceId: paymentToken,
      amountMoney: {
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'USD'
      },
      orderId,
      autocomplete: true,
      ...(customerEmail && {
        buyerEmailAddress: customerEmail
      })
    }

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

export async function getOrderStatus(orderId: string): Promise<string> {
  try {
    const { result } = await ordersApi.retrieveOrder(orderId)
    return result.order?.state || 'UNKNOWN'
  } catch (error) {
    console.error('Error retrieving order status:', error)
    throw new Error('Failed to retrieve order status')
  }
}