import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/middleware'
import { createClient } from '@/lib/supabase/server'
import { findItemMatches } from '@/lib/matching/item-matcher'

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

    console.log('🔍 Starting item matching for invoice:', id)

    // Get invoice with items and supplier info
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        supplier_id,
        suppliers (
          id,
          name
        ),
        invoice_items (
          id,
          item_description,
          supplier_item_code,
          quantity,
          unit_price,
          package_size,
          unit_type,
          matched_item_id,
          match_confidence
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

    if (!invoice.invoice_items || invoice.invoice_items.length === 0) {
      return NextResponse.json(
        { error: 'Invoice has no items to match' },
        { status: 400 }
      )
    }

    // Get all inventory items for matching
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_items')
      .select(`
        id,
        item_name,
        current_stock,
        unit_cost,
        unit_type,
        pack_size,
        square_item_id,
        suppliers (
          name
        )
      `)

    if (inventoryError) {
      console.error('Error fetching inventory items:', inventoryError)
      return NextResponse.json(
        { error: 'Failed to fetch inventory items' },
        { status: 500 }
      )
    }

    // Transform inventory items for matching
  const formattedInventoryItems = (inventoryItems || []).map(item => ({
    id: item.id,
    item_name: item.item_name,
    current_stock: item.current_stock,
    unit_cost: item.unit_cost,
    unit_type: item.unit_type,
    pack_size: item.pack_size,
    supplier_name: (item.suppliers as any)?.name,
    square_item_id: item.square_item_id
  }))

    // Find matches for each invoice item
    const itemMatches: any = {}
    const matchingResults = []

    for (const invoiceItem of invoice.invoice_items) {
      console.log(`🔍 Finding matches for: ${invoiceItem.item_description}`)

      const matches = await findItemMatches(
        {
          id: invoiceItem.id,
          item_description: invoiceItem.item_description,
          supplier_item_code: invoiceItem.supplier_item_code,
          quantity: invoiceItem.quantity,
          unit_price: invoiceItem.unit_price,
          package_size: invoiceItem.package_size,
          unit_type: invoiceItem.unit_type
        },
        formattedInventoryItems,
        {
          supplier_name: (invoice.suppliers as any)?.name,
          fuzzy_threshold: 0.6,
          max_suggestions: 5
        }
      )

      itemMatches[invoiceItem.id] = matches
      
      matchingResults.push({
        invoice_item_id: invoiceItem.id,
        item_description: invoiceItem.item_description,
        supplier_item_code: invoiceItem.supplier_item_code,
        quantity: invoiceItem.quantity,
        unit_price: invoiceItem.unit_price,
        package_size: invoiceItem.package_size,
        unit_type: invoiceItem.unit_type,
        current_match_id: invoiceItem.matched_item_id,
        current_confidence: invoiceItem.match_confidence,
        suggested_matches: matches,
        best_match: matches.length > 0 ? matches[0] : null
      })

      // Auto-update high confidence matches
      if (matches.length > 0 && matches[0].confidence >= 0.8 && !invoiceItem.matched_item_id) {
        const bestMatch = matches[0]
        
        const { error: updateError } = await supabase
          .from('invoice_items')
          .update({
            matched_item_id: bestMatch.inventory_item_id,
            match_confidence: bestMatch.confidence,
            match_method: bestMatch.match_method
          })
          .eq('id', invoiceItem.id)

        if (updateError) {
          console.error('Failed to auto-update match:', updateError)
        } else {
          console.log(`✅ Auto-matched: ${invoiceItem.item_description} -> ${bestMatch.inventory_item.item_name}`)
        }
      }
    }

    // Calculate overall matching statistics
    const totalItems = invoice.invoice_items.length
    const itemsWithMatches = matchingResults.filter(r => r.suggested_matches.length > 0).length
    const itemsWithHighConfidence = matchingResults.filter(r => 
      r.suggested_matches.length > 0 && r.suggested_matches[0].confidence >= 0.8
    ).length
    const autoMatchedItems = matchingResults.filter(r => 
      r.current_match_id && r.current_confidence >= 0.8
    ).length

    const statistics = {
      total_items: totalItems,
      items_with_matches: itemsWithMatches,
      items_with_high_confidence: itemsWithHighConfidence,
      auto_matched_items: autoMatchedItems,
      matching_coverage: totalItems > 0 ? (itemsWithMatches / totalItems) * 100 : 0,
      high_confidence_rate: totalItems > 0 ? (itemsWithHighConfidence / totalItems) * 100 : 0
    }

    console.log('✅ Item matching completed:', statistics)

    return NextResponse.json({
      success: true,
      data: {
        invoice_id: id,
        supplier_name: (invoice.suppliers as any)?.name,
        matching_results: matchingResults,
        statistics
      },
      message: 'Item matching completed successfully'
    })

  } catch (error) {
    console.error('Failed to match items:', error)
    return NextResponse.json(
      { 
        error: 'Failed to match items', 
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

    // Get existing matches for the invoice
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        id,
        suppliers (name),
        invoice_items (
          id,
          item_description,
          quantity,
          unit_price,
          matched_item_id,
          match_confidence,
          match_method,
          inventory_items (
            id,
            item_name,
            current_stock,
            unit_cost
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const matchingResults = invoice.invoice_items?.map(item => ({
      invoice_item_id: item.id,
      item_description: item.item_description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      matched_item: item.inventory_items ? {
        id: (item.inventory_items as any)?.id,
        item_name: (item.inventory_items as any)?.item_name,
        current_stock: (item.inventory_items as any)?.current_stock,
        unit_cost: (item.inventory_items as any)?.unit_cost
      } : null,
      match_confidence: item.match_confidence,
      match_method: item.match_method
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        invoice_id: id,
        supplier_name: (invoice.suppliers as any)?.name,
        matching_results: matchingResults
      }
    })

  } catch (error) {
    console.error('Failed to get item matches:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get item matches', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
