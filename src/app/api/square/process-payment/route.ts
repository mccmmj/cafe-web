import { NextRequest, NextResponse } from 'next/server'
import { createSquareOrder, processPayment } from '@/lib/square/orders'
import { TaxConfigurationError } from '@/lib/square/tax-validation'
import { getOrder } from '@/lib/square/fetch-client'
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
  verifiedBuyer?: unknown
  useSavedCard?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json()
    const { paymentToken, customerInfo, cartItems, useSavedCard } = body
    
    // Fix floating point precision issues by rounding to 2 decimal places
    const amount = Math.round(body.amount * 100) / 100

    // Validate required fields
    if (!paymentToken || !amount || !customerInfo.email || !cartItems.length) {
      return NextResponse.json(
        { error: 'Missing required payment information' },
        { status: 400 }
      )
    }

    // Create Square order with catalog items
    console.log('Creating Square order...')
    console.log('Cart items:', JSON.stringify(cartItems, null, 2))
    let orderId
    let squareOrderTotal = amount // Default to our calculated amount
    let squareOrderTax = 0 // Default to 0, will be updated with Square's calculation
    
    try {
      orderId = await createSquareOrder(cartItems, customerInfo.email)
      console.log('Square order created:', orderId)
      
      // Get the actual order total and tax from Square
      const orderDetails = await getOrder(orderId)
      const actualOrderTotal = orderDetails.order?.total_money?.amount || 0
      const actualTaxAmount = orderDetails.order?.total_tax_money?.amount || 0
      console.log('Order total extraction:', {
        totalMoney: orderDetails.order?.totalMoney,
        total_money: orderDetails.order?.total_money,
        total_tax_money: orderDetails.order?.total_tax_money,
        actualOrderTotal,
        actualTaxAmount
      })
      
      if (actualOrderTotal > 0) {
        squareOrderTotal = actualOrderTotal / 100 // Convert from cents to dollars
        squareOrderTax = actualTaxAmount / 100 // Convert from cents to dollars
        console.log('Using Square calculated amounts:', {
          total: squareOrderTotal, 
          tax: squareOrderTax,
          ourCalculated: amount
        })
      } else {
        console.log('Square order total is 0, using our calculated amount:', amount)
      }
      
    } catch (orderError) {
      console.error('Square order creation failed:', orderError)
      
      // Handle tax configuration errors specifically
      if (orderError instanceof TaxConfigurationError) {
        return NextResponse.json(
          { 
            error: 'Tax configuration required',
            details: orderError.message,
            taxConfigurationRequired: true
          },
          { status: 422 } // Unprocessable Entity - configuration issue
        )
      }
      
      console.error('Order error details:', JSON.stringify(orderError, null, 2))
      throw orderError
    }

    // Process payment with the order
    console.log('Processing payment with order...')
    console.log('Using saved card:', useSavedCard)
    
    const paymentResult = await processPayment(
      paymentToken, // For saved cards this is the card ID, for new cards it's the payment token
      orderId, // Include the order ID
      squareOrderTotal, // Use Square's calculated total if available
      customerInfo.email
    )
    console.log('Payment processed:', paymentResult)

    // Save order to database
    console.log('Saving order to database...')
    const supabase = await createClient()
    
    // Get authenticated user if available
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('User auth status:', { userId: user?.id, email: user?.email, authError })
    
    // Create order record (match actual database schema)
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          user_id: user?.id || null, // Set user_id if authenticated, null for anonymous
          square_order_id: orderId, // Include the Square order ID
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone || null,
          total_amount: Math.round(squareOrderTotal * 100), // Use Square's total, convert to cents
          tax_amount: Math.round(squareOrderTax * 100), // Use Square's calculated tax, convert to cents
          status: 'pending', // Order status - starts as pending for admin workflow
          payment_status: paymentResult.status.toLowerCase() // Convert COMPLETED to completed
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
          paymentId: paymentResult.paymentId
        },
        { status: 500 }
      )
    }

    // Create order items (match actual database schema)
    const orderItems = cartItems.map(item => ({
      order_id: orderData.id,
      square_item_id: item.id,
      item_name: item.name,
      quantity: item.quantity,
      unit_price: Math.round(item.price * 100), // Convert to cents
      total_price: Math.round(item.price * item.quantity * 100), // Convert to cents
      variations: item.variationId ? { variationId: item.variationId, variationName: item.variationName } : {},
      modifiers: {} // No modifiers for now
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Database order items creation error:', itemsError)
      // Order exists but items failed - this is concerning but not critical
    }

    console.log('Order saved to database successfully')

    // Send order confirmation email
    try {
      console.log('Sending order confirmation email...')
      
      const emailData = {
        orderId: orderData.id,
        customerEmail: customerInfo.email,
        customerName: customerInfo.name || 'Customer',
        items: cartItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal: squareOrderTotal - squareOrderTax,
        tax: squareOrderTax,
        total: squareOrderTotal
      }

      const emailResponse = await fetch(`${request.url.split('/api')[0]}/api/email/order-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      })

      if (emailResponse.ok) {
        console.log('Order confirmation email sent successfully')
      } else {
        console.error('Failed to send order confirmation email:', await emailResponse.text())
      }
      
    } catch (emailError) {
      console.error('Email sending error (non-fatal):', emailError)
      // Don't fail the payment if email fails
    }

    return NextResponse.json({
      success: true,
      paymentId: paymentResult.paymentId,
      status: paymentResult.status,
      databaseOrderId: orderData.id
    })

  } catch (error) {
    console.error('Payment processing error:', error)
    
    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    // Return detailed error information for debugging (should be removed in production)
    return NextResponse.json(
      { 
        error: 'Payment processing failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        debug: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 400 }
    )
  }
}