import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/middleware'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const body = await request.json()
    const { 
      inventory_item_id, 
      quantity, 
      unit_cost, 
      notes, 
      reference_id 
    } = body

    if (!inventory_item_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Missing required fields: inventory_item_id and quantity (must be > 0)' },
        { status: 400 }
      )
    }

    console.log('Restocking inventory item:', inventory_item_id, 'quantity:', quantity)

    const supabase = await createClient()

    // Get current inventory item
    const { data: currentItem, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id, item_name, current_stock, unit_cost')
      .eq('id', inventory_item_id)
      .single()

    if (fetchError || !currentItem) {
      console.error('Error fetching inventory item:', fetchError)
      return NextResponse.json(
        { error: 'Inventory item not found', details: fetchError?.message },
        { status: 404 }
      )
    }

    const previousStock = currentItem.current_stock
    const newStock = previousStock + quantity
    const restockUnitCost = unit_cost || currentItem.unit_cost

    // Update inventory item stock and cost
    const { data: updatedItem, error: updateError } = await supabase
      .from('inventory_items')
      .update({
        current_stock: newStock,
        unit_cost: restockUnitCost,
        last_restocked_at: new Date().toISOString()
      })
      .eq('id', inventory_item_id)
      .select()
      .single()

    if (updateError) {
      console.error('Database error updating inventory:', updateError)
      return NextResponse.json(
        { error: 'Failed to update inventory', details: updateError.message },
        { status: 500 }
      )
    }

    // Create stock movement record
    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        inventory_item_id,
        movement_type: 'purchase',
        quantity_change: quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        unit_cost: restockUnitCost,
        reference_id: reference_id || null,
        notes: notes || 'Stock restock via admin interface',
        created_by: (authResult as any).userId
      })

    if (movementError) {
      console.error('Warning: Could not create stock movement record:', movementError)
      // Don't fail the request, just log the warning
    }

    // Check if this restock resolves any low stock alerts
    const { error: alertError } = await supabase
      .from('low_stock_alerts')
      .update({ 
        is_acknowledged: true,
        acknowledged_by: (authResult as any).userId,
        acknowledged_at: new Date().toISOString()
      })
      .eq('inventory_item_id', inventory_item_id)
      .eq('is_acknowledged', false)

    if (alertError) {
      console.log('Warning: Could not update stock alerts:', alertError)
    }

    console.log('✅ Successfully restocked item:', currentItem.item_name, 'new stock:', newStock)

    return NextResponse.json({
      success: true,
      item: updatedItem,
      previousStock,
      quantityAdded: quantity,
      newStock,
      totalCost: quantity * restockUnitCost,
      message: `Successfully restocked ${currentItem.item_name}. Added ${quantity} units.`
    })

  } catch (error) {
    console.error('Failed to restock inventory:', error)
    return NextResponse.json(
      { 
        error: 'Failed to restock inventory', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}