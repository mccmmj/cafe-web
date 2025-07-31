/**
 * Script to check current database schema
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkSchema() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    console.log('Checking database schema...\n')

    // Check orders table structure
    console.log('Orders table:')
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1)

    if (ordersError) {
      console.log('❌ Orders table error:', ordersError.message)
    } else {
      console.log('✅ Orders table exists')
      if (orders.length > 0) {
        console.log('Orders columns:', Object.keys(orders[0]))
      }
    }

    // Check profiles table structure
    console.log('\nProfiles table:')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    if (profilesError) {
      console.log('❌ Profiles table error:', profilesError.message)
    } else {
      console.log('✅ Profiles table exists')
      if (profiles.length > 0) {
        console.log('Profiles columns:', Object.keys(profiles[0]))
      }
    }

    // Check order_items table structure
    console.log('\nOrder items table:')
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('*')
      .limit(1)

    if (orderItemsError) {
      console.log('❌ Order items table error:', orderItemsError.message)
    } else {
      console.log('✅ Order items table exists')
      if (orderItems.length > 0) {
        console.log('Order items columns:', Object.keys(orderItems[0]))
      }
    }

    // Try to fetch orders with a simple query
    console.log('\nTesting simple orders query:')
    const { data: simpleOrders, error: simpleError } = await supabase
      .from('orders')
      .select('*')
      .limit(5)

    if (simpleError) {
      console.log('❌ Simple orders query failed:', simpleError.message)
    } else {
      console.log(`✅ Simple orders query works (found ${simpleOrders.length} orders)`)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkSchema()