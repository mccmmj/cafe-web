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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const supplier_id = searchParams.get('supplier_id')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        due_date,
        total_amount,
        status,
        file_name,
        file_type,
        parsing_confidence,
        created_at,
        updated_at,
        suppliers (
          id,
          name
        )
      `)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (supplier_id) {
      query = query.eq('supplier_id', supplier_id)
    }
    if (start_date) {
      query = query.gte('invoice_date', start_date)
    }
    if (end_date) {
      query = query.lte('invoice_date', end_date)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: invoices, error, count } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json(
        { error: 'Failed to fetch invoices', details: error.message },
        { status: 500 }
      )
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Failed to fetch invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices', details: error instanceof Error ? error.message : 'Unknown error' },
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
      invoice_number,
      invoice_date,
      due_date,
      total_amount,
      file_url,
      file_name,
      file_type,
      file_size
    } = body

    if (!supplier_id || !invoice_number || !invoice_date) {
      return NextResponse.json(
        { error: 'Missing required fields: supplier_id, invoice_number, invoice_date' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check for duplicate invoice
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('supplier_id', supplier_id)
      .eq('invoice_number', invoice_number)
      .single()

    if (existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice with this number already exists for this supplier' },
        { status: 409 }
      )
    }

    // Create new invoice
    const { data: newInvoice, error } = await supabase
      .from('invoices')
      .insert({
        supplier_id,
        invoice_number,
        invoice_date,
        due_date,
        total_amount: total_amount || 0,
        file_url,
        file_name,
        file_type,
        file_size,
        status: 'uploaded',
        created_by: authResult.userId
      })
      .select(`
        id,
        invoice_number,
        invoice_date,
        due_date,
        total_amount,
        status,
        file_name,
        file_type,
        created_at,
        suppliers (
          id,
          name
        )
      `)
      .single()

    if (error) {
      console.error('Error creating invoice:', error)
      return NextResponse.json(
        { error: 'Failed to create invoice', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Successfully created invoice:', newInvoice.invoice_number)

    return NextResponse.json({
      success: true,
      data: newInvoice,
      message: 'Invoice created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create invoice:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}