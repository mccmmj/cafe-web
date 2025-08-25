import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get all invoices with their statuses for debugging
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        status,
        suppliers(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Debug error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Count statuses
    const statusCounts = invoices.reduce((acc: any, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        status: inv.status,
        supplier: (inv.suppliers as any)?.name
      })),
      statusCounts,
      totalInvoices: invoices.length
    })

  } catch (error: any) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}