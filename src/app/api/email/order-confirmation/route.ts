import { NextRequest, NextResponse } from 'next/server'
import { EmailService, OrderEmailData } from '@/lib/email/service'

export async function POST(request: NextRequest) {
  try {
    const orderData: OrderEmailData = await request.json()

    // Validate required fields
    if (!orderData.orderId || !orderData.customerEmail || !orderData.items || !orderData.total) {
      return NextResponse.json(
        { error: 'Missing required order data for email' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(orderData.customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    console.log('Sending order confirmation email to:', orderData.customerEmail)
    
    const result = await EmailService.sendOrderConfirmation(orderData)

    return NextResponse.json({
      success: true,
      emailId: result?.id,
      message: 'Order confirmation email sent successfully'
    })

  } catch (error) {
    console.error('Failed to send order confirmation email:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to send order confirmation email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}