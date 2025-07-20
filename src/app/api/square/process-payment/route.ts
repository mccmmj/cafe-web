import { NextRequest, NextResponse } from 'next/server'
import { createSquareOrder, processPayment } from '@/lib/square/orders'
import { createClient } from '@/lib/supabase/server'

interface CartItem {
  id: string
  name: string
  quantity: number
  price: number
  variationId?: string
  variationName?: string
}

interface CustomerInfo {
  email: string
  name: string
  phone: string
}

interface PaymentRequest {
  paymentToken: string
  amount: number
  customerInfo: CustomerInfo
  cartItems: CartItem[]
  verifiedBuyer?: any
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json()
    const { paymentToken, amount, customerInfo, cartItems, verifiedBuyer } = body

    // Validate required fields
    if (!paymentToken || !amount || !customerInfo.email || !cartItems.length) {
      return NextResponse.json(
        { error: 'Missing required payment information' },
        { status: 400 }
      )
    }

    // Create Square order
    console.log('Creating Square order...')
    console.log('Cart items:', JSON.stringify(cartItems, null, 2))
    let orderId
    try {
      orderId = await createSquareOrder(cartItems, customerInfo.email)
      console.log('Square order created:', orderId)
    } catch (orderError) {
      console.error('Square order creation failed:', orderError)
      console.error('Order error details:', JSON.stringify(orderError, null, 2))
      throw orderError
    }

    // Process payment
    console.log('Processing payment...')
    const paymentResult = await processPayment(
      paymentToken,
      orderId,
      amount,
      customerInfo.email
    )
    console.log('Payment processed:', paymentResult)

    // Save order to database
    console.log('Saving order to database...')
    const supabase = createClient()
    
    // Create order record
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          square_order_id: orderId,
          square_payment_id: paymentResult.paymentId,
          customer_email: customerInfo.email,
          customer_name: customerInfo.name || null,
          customer_phone: customerInfo.phone || null,
          subtotal: amount - (amount * 0.08), // Remove tax to get subtotal
          tax_amount: amount * 0.08,
          total_amount: amount,
          payment_status: paymentResult.status,
          order_status: 'confirmed'
        }
      ])
      .select('id')
      .single()

    if (orderError) {
      console.error('Database order creation error:', orderError)
      // Payment succeeded but database failed - this is a critical error
      return NextResponse.json(
        { 
          error: 'Payment processed but order recording failed',
          paymentId: paymentResult.paymentId,
          orderId 
        },
        { status: 500 }
      )
    }

    // Create order items
    const orderItems = cartItems.map(item => ({
      order_id: orderData.id,
      square_catalog_item_id: item.id,
      item_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
      variation_id: item.variationId || null,
      variation_name: item.variationName || null
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Database order items creation error:', itemsError)
      // Order exists but items failed - this is concerning but not critical
    }

    console.log('Order saved to database successfully')

    return NextResponse.json({
      success: true,
      orderId,
      paymentId: paymentResult.paymentId,
      status: paymentResult.status,
      databaseOrderId: orderData.id
    })

  } catch (error) {
    console.error('Payment processing error:', error)
    
    // Determine error type and provide appropriate response
    if (error instanceof Error) {
      if (error.message.includes('Payment processing failed')) {
        return NextResponse.json(
          { error: 'Payment was declined. Please check your card information and try again.' },
          { status: 400 }
        )
      }
      if (error.message.includes('Failed to create order')) {
        return NextResponse.json(
          { error: 'Unable to create order. Please try again.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}