import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface InvoiceRow {
  id: string
  invoice_number: string
  status: string
  suppliers: {
    name?: string | null
  } | null
}

export async function GET() {
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
    const typedInvoices = (invoices || []) as InvoiceRow[]
    const statusCounts = typedInvoices.reduce<Record<string, number>>((acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      invoices: typedInvoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        status: inv.status,
        supplier: inv.suppliers?.name || null
      })),
      statusCounts,
      totalInvoices: typedInvoices.length
    })

  } catch (error) {
    console.error('Debug endpoint error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      error: message
    }, { status: 500 })
  }
}
