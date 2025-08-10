#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedPurchaseOrders() {
  console.log('🌱 Seeding purchase orders...')

  try {
    // First, get some suppliers and inventory items
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('is_active', true)
      .limit(3)

    if (suppliersError || !suppliers || suppliers.length === 0) {
      console.error('❌ No active suppliers found. Please seed suppliers first.')
      return
    }

    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('id, item_name, unit_cost, unit_type')
      .limit(10)

    if (inventoryError || !inventoryItems || inventoryItems.length === 0) {
      console.error('❌ No inventory items found. Please seed inventory first.')
      return
    }

    console.log(`📦 Found ${suppliers.length} suppliers and ${inventoryItems.length} inventory items`)

    // Sample purchase orders
    const sampleOrders = [
      {
        supplier_id: suppliers[0].id,
        supplier_name: suppliers[0].name,
        order_number: 'PO-2025001',
        status: 'sent',
        order_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        expected_delivery_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        notes: 'Weekly coffee bean order - regular delivery',
        items: [
          { item: inventoryItems[0], quantity: 20, unit_cost: inventoryItems[0].unit_cost },
          { item: inventoryItems[1], quantity: 15, unit_cost: inventoryItems[1].unit_cost },
          { item: inventoryItems[2], quantity: 10, unit_cost: inventoryItems[2].unit_cost }
        ]
      },
      {
        supplier_id: suppliers[1].id,
        supplier_name: suppliers[1].name,
        order_number: 'PO-2025002',
        status: 'confirmed',
        order_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        expected_delivery_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        notes: 'Pastry supplies for weekend rush',
        items: [
          { item: inventoryItems[3], quantity: 50, unit_cost: inventoryItems[3].unit_cost },
          { item: inventoryItems[4], quantity: 30, unit_cost: inventoryItems[4].unit_cost }
        ]
      },
      {
        supplier_id: suppliers[2].id,
        supplier_name: suppliers[2].name,
        order_number: 'PO-2025003',
        status: 'received',
        order_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        expected_delivery_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        actual_delivery_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        notes: 'Dairy products delivery - arrived on time',
        items: [
          { item: inventoryItems[5], quantity: 100, unit_cost: inventoryItems[5].unit_cost },
          { item: inventoryItems[6], quantity: 75, unit_cost: inventoryItems[6].unit_cost }
        ]
      },
      {
        supplier_id: suppliers[0].id,
        supplier_name: suppliers[0].name,
        order_number: 'PO-2025004',
        status: 'draft',
        order_date: new Date().toISOString(),
        expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
        notes: 'Draft order for next week - needs review',
        items: [
          { item: inventoryItems[7], quantity: 25, unit_cost: inventoryItems[7].unit_cost },
          { item: inventoryItems[8], quantity: 40, unit_cost: inventoryItems[8].unit_cost }
        ]
      },
      {
        supplier_id: suppliers[1].id,
        supplier_name: suppliers[1].name,
        order_number: 'PO-2025005',
        status: 'sent',
        order_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
        expected_delivery_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday (overdue)
        notes: 'OVERDUE - Special equipment order',
        items: [
          { item: inventoryItems[9], quantity: 5, unit_cost: inventoryItems[9].unit_cost }
        ]
      }
    ]

    console.log(`📝 Creating ${sampleOrders.length} sample purchase orders...`)

    // Create each purchase order
    for (const orderData of sampleOrders) {
      // Calculate total amount
      const totalAmount = orderData.items.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_cost)
      }, 0)

      // Create purchase order
      const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          supplier_id: orderData.supplier_id,
          order_number: orderData.order_number,
          status: orderData.status,
          order_date: orderData.order_date,
          expected_delivery_date: orderData.expected_delivery_date,
          actual_delivery_date: orderData.actual_delivery_date || null,
          total_amount: totalAmount,
          notes: orderData.notes
        })
        .select()
        .single()

      if (orderError) {
        if (orderError.code === '23505') { // Unique constraint violation
          console.log(`⏭️  Purchase order ${orderData.order_number} already exists, skipping...`)
          continue
        }
        console.error(`❌ Error creating purchase order ${orderData.order_number}:`, orderError)
        continue
      }

      console.log(`✅ Created purchase order: ${orderData.order_number} (${orderData.status})`)

      // Create purchase order items
      const orderItems = orderData.items.map(item => ({
        purchase_order_id: order.id,
        inventory_item_id: item.item.id,
        quantity_ordered: item.quantity,
        quantity_received: orderData.status === 'received' ? item.quantity : 0,
        unit_cost: item.unit_cost
        // total_cost is a generated column, don't insert into it
      }))

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error(`❌ Error creating items for order ${orderData.order_number}:`, itemsError)
        continue
      }

      console.log(`   📦 Added ${orderItems.length} items to order`)

      // If order is received, create stock movements
      if (orderData.status === 'received') {
        const stockMovements = orderData.items.map(item => ({
          inventory_item_id: item.item.id,
          movement_type: 'in',
          quantity: item.quantity,
          reference_type: 'purchase_order',
          reference_id: order.id,
          notes: `Received from purchase order #${orderData.order_number}`
        }))

        const { error: movementsError } = await supabase
          .from('stock_movements')
          .insert(stockMovements)

        if (movementsError) {
          console.error(`❌ Error creating stock movements for order ${orderData.order_number}:`, movementsError)
        } else {
          console.log(`   📊 Created stock movements for received items`)
        }
      }
    }

    // Summary
    const { data: orders, error: countError } = await supabase
      .from('purchase_orders')
      .select('status')

    if (!countError && orders) {
      const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1
        return acc
      }, {})

      console.log('\n📊 Purchase Orders Summary:')
      console.log(`   Total Orders: ${orders.length}`)
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`)
      })
    }

    console.log('\n✅ Purchase orders seeding completed!')

  } catch (error) {
    console.error('❌ Error seeding purchase orders:', error)
    process.exit(1)
  }
}

// Run the seeding
seedPurchaseOrders()