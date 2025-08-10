import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/middleware'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const dateFilter = searchParams.get('dateFilter')

    const supabase = await createClient()

    // Build query with supplier information
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers!purchase_orders_supplier_id_fkey (
          name
        ),
        purchase_order_items!purchase_order_items_purchase_order_id_fkey (
          *,
          inventory_items!purchase_order_items_inventory_item_id_fkey (
            item_name
          )
        )
      `)

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter by date
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (dateFilter) {
        case 'this_week':
          startDate = new Date(now.setDate(now.getDate() - 7))
          query = query.gte('order_date', startDate.toISOString())
          break
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          query = query.gte('order_date', startDate.toISOString())
          break
        case 'overdue':
          query = query
            .lt('expected_delivery_date', new Date().toISOString())
            .not('status', 'in', '("received", "cancelled")')
          break
      }
    }

    // Fetch purchase orders
    const { data: orders, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Database error fetching purchase orders:', error)
      return NextResponse.json(
        { error: 'Failed to fetch purchase orders', details: error.message },
        { status: 500 }
      )
    }

    // Transform data to match expected format
    const transformedOrders = orders?.map(order => ({
      ...order,
      supplier_name: order.suppliers?.name || 'Unknown Supplier',
      items: order.purchase_order_items?.map((item: any) => ({
        ...item,
        inventory_item_name: item.inventory_items?.item_name || 'Unknown Item'
      })) || []
    })) || []

    return NextResponse.json({
      success: true,
      orders: transformedOrders,
      total: transformedOrders.length,
      message: 'Purchase orders fetched successfully'
    })

  } catch (error) {
    console.error('Failed to fetch purchase orders:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch purchase orders', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const body = await request.json()
    const { 
      supplier_id,
      order_number,
      expected_delivery_date,
      notes,
      items
    } = body

    if (!supplier_id?.trim()) {
      return NextResponse.json(
        { error: 'Supplier is required' },
        { status: 400 }
      )
    }

    if (!order_number?.trim()) {
      return NextResponse.json(
        { error: 'Order number is required' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      )
    }

    // Validate items
    for (const item of items) {
      if (!item.inventory_item_id || !item.quantity_ordered || item.quantity_ordered <= 0) {
        return NextResponse.json(
          { error: 'All items must have valid inventory item and quantity' },
          { status: 400 }
        )
      }
    }

    console.log('Creating new purchase order:', order_number)

    const supabase = await createClient()

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.quantity_ordered * item.unit_cost)
    }, 0)

    // Start transaction by creating the purchase order
    const { data: newOrder, error: orderError } = await supabase
      .from('purchase_orders')
      .insert({
        supplier_id,
        order_number: order_number.trim(),
        status: 'draft',
        order_date: new Date().toISOString(),
        expected_delivery_date: expected_delivery_date || null,
        total_amount: totalAmount,
        notes: notes?.trim() || null
      })
      .select()
      .single()

    if (orderError) {
      console.error('Database error creating purchase order:', orderError)
      return NextResponse.json(
        { error: 'Failed to create purchase order', details: orderError.message },
        { status: 500 }
      )
    }

    // Insert purchase order items
    const orderItems = items.map((item: any) => ({
      purchase_order_id: newOrder.id,
      inventory_item_id: item.inventory_item_id,
      quantity_ordered: item.quantity_ordered,
      quantity_received: 0,
      unit_cost: item.unit_cost,
      total_cost: item.quantity_ordered * item.unit_cost
    }))

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(orderItems)

    if (itemsError) {
      // Rollback by deleting the order
      await supabase.from('purchase_orders').delete().eq('id', newOrder.id)
      console.error('Database error creating purchase order items:', itemsError)
      return NextResponse.json(
        { error: 'Failed to create purchase order items', details: itemsError.message },
        { status: 500 }
      )
    }

    console.log('✅ Successfully created purchase order:', newOrder.id)

    return NextResponse.json({
      success: true,
      order: newOrder,
      message: 'Purchase order created successfully'
    })

  } catch (error) {
    console.error('Failed to create purchase order:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create purchase order', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}