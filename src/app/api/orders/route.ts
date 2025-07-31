import { NextRequest, NextResponse } from 'next/server'
import { createOrder } from '@/lib/supabase/database'
import { createOrderSchema } from '@/lib/validations/order'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received order data:', JSON.stringify(body, null, 2))
    
    // Basic validation - ensure required fields are present
    if (!body.totalAmount || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      console.log('Validation failed:', { totalAmount: body.totalAmount, items: body.items })
      return NextResponse.json(
        { error: 'Invalid order data: totalAmount and items are required' },
        { status: 400 }
      )
    }
    
    // Validate each item has required fields
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i]
      if (!item.squareItemId || !item.itemName || !item.quantity || !item.unitPrice) {
        console.log(`Item validation failed at index ${i}:`, item)
        return NextResponse.json(
          { error: `Invalid item data at index ${i}: missing required fields` },
          { status: 400 }
        )
      }
    }
    
    // Create the order directly with database function
    console.log('Calling createOrder with data:', body)
    const order = await createOrder(body)
    
    return NextResponse.json(order)
  } catch (error) {
    console.error('Error creating order:', error)
    
    // Handle Supabase errors specifically
    if (error && typeof error === 'object' && 'message' in error) {
      return NextResponse.json(
        { 
          error: 'Failed to create order', 
          message: error.message,
          details: error 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create order', 
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for filtering/pagination
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    
    // This would typically fetch orders from database
    // For now, return an empty array as a placeholder
    return NextResponse.json({
      orders: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0
      }
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}