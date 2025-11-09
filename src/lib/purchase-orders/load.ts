import type { SupabaseClient } from '@supabase/supabase-js'

export interface PurchaseOrderLineItem {
  id: string
  inventory_item_id: string
  name: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  total_cost: number
  unit_type?: string | null
}

export interface PurchaseOrderSupplier {
  id: string
  name: string
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  payment_terms?: string | null
}

export interface PurchaseOrderIssuance {
  id: string
  order_number: string
  status: string
  order_date: string
  expected_delivery_date?: string | null
  actual_delivery_date?: string | null
  total_amount: number
  notes?: string | null
  sent_at?: string | null
  sent_via?: string | null
  sent_notes?: string | null
  supplier: PurchaseOrderSupplier
  items: PurchaseOrderLineItem[]
}

export async function fetchPurchaseOrderForIssuance(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ order: PurchaseOrderIssuance | null; error?: Error }> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      suppliers!purchase_orders_supplier_id_fkey (
        id,
        name,
        contact_person,
        email,
        phone,
        address,
        payment_terms
      ),
      purchase_order_items!purchase_order_items_purchase_order_id_fkey (
        id,
        inventory_item_id,
        quantity_ordered,
        quantity_received,
        unit_cost,
        total_cost,
        inventory_items!purchase_order_items_inventory_item_id_fkey (
          item_name,
          unit_type
        )
      )
    `)
    .eq('id', orderId)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch purchase order for issuance:', error)
    return { order: null, error: new Error(error.message) }
  }

  if (!data) {
    return { order: null }
  }

  const supplierData = data.suppliers || {}

  const items = (data.purchase_order_items || []).map((item: any) => ({
    id: item.id,
    inventory_item_id: item.inventory_item_id,
    name: item.inventory_items?.item_name || 'Unknown Item',
    quantity_ordered: item.quantity_ordered,
    quantity_received: item.quantity_received ?? 0,
    unit_cost: Number(item.unit_cost ?? 0),
    total_cost: Number(item.total_cost ?? 0),
    unit_type: item.inventory_items?.unit_type ?? null
  })) as PurchaseOrderLineItem[]

  const order: PurchaseOrderIssuance = {
    id: data.id,
    order_number: data.order_number,
    status: data.status,
    order_date: data.order_date,
    expected_delivery_date: data.expected_delivery_date,
    actual_delivery_date: data.actual_delivery_date,
    total_amount: Number(data.total_amount ?? 0),
    notes: data.notes,
    sent_at: data.sent_at,
    sent_via: data.sent_via,
    sent_notes: data.sent_notes,
    supplier: {
      id: supplierData.id,
      name: supplierData.name || 'Unknown Supplier',
      contact_person: supplierData.contact_person,
      email: supplierData.email,
      phone: supplierData.phone,
      address: supplierData.address,
      payment_terms: supplierData.payment_terms
    },
    items
  }

  return { order }
}
