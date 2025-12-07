import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SupplierMetric, SupplierMetricSummary } from '@/types/purchase-order-metrics'

interface MetricRow {
  supplier_id: string | null
  supplier_name: string | null
  period_month: string
  total_pos?: number | string | null
  total_spend?: number | string | null
  open_balance?: number | string | null
  avg_approval_days?: number | string | null
  avg_issue_days?: number | string | null
  avg_receipt_days?: number | string | null
  on_time_ratio?: number | string | null
  fulfillment_ratio?: number | string | null
  invoice_exception_rate?: number | string | null
  variance_rate?: number | string | null
  avg_invoice_throughput_days?: number | string | null
  invoice_match_count?: number | null
  invoice_exception_count?: number | null
  variance_match_count?: number | null
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials are not configured')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

const DEFAULT_MONTH_WINDOW = 6

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  const numeric = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const numeric = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')
    const limitParam = searchParams.get('limit')
    const supplierParams = searchParams.getAll('supplierId').filter(Boolean)

    const endDate = endParam ? new Date(endParam) : new Date()
    const startDate = startParam
      ? new Date(startParam)
      : new Date(new Date().setMonth(endDate.getMonth() - DEFAULT_MONTH_WINDOW + 1))

    const supabase = getSupabaseClient()

    const { data, error } = await supabase.rpc('rpc_po_supplier_metrics', {
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
      p_supplier_ids: supplierParams.length > 0 ? supplierParams : null
    })

    if (error) {
      console.error('rpc_po_supplier_metrics error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const metrics: SupplierMetric[] = (data || []).map((row: MetricRow) => ({
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      periodMonth: row.period_month,
      totalPOs: Number(row.total_pos ?? 0),
      totalSpend: toNumber(row.total_spend),
      openBalance: toNumber(row.open_balance),
      avgApprovalDays: toNullableNumber(row.avg_approval_days),
      avgIssueDays: toNullableNumber(row.avg_issue_days),
      avgReceiptDays: toNullableNumber(row.avg_receipt_days),
      onTimeRatio: toNullableNumber(row.on_time_ratio),
      fulfillmentRatio: toNullableNumber(row.fulfillment_ratio),
      invoiceExceptionRate: toNullableNumber(row.invoice_exception_rate),
      varianceRate: toNullableNumber(row.variance_rate),
      avgInvoiceThroughputDays: toNullableNumber(row.avg_invoice_throughput_days),
      invoiceMatchCount: Number(row.invoice_match_count ?? 0),
      invoiceExceptionCount: Number(row.invoice_exception_count ?? 0),
      varianceMatchCount: Number(row.variance_match_count ?? 0)
    }))

    const limitedMetrics =
      limitParam && Number(limitParam) > 0
        ? metrics.slice(0, Number(limitParam))
        : metrics

    const onTimeValues: number[] = []
    const fulfillmentValues: number[] = []
    const exceptionValues: number[] = []
    const supplierSet = new Set<string | null>()

    const summary: SupplierMetricSummary = limitedMetrics.reduce(
      (acc, metric) => {
        acc.totalSpend += metric.totalSpend
        acc.openBalance += metric.openBalance
        acc.totalPOs += metric.totalPOs
        supplierSet.add(metric.supplierId)

        if (metric.onTimeRatio !== null) {
          onTimeValues.push(metric.onTimeRatio)
        }
        if (metric.fulfillmentRatio !== null) {
          fulfillmentValues.push(metric.fulfillmentRatio)
        }
        if (metric.invoiceExceptionRate !== null) {
          exceptionValues.push(metric.invoiceExceptionRate)
        }
        return acc
      },
      {
        totalSpend: 0,
        openBalance: 0,
        totalPOs: 0,
        suppliers: 0,
        avgOnTimeRatio: null as number | null,
        avgFulfillmentRatio: null as number | null,
        avgInvoiceExceptionRate: null as number | null
      }
    )

    summary.suppliers = supplierSet.size
    summary.avgOnTimeRatio =
      onTimeValues.length > 0
        ? onTimeValues.reduce((sum, value) => sum + value, 0) / onTimeValues.length
        : null

    summary.avgFulfillmentRatio =
      fulfillmentValues.length > 0
        ? fulfillmentValues.reduce((sum, value) => sum + value, 0) / fulfillmentValues.length
        : null

    summary.avgInvoiceExceptionRate =
      exceptionValues.length > 0
        ? exceptionValues.reduce((sum, value) => sum + value, 0) / exceptionValues.length
        : null

    return NextResponse.json({
      success: true,
      data: {
        metrics: limitedMetrics,
        summary
      }
    })
  } catch (error) {
    console.error('purchase-orders metrics error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error'
      },
      { status: 500 }
    )
  }
}
