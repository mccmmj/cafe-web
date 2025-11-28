import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/middleware'
import type { AdminAuthSuccess } from '@/lib/admin/middleware'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { canonicalStatus, insertStatusHistory } from './status-utils'

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
          name,
          contact_person,
          email,
          phone
        ),
        purchase_order_items!purchase_order_items_purchase_order_id_fkey (
          *,
          inventory_items!purchase_order_items_inventory_item_id_fkey (
            item_name,
            unit_type,
            pack_size
          )
        ),
        purchase_order_status_history!purchase_order_status_history_purchase_order_id_fkey (
          previous_status,
          new_status,
          changed_by,
          changed_at,
          note
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

    const sentByIds = Array.from(
      new Set(
        (orders || [])
          .map((order: any) => order.sent_by)
          .filter((value: any): value is string => Boolean(value))
      )
    )

    let sentByProfiles: Record<string, { full_name?: string | null; email?: string | null }> = {}
    if (sentByIds.length > 0) {
      const serviceSupabase = createServiceClient()
      const { data: profiles } = await serviceSupabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', sentByIds)

      sentByProfiles = (profiles || []).reduce((acc: Record<string, any>, profile: any) => {
        acc[profile.id] = {
          full_name: profile.full_name,
          email: profile.email
        }
        return acc
      }, {})
    }

    // Transform data to match expected format
    const transformedOrders = orders?.map(order => {
      const history = (order.purchase_order_status_history || [])
        .map((entry: any) => ({
          previous_status: entry.previous_status,
          new_status: entry.new_status,
          changed_by: entry.changed_by,
          changed_at: entry.changed_at,
          note: entry.note
        }))
        .sort((a: any, b: any) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())

      return {
        ...order,
        supplier_name: order.suppliers?.name || 'Unknown Supplier',
        supplier_contact: order.suppliers?.contact_person,
        supplier_email: order.suppliers?.email,
        supplier_phone: order.suppliers?.phone,
        items: order.purchase_order_items?.map((item: any) => ({
          ...item,
          inventory_item_name: item.inventory_items?.item_name || 'Unknown Item',
          unit_type: item.inventory_items?.unit_type || item.unit_type || 'each',
          pack_size: item.inventory_items?.pack_size || item.pack_size || null
        })) || [],
        status_history: history,
        sent_by_profile: order.sent_by ? sentByProfiles[order.sent_by] || null : null
      }
    }) || []

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
    const admin = authResult as AdminAuthSuccess

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

      if (item.ordered_pack_qty !== undefined && item.ordered_pack_qty !== null) {
        const packQty = Number(item.ordered_pack_qty)
        if (!Number.isFinite(packQty) || packQty <= 0) {
          return NextResponse.json(
            { error: 'ordered_pack_qty must be positive when provided' },
            { status: 400 }
          )
        }
      }
    }

    console.log('Creating new purchase order:', order_number)

    const supabase = await createClient()

    // Fetch pack sizes from inventory for missing values
    const inventoryIds = Array.from(new Set(items.map((item: any) => item.inventory_item_id).filter(Boolean)))
    const inventoryPackMap: Record<string, number> = {}
    if (inventoryIds.length > 0) {
      const { data: invRows } = await supabase
        .from('inventory_items')
        .select('id, pack_size')
        .in('id', inventoryIds)
      ;(invRows || []).forEach((row: any) => {
        inventoryPackMap[row.id] = Number(row.pack_size) || 1
      })
    }

    // Normalize items to unit quantities
    const normalizedItems = items.map((item: any) => {
      const packSize = item.pack_size ?? inventoryPackMap[item.inventory_item_id] ?? 1
      const sourceQty = Number(item.quantity_ordered) || 0
      const derivedOrderUnit = item.order_unit || (packSize > 1 ? 'pack' : 'each')
      const packCount = derivedOrderUnit === 'pack'
        ? (item.ordered_pack_qty ?? sourceQty)
        : null
      const quantityOrdered =
        derivedOrderUnit === 'pack'
          ? (packCount || 0) * packSize
          : sourceQty
      const lineTotal = quantityOrdered * (item.unit_cost || 0)
      return {
        ...item,
        order_unit: derivedOrderUnit,
        pack_size: packSize,
        ordered_pack_qty: derivedOrderUnit === 'pack' ? packCount : null,
        quantity_ordered: quantityOrdered,
        total_cost: lineTotal
      }
    })

    // Calculate total amount using unit quantities
    const totalAmount = normalizedItems.reduce((sum: number, item: any) => sum + (item.total_cost || 0), 0)

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
    const orderItems = normalizedItems.map((item: any) => ({
      purchase_order_id: newOrder.id,
      inventory_item_id: item.inventory_item_id,
      quantity_ordered: item.quantity_ordered,
      quantity_received: 0,
      unit_cost: item.unit_cost,
      ordered_pack_qty: item.ordered_pack_qty || null,
      pack_size: item.pack_size ?? 1
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

    await insertStatusHistory(
      supabase,
      newOrder.id,
      null,
      canonicalStatus(newOrder.status || 'draft') || 'draft',
      admin.userId
    )

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
