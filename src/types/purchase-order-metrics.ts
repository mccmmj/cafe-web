export interface SupplierMetric {
  supplierId: string | null
  supplierName: string | null
  periodMonth: string
  totalPOs: number
  totalSpend: number
  openBalance: number
  avgApprovalDays: number | null
  avgIssueDays: number | null
  avgReceiptDays: number | null
  onTimeRatio: number | null
  fulfillmentRatio: number | null
  invoiceExceptionRate: number | null
  varianceRate: number | null
  avgInvoiceThroughputDays: number | null
  invoiceMatchCount: number
  invoiceExceptionCount: number
  varianceMatchCount: number
}

export interface SupplierMetricSummary {
  totalSpend: number
  openBalance: number
  totalPOs: number
  suppliers: number
  avgOnTimeRatio: number | null
  avgFulfillmentRatio: number | null
  avgInvoiceExceptionRate: number | null
}
