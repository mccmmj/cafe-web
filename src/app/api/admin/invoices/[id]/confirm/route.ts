import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    console.log('✅ Confirming invoice import:', id)

    const supabase = await createClient()

    // Get the invoice and its items
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items!inner(
          id,
          item_description,
          quantity,
          unit_price,
          total_price,
          matched_item_id,
          match_method
        ),
        suppliers(name)
      `)
      .eq('id', id)
      .single()

    if (invoiceError) {
      console.error('Failed to fetch invoice:', invoiceError)
      return NextResponse.json({
        success: false,
        error: `Failed to fetch invoice: ${invoiceError.message}`
      }, { status: 500 })
    }

    // Update inventory stock levels for matched items
    const matchedItems = invoice.invoice_items.filter((item: any) => 
      item.matched_item_id && item.match_method !== 'skipped'
    )

    console.log(`📦 Updating stock levels for ${matchedItems.length} matched items`)

    for (const invoiceItem of matchedItems) {
      if (invoiceItem.matched_item_id) {
        // Update inventory stock using database function
        const { error: stockError } = await supabase
          .rpc('update_inventory_stock', {
            item_id: invoiceItem.matched_item_id,
            quantity_change: invoiceItem.quantity,
            operation_type: 'restock',
            notes: `Invoice ${invoice.invoice_number} - ${invoice.suppliers?.name || 'Unknown Supplier'}`
          })

        if (stockError) {
          console.error('Failed to update stock for item:', invoiceItem.matched_item_id, stockError)
          // Continue with other items, don't fail the entire operation
        } else {
          console.log(`✅ Updated stock for item ${invoiceItem.matched_item_id}: +${invoiceItem.quantity}`)
        }
      }
    }

    // Mark purchase orders as received if they exist
    const { data: purchaseOrders } = await supabase
      .from('purchase_orders')
      .select('id, status')
      .eq('supplier_id', invoice.supplier_id)
      .in('status', ['pending', 'ordered'])
      .order('created_at', { ascending: false })
      .limit(5)

    if (purchaseOrders && purchaseOrders.length > 0) {
      // Mark the most recent purchase order as received
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({
          status: 'received',
          received_at: new Date().toISOString(),
          notes: `Received via invoice ${invoice.invoice_number}`
        })
        .eq('id', purchaseOrders[0].id)

      if (poError) {
        console.error('Failed to update purchase order:', poError)
      } else {
        console.log('✅ Marked purchase order as received:', purchaseOrders[0].id)
      }
    }

    // Update invoice status to confirmed
    const { error: confirmError } = await supabase
      .from('invoices')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (confirmError) {
      console.error('Failed to confirm invoice:', confirmError)
      return NextResponse.json({
        success: false,
        error: `Failed to confirm invoice: ${confirmError.message}`
      }, { status: 500 })
    }

    console.log('✅ Invoice import confirmed successfully')

    // Generate summary stats
    const totalItems = invoice.invoice_items.length
    const matchedCount = matchedItems.length
    const skippedCount = invoice.invoice_items.filter((item: any) => item.match_method === 'skipped').length
    const createdCount = invoice.invoice_items.filter((item: any) => item.match_method === 'manual_create').length

    return NextResponse.json({
      success: true,
      data: {
        message: 'Invoice import confirmed successfully',
        summary: {
          total_items: totalItems,
          matched_items: matchedCount,
          created_items: createdCount,
          skipped_items: skippedCount,
          inventory_updated: true,
          purchase_order_updated: purchaseOrders && purchaseOrders.length > 0
        }
      }
    })

  } catch (error: any) {
    console.error('Error confirming invoice:', error)
    return NextResponse.json({
      success: false,
      error: `Server error: ${error.message}`
    }, { status: 500 })
  }
}