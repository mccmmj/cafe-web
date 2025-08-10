#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ofppjltowsdvojixeflr.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mcHBqbHRvd3Nkdm9qaXhlZmxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYyODgzMCwiZXhwIjoyMDY4MjA0ODMwfQ._jycmldpAdxiZuWdqWcA_T1Y0ODYz3aloqltqZcKDy4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testAnalyticsData() {
  console.log('🧪 Testing analytics data availability...')

  try {
    // Test inventory items
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('id, current_stock, minimum_threshold, reorder_point, unit_cost, item_name')
      .limit(5)

    if (inventoryError) {
      console.error('❌ Error fetching inventory items:', inventoryError)
    } else {
      console.log(`✅ Found ${inventoryItems?.length || 0} inventory items`)
    }

    // Test stock movements
    const { data: stockMovements, error: movementsError } = await supabase
      .from('stock_movements')
      .select('id, movement_type, quantity_change, created_at')
      .limit(5)

    if (movementsError) {
      console.error('❌ Error fetching stock movements:', movementsError)
    } else {
      console.log(`✅ Found ${stockMovements?.length || 0} stock movements`)
    }

    // Test purchase orders
    const { data: purchaseOrders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select('id, status, total_amount, order_date')
      .limit(5)

    if (ordersError) {
      console.error('❌ Error fetching purchase orders:', ordersError)
    } else {
      console.log(`✅ Found ${purchaseOrders?.length || 0} purchase orders`)
    }

    // Test suppliers
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('id, name, is_active')
      .limit(5)

    if (suppliersError) {
      console.error('❌ Error fetching suppliers:', suppliersError)
    } else {
      console.log(`✅ Found ${suppliers?.length || 0} suppliers`)
    }

    console.log('\n📊 Analytics data test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testAnalyticsData()