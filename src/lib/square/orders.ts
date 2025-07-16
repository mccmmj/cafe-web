import { ordersApi, paymentsApi, config } from './client'
import type { CartItem, Order } from '@/types/menu'

export async function createSquareOrder(items: CartItem[], customerEmail?: string): Promise<string> {
  try {
    const lineItems = items.map(item => ({
      quantity: item.quantity.toString(),
      catalogObjectId: item.id,
      modifiers: item.selectedModifiers ? 
        Object.entries(item.selectedModifiers).map(([modifierId, quantity]) => ({
          catalogObjectId: modifierId,
          quantity: quantity.toString()
        })) : undefined
    }))

    const orderRequest = {
      order: {
        locationId: config.locationId!,
        lineItems,
        source: {
          name: 'Little Cafe Website'
        },
        ...(customerEmail && {
          fulfillments: [{
            type: 'PICKUP' as const,
            state: 'PROPOSED' as const,
            pickupDetails: {
              recipient: {
                emailAddress: customerEmail
              }
            }
          }]
        })
      }
    }

    const { result } = await ordersApi.createOrder(orderRequest)
    
    if (!result.order?.id) {
      throw new Error('Failed to create order: No order ID returned')
    }

    return result.order.id
  } catch (error) {
    console.error('Error creating Square order:', error)
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
    const paymentRequest = {
      sourceId: paymentToken,
      amountMoney: {
        amount: BigInt(Math.round(amount * 100)), // Convert to cents
        currency: 'USD'
      },
      orderId,
      autocomplete: true,
      locationId: config.locationId!,
      ...(customerEmail && {
        buyerEmailAddress: customerEmail
      })
    }

    const { result } = await paymentsApi.createPayment(paymentRequest)
    
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