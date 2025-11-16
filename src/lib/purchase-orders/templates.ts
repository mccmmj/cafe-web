import type { SupabaseClient } from '@supabase/supabase-js'
import type { PurchaseOrderIssuance } from './load'

export const PURCHASE_ORDER_TEMPLATE_TYPE = 'purchase_order'

export interface SupplierEmailTemplate {
  id: string
  supplier_id: string
  template_type: string
  subject_template: string
  body_template: string
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export type PurchaseOrderTemplateContext = Record<string, string>

export interface PurchaseOrderTemplateSource {
  order_number?: string | null
  order_date?: string | null
  expected_delivery_date?: string | null
  total_amount?: number | null
  supplier?: {
    name?: string | null
    contact_person?: string | null
    payment_terms?: string | null
  } | null
}

export const PURCHASE_ORDER_TEMPLATE_VARIABLES: Record<string, string> = {
  order_number: 'Purchase order number (e.g., PO-1234)',
  supplier_name: 'Supplier name',
  supplier_contact: 'Supplier contact person or supplier name',
  order_date: 'Order date (e.g., January 15, 2025)',
  expected_delivery_date: 'Expected delivery date (e.g., January 20, 2025)',
  total_amount: 'Total order amount with currency (e.g., $1,245.00)',
  payment_terms: 'Supplier payment terms',
}

export async function fetchSupplierTemplate(
  supabase: SupabaseClient,
  supplierId?: string,
  templateType = PURCHASE_ORDER_TEMPLATE_TYPE
): Promise<SupplierEmailTemplate | null> {
  if (!supplierId) return null

  const { data, error } = await supabase
    .from('supplier_email_templates')
    .select('*')
    .eq('supplier_id', supplierId)
    .eq('template_type', templateType)
    .maybeSingle()

  if (error) {
    console.error('Failed to load supplier email template:', error)
    return null
  }

  return data
}

export function buildPurchaseOrderTemplateContext(
  order: PurchaseOrderTemplateSource | PurchaseOrderIssuance
): PurchaseOrderTemplateContext {
  const supplier =
    ((order as PurchaseOrderTemplateSource).supplier ??
      (order as PurchaseOrderIssuance).supplier) || null

  return {
    order_number: order.order_number || '',
    supplier_name: supplier?.name || '',
    supplier_contact: supplier?.contact_person || supplier?.name || '',
    order_date: formatDate(order.order_date),
    expected_delivery_date: formatDate(order.expected_delivery_date),
    total_amount: formatCurrency(order.total_amount),
    payment_terms: supplier?.payment_terms || '',
  }
}

export function renderTemplate(template: string, context: PurchaseOrderTemplateContext): string {
  return template.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, key) => context[key] ?? '')
}

function formatDate(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function formatCurrency(amount?: number | null): string {
  const numericAmount = Number(amount ?? 0)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numericAmount)
}
