import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/middleware'
import { createClient } from '@/lib/supabase/server'
import { findOrderMatches } from '@/lib/matching/item-matcher'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const resolvedParams = await context.params
    const { id } = resolvedParams
    const supabase = await createClient()

    console.log('🔍 Starting order matching for invoice:', id)

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_date,
        total_amount,
        supplier_id,
        suppliers (
          id,
          name
        ),
        invoice_items (
          id,
          item_description,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Get candidate purchase orders (sent/confirmed status, same supplier, recent)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: purchaseOrders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        order_number,
        supplier_id,
        order_date,
        expected_delivery_date,
        status,
        total_amount,
        suppliers (
          id,
          name
        ),
        purchase_order_items (
          id,
          inventory_item_id,
          quantity_ordered,
          unit_cost,
          total_cost,
          inventory_items (
            id,
            item_name
          )
        )
      `)
      .eq('supplier_id', invoice.supplier_id)
      .in('status', ['sent', 'confirmed'])
      .gte('order_date', thirtyDaysAgo.toISOString())
      .order('order_date', { ascending: false })

    if (ordersError) {
      console.error('Error fetching purchase orders:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch purchase orders' },
        { status: 500 }
      )
    }

    // Transform purchase orders for matching
    const formattedOrders = (purchaseOrders || []).map(order => ({
      id: order.id,
      order_number: order.order_number,
      supplier_id: order.supplier_id,
      supplier_name: (order.suppliers as any)?.name || '',
      order_date: order.order_date,
      expected_delivery_date: order.expected_delivery_date,
      status: order.status,
      total_amount: order.total_amount,
      items: (order.purchase_order_items || []).map(item => ({
        id: item.id,
        inventory_item_id: item.inventory_item_id,
        item_name: (item.inventory_items as any)?.item_name || 'Unknown Item',
        quantity_ordered: item.quantity_ordered,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost
      }))
    }))

    console.log(`📦 Found ${formattedOrders.length} candidate purchase orders`)

    // Transform invoice items for matching
    const invoiceItems = (invoice.invoice_items || []).map(item => ({
      id: item.id,
      item_description: item.item_description,
      quantity: item.quantity,
      unit_price: item.unit_price
    }))

    // Find order matches
    const orderMatches = await findOrderMatches(
      (invoice.suppliers as any)?.name || '',
      invoice.invoice_date,
      invoice.total_amount,
      invoiceItems,
      formattedOrders
    )

    // Auto-create high confidence matches
    const autoMatches = []
    for (const match of orderMatches) {
      if (match.confidence >= 0.7) {
        // Check if match already exists
        const { data: existingMatch } = await supabase
          .from('order_invoice_matches')
          .select('id')
          .eq('invoice_id', id)
          .eq('purchase_order_id', match.purchase_order_id)
          .single()

        if (!existingMatch) {
          const { data: newMatch, error: matchError } = await supabase
            .from('order_invoice_matches')
            .insert({
              invoice_id: id,
              purchase_order_id: match.purchase_order_id,
              match_confidence: match.confidence,
              match_method: 'auto',
              status: 'pending',
              quantity_variance: match.quantity_variance,
              amount_variance: match.amount_variance,
              variance_notes: `Auto-matched: ${match.match_reasons.join(', ')}`
            })
            .select()
            .single()

          if (matchError) {
            console.error('Failed to create auto-match:', matchError)
          } else {
            autoMatches.push(newMatch)
            console.log(`✅ Auto-matched order: ${match.purchase_order.order_number}`)
          }
        }
      }
    }

    // Calculate matching statistics
    const statistics = {
      total_candidates: formattedOrders.length,
      matches_found: orderMatches.length,
      high_confidence_matches: orderMatches.filter(m => m.confidence >= 0.7).length,
      auto_matches_created: autoMatches.length,
      best_match_confidence: orderMatches.length > 0 ? orderMatches[0].confidence : 0
    }

    console.log('✅ Order matching completed:', statistics)

    return NextResponse.json({
      success: true,
      data: {
        invoice_id: id,
        invoice_date: invoice.invoice_date,
        invoice_total: invoice.total_amount,
        supplier_name: (invoice.suppliers as any)?.name,
        order_matches: orderMatches,
        auto_matches: autoMatches,
        statistics
      },
      message: 'Order matching completed successfully'
    })

  } catch (error) {
    console.error('Failed to match orders:', error)
    return NextResponse.json(
      { 
        error: 'Failed to match orders', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const resolvedParams = await context.params
    const { id } = resolvedParams
    const supabase = await createClient()

    // Get existing order matches for the invoice
    const { data: matches, error } = await supabase
      .from('order_invoice_matches')
      .select(`
        id,
        match_confidence,
        match_method,
        status,
        quantity_variance,
        amount_variance,
        variance_notes,
        created_at,
        purchase_orders (
          id,
          order_number,
          order_date,
          total_amount,
          status,
          suppliers (name)
        )
      `)
      .eq('invoice_id', id)
      .order('match_confidence', { ascending: false })

    if (error) {
      console.error('Error fetching order matches:', error)
      return NextResponse.json(
        { error: 'Failed to fetch order matches' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        invoice_id: id,
        order_matches: matches || []
      }
    })

  } catch (error) {
    console.error('Failed to get order matches:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get order matches', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}