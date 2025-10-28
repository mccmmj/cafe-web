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
    console.log('Admin fetching inventory items...')

    const supabase = await createClient()

    // Fetch inventory items with supplier information
    const { data: inventoryItems, error } = await supabase
      .from('inventory_items')
      .select(`
        *,
        suppliers (
          id,
          name
        )
      `)
      .order('item_name')

    if (error) {
      console.error('Database error fetching inventory:', error)
      return NextResponse.json(
        { error: 'Failed to fetch inventory items', details: error.message },
        { status: 500 }
      )
    }

    // Process the data to include supplier name
    const processedItems = inventoryItems?.map(item => ({
      ...item,
      supplier_name: item.suppliers?.name || null
    })) || []

    return NextResponse.json({
      success: true,
      items: processedItems,
      total: processedItems.length,
      message: 'Inventory items fetched successfully'
    })

  } catch (error) {
    console.error('Failed to fetch inventory:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch inventory', 
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
      square_item_id, 
      item_name, 
      current_stock, 
      minimum_threshold, 
      reorder_point, 
      unit_cost, 
      unit_type, 
      is_ingredient, 
      supplier_id, 
      location, 
      notes 
    } = body

    if (!square_item_id || !item_name || current_stock === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: square_item_id, item_name, current_stock' },
        { status: 400 }
      )
    }

    console.log('Creating new inventory item:', { square_item_id, item_name, current_stock })

    const supabase = await createClient()

    // Insert new inventory item
    const { data: newItem, error } = await supabase
      .from('inventory_items')
      .insert({
        square_item_id,
        item_name,
        current_stock,
        minimum_threshold: minimum_threshold || 5,
        reorder_point: reorder_point || 10,
        unit_cost: unit_cost || 0,
        unit_type: unit_type || 'each',
        is_ingredient: is_ingredient || false,
        supplier_id: supplier_id || null,
        location: location || 'main',
        notes: notes || null,
        last_restocked_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Database error creating inventory item:', error)
      return NextResponse.json(
        { error: 'Failed to create inventory item', details: error.message },
        { status: 500 }
      )
    }

    // Create initial stock movement record
    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        inventory_item_id: newItem.id,
        movement_type: 'adjustment',
        quantity_change: current_stock,
        previous_stock: 0,
        new_stock: current_stock,
        unit_cost: unit_cost || 0,
        notes: 'Initial stock entry',
        created_by: userId
      })

    if (movementError) {
      console.log('Warning: Could not create stock movement record:', movementError)
    }

    console.log('✅ Successfully created inventory item:', newItem.id)

    return NextResponse.json({
      success: true,
      item: newItem,
      message: 'Inventory item created successfully'
    })

  } catch (error) {
    console.error('Failed to create inventory item:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create inventory item', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const body = await request.json()
    const { 
      id,
      item_name, 
      minimum_threshold, 
      reorder_point, 
      unit_cost, 
      unit_type, 
      is_ingredient, 
      supplier_id, 
      location, 
      notes 
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    console.log('Updating inventory item:', id)

    const supabase = await createClient()

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}
    if (item_name !== undefined) updateData.item_name = item_name
    if (minimum_threshold !== undefined) updateData.minimum_threshold = minimum_threshold
    if (reorder_point !== undefined) updateData.reorder_point = reorder_point
    if (unit_cost !== undefined) updateData.unit_cost = unit_cost
    if (unit_type !== undefined) updateData.unit_type = unit_type
    if (is_ingredient !== undefined) updateData.is_ingredient = is_ingredient
    if (supplier_id !== undefined) updateData.supplier_id = supplier_id || null
    if (location !== undefined) updateData.location = location
    if (notes !== undefined) updateData.notes = notes || null

    // Update inventory item
    const { data: updatedItem, error } = await supabase
      .from('inventory_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error updating inventory item:', error)
      return NextResponse.json(
        { error: 'Failed to update inventory item', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Successfully updated inventory item:', id)

    return NextResponse.json({
      success: true,
      item: updatedItem,
      message: 'Inventory item updated successfully'
    })

  } catch (error) {
    console.error('Failed to update inventory item:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update inventory item', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
