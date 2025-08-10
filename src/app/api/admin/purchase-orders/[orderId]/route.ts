import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/middleware'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { orderId } = params
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch purchase order with details
    const { data: order, error } = await supabase
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
            unit_type
          )
        )
      `)
      .eq('id', orderId)
      .single()

    if (error) {
      console.error('Database error fetching purchase order:', error)
      return NextResponse.json(
        { error: 'Failed to fetch purchase order', details: error.message },
        { status: 500 }
      )
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    // Transform data
    const transformedOrder = {
      ...order,
      supplier_name: order.suppliers?.name || 'Unknown Supplier',
      supplier_contact: order.suppliers?.contact_person,
      supplier_email: order.suppliers?.email,
      supplier_phone: order.suppliers?.phone,
      items: order.purchase_order_items?.map((item: any) => ({
        ...item,
        inventory_item_name: item.inventory_items?.item_name || 'Unknown Item',
        unit_type: item.inventory_items?.unit_type || 'each'
      })) || []
    }

    return NextResponse.json({
      success: true,
      order: transformedOrder,
      message: 'Purchase order fetched successfully'
    })

  } catch (error) {
    console.error('Failed to fetch purchase order:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch purchase order', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { orderId } = params
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    console.log('Updating purchase order:', orderId, body)

    const supabase = await createClient()

    // Build update object with only provided fields
    const updateData: any = {}
    if (body.status !== undefined) updateData.status = body.status
    if (body.expected_delivery_date !== undefined) updateData.expected_delivery_date = body.expected_delivery_date
    if (body.actual_delivery_date !== undefined) updateData.actual_delivery_date = body.actual_delivery_date
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null

    // If marking as received, automatically update inventory levels
    if (body.status === 'received' && !body.actual_delivery_date) {
      updateData.actual_delivery_date = new Date().toISOString()
    }

    // Update purchase order
    const { data: updatedOrder, error } = await supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      console.error('Database error updating purchase order:', error)
      return NextResponse.json(
        { error: 'Failed to update purchase order', details: error.message },
        { status: 500 }
      )
    }

    if (!updatedOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    // If status changed to 'received', update inventory levels
    if (body.status === 'received') {
      console.log('Updating inventory levels for received order')

      // Get purchase order items
      const { data: orderItems, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select('inventory_item_id, quantity_ordered')
        .eq('purchase_order_id', orderId)

      if (itemsError) {
        console.error('Failed to fetch order items:', itemsError)
      } else if (orderItems && orderItems.length > 0) {
        // Update inventory levels for each item
        for (const item of orderItems) {
          const { error: updateError } = await supabase
            .rpc('increment_inventory_stock', {
              item_id: item.inventory_item_id,
              quantity: item.quantity_ordered
            })

          if (updateError) {
            console.error('Failed to update inventory for item:', item.inventory_item_id, updateError)
          }

          // Create stock movement record
          await supabase
            .from('stock_movements')
            .insert({
              inventory_item_id: item.inventory_item_id,
              movement_type: 'in',
              quantity: item.quantity_ordered,
              reference_type: 'purchase_order',
              reference_id: orderId,
              notes: `Received from purchase order #${updatedOrder.order_number}`
            })
        }
      }
    }

    console.log('✅ Successfully updated purchase order:', orderId)

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Purchase order updated successfully'
    })

  } catch (error) {
    console.error('Failed to update purchase order:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update purchase order', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { orderId } = params
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    console.log('Deleting purchase order:', orderId)

    const supabase = await createClient()

    // Check if order can be deleted (only draft orders)
    const { data: order, error: checkError } = await supabase
      .from('purchase_orders')
      .select('status')
      .eq('id', orderId)
      .single()

    if (checkError) {
      console.error('Error checking order status:', checkError)
      return NextResponse.json(
        { error: 'Failed to verify order status', details: checkError.message },
        { status: 500 }
      )
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    if (order.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only delete draft purchase orders' },
        { status: 400 }
      )
    }

    // Delete purchase order items first (due to foreign key constraint)
    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .delete()
      .eq('purchase_order_id', orderId)

    if (itemsError) {
      console.error('Database error deleting purchase order items:', itemsError)
      return NextResponse.json(
        { error: 'Failed to delete purchase order items', details: itemsError.message },
        { status: 500 }
      )
    }

    // Delete purchase order
    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', orderId)

    if (error) {
      console.error('Database error deleting purchase order:', error)
      return NextResponse.json(
        { error: 'Failed to delete purchase order', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Successfully deleted purchase order:', orderId)

    return NextResponse.json({
      success: true,
      message: 'Purchase order deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete purchase order:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete purchase order', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}