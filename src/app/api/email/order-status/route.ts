import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/email/service'

interface StatusUpdateRequest {
  customerEmail: string
  orderId: string
  status: string
  customerName?: string
}

export async function POST(request: NextRequest) {
  try {
    const data: StatusUpdateRequest = await request.json()

    // Validate required fields
    if (!data.orderId || !data.customerEmail || !data.status) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, customerEmail, status' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['confirmed', 'preparing', 'ready', 'completed', 'cancelled']
    if (!validStatuses.includes(data.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      )
    }

    console.log('Sending order status update email:', data.orderId, 'status:', data.status)
    
    const result = await EmailService.sendOrderStatusUpdate(
      data.customerEmail,
      data.orderId,
      data.status,
      data.customerName
    )

    return NextResponse.json({
      success: true,
      emailId: result?.id,
      message: 'Order status email sent successfully'
    })

  } catch (error) {
    console.error('Failed to send order status email:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to send order status email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}