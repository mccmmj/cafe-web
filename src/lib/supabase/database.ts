import { createClient } from './server'
import type { Order, UserProfile } from '@/types/menu'

// Server-side database operations
export async function createUserProfile(userId: string, email: string, fullName?: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      full_name: fullName
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getUserProfile(userId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function createOrder(orderData: {
  userId?: string
  squareOrderId?: string
  totalAmount: number
  taxAmount?: number
  customerEmail?: string
  customerPhone?: string
  specialInstructions?: string
  items: Array<{
    squareItemId: string
    itemName: string
    quantity: number
    unitPrice: number
    totalPrice: number
    variations?: Record<string, any>
    modifiers?: Record<string, any>
  }>
}) {
  const supabase = createClient()
  
  // Create the order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: orderData.userId,
      square_order_id: orderData.squareOrderId,
      total_amount: orderData.totalAmount,
      tax_amount: orderData.taxAmount || 0,
      customer_email: orderData.customerEmail,
      customer_phone: orderData.customerPhone,
      special_instructions: orderData.specialInstructions
    })
    .select()
    .single()
  
  if (orderError) throw orderError
  
  // Create order items
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(
      orderData.items.map(item => ({
        order_id: order.id,
        square_item_id: item.squareItemId,
        item_name: item.itemName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        variations: item.variations || {},
        modifiers: item.modifiers || {}
      }))
    )
  
  if (itemsError) throw itemsError
  
  return order
}

export async function getOrdersForUser(userId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function updateOrderStatus(orderId: string, status: string, paymentStatus?: string) {
  const supabase = createClient()
  
  const updates: any = { status }
  if (paymentStatus) updates.payment_status = paymentStatus
  
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

