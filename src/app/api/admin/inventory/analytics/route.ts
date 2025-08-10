import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/middleware'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'

    // Calculate date ranges
    const now = new Date()
    let startDate: Date
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default: // 30d
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const supabase = await createClient()

    console.log('Generating inventory analytics for range:', range)

    // 1. Inventory Overview
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('id, current_stock, minimum_threshold, reorder_point, unit_cost, is_ingredient')

    if (inventoryError) {
      console.error('Error fetching inventory items:', inventoryError)
      throw new Error('Failed to fetch inventory data')
    }

    const totalItems = inventoryItems?.length || 0
    const totalValue = inventoryItems?.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0) || 0
    const lowStockItems = inventoryItems?.filter(item => 
      item.current_stock <= item.reorder_point && item.current_stock > item.minimum_threshold
    ).length || 0
    const criticalStockItems = inventoryItems?.filter(item => 
      item.current_stock <= item.minimum_threshold && item.current_stock > 0
    ).length || 0
    const outOfStockItems = inventoryItems?.filter(item => item.current_stock === 0).length || 0
    const averageStockLevel = totalItems > 0 ? 
      inventoryItems?.reduce((sum, item) => sum + item.current_stock, 0) / totalItems : 0

    // 2. Stock Movements Analysis
    const { data: stockMovements, error: movementsError } = await supabase
      .from('stock_movements')
      .select(`
        id, 
        movement_type, 
        quantity_change, 
        created_at,
        inventory_items!inner (
          item_name,
          unit_type
        )
      `)
      .gte('created_at', startDate.toISOString())

    if (movementsError) {
      console.error('Error fetching stock movements:', movementsError)
    }

    const movements = stockMovements || []
    const totalMovements = movements.length
    const inboundMovements = movements.filter(m => ['purchase', 'adjustment'].includes(m.movement_type) && m.quantity_change > 0).length
    const outboundMovements = movements.filter(m => ['sale', 'waste', 'adjustment'].includes(m.movement_type) && m.quantity_change < 0).length
    const inboundQuantity = movements
      .filter(m => ['purchase', 'adjustment'].includes(m.movement_type) && m.quantity_change > 0)
      .reduce((sum, m) => sum + Math.abs(m.quantity_change), 0)
    const outboundQuantity = movements
      .filter(m => ['sale', 'waste', 'adjustment'].includes(m.movement_type) && m.quantity_change < 0)
      .reduce((sum, m) => sum + Math.abs(m.quantity_change), 0)
    const netChange = inboundQuantity - outboundQuantity

    // Top consumed items
    const consumedItems = movements
      .filter(m => ['sale', 'waste', 'adjustment'].includes(m.movement_type) && m.quantity_change < 0)
      .reduce((acc, m) => {
        const key = m.inventory_items.item_name
        if (!acc[key]) {
          acc[key] = { 
            item_name: key, 
            total_consumed: 0, 
            unit_type: m.inventory_items.unit_type,
            frequency: 0 
          }
        }
        acc[key].total_consumed += Math.abs(m.quantity_change)
        acc[key].frequency += 1
        return acc
      }, {} as Record<string, any>)

    // Top restocked items
    const restockedItems = movements
      .filter(m => ['purchase', 'adjustment'].includes(m.movement_type) && m.quantity_change > 0)
      .reduce((acc, m) => {
        const key = m.inventory_items.item_name
        if (!acc[key]) {
          acc[key] = { 
            item_name: key, 
            total_restocked: 0, 
            unit_type: m.inventory_items.unit_type,
            frequency: 0 
          }
        }
        acc[key].total_restocked += Math.abs(m.quantity_change)
        acc[key].frequency += 1
        return acc
      }, {} as Record<string, any>)

    // 3. Supplier Metrics
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('id, name, is_active')

    const { data: purchaseOrders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        supplier_id,
        status,
        total_amount,
        order_date,
        expected_delivery_date,
        actual_delivery_date,
        created_at,
        suppliers!inner (name)
      `)
      .gte('created_at', startDate.toISOString())

    const totalSuppliers = suppliers?.length || 0
    const activeSuppliers = suppliers?.filter(s => s.is_active).length || 0

    // Top suppliers by orders
    const supplierOrderStats = (purchaseOrders || []).reduce((acc, order) => {
      const supplierName = order.suppliers.name
      if (!acc[supplierName]) {
        acc[supplierName] = {
          supplier_name: supplierName,
          total_orders: 0,
          total_value: 0,
          delivery_times: [],
          on_time_count: 0
        }
      }
      acc[supplierName].total_orders += 1
      acc[supplierName].total_value += order.total_amount

      if (order.actual_delivery_date && order.expected_delivery_date) {
        const expectedDate = new Date(order.expected_delivery_date)
        const actualDate = new Date(order.actual_delivery_date)
        const deliveryTime = Math.ceil((actualDate.getTime() - new Date(order.order_date).getTime()) / (24 * 60 * 60 * 1000))
        acc[supplierName].delivery_times.push(deliveryTime)
        
        if (actualDate <= expectedDate) {
          acc[supplierName].on_time_count += 1
        }
      }
      
      return acc
    }, {} as Record<string, any>)

    const topSuppliers = Object.values(supplierOrderStats).map((supplier: any) => ({
      ...supplier,
      avg_delivery_days: supplier.delivery_times.length > 0 ? 
        Math.round(supplier.delivery_times.reduce((sum: number, time: number) => sum + time, 0) / supplier.delivery_times.length) : 0,
      on_time_percentage: supplier.total_orders > 0 ? 
        (supplier.on_time_count / supplier.total_orders) * 100 : 0
    })).sort((a, b) => b.total_orders - a.total_orders)

    // Supplier performance
    const supplierPerformance = Object.values(supplierOrderStats).map((supplier: any) => ({
      supplier_name: supplier.supplier_name,
      orders_sent: purchaseOrders?.filter(o => o.suppliers.name === supplier.supplier_name && ['sent', 'confirmed', 'received'].includes(o.status)).length || 0,
      orders_received: purchaseOrders?.filter(o => o.suppliers.name === supplier.supplier_name && o.status === 'received').length || 0,
      orders_overdue: purchaseOrders?.filter(o => {
        if (o.suppliers.name !== supplier.supplier_name || o.status === 'received' || o.status === 'cancelled') return false
        if (!o.expected_delivery_date) return false
        return new Date(o.expected_delivery_date) < now
      }).length || 0,
      avg_cost_per_order: supplier.total_orders > 0 ? supplier.total_value / supplier.total_orders : 0
    }))

    // 4. Purchase Orders Analysis
    const totalOrdersInPeriod = purchaseOrders?.length || 0
    const totalValueInPeriod = purchaseOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0
    const avgOrderValue = totalOrdersInPeriod > 0 ? totalValueInPeriod / totalOrdersInPeriod : 0

    const ordersByStatus = (purchaseOrders || []).reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Delivery performance
    const deliveredOrders = purchaseOrders?.filter(o => o.actual_delivery_date && o.expected_delivery_date) || []
    const onTimeDeliveries = deliveredOrders.filter(o => 
      new Date(o.actual_delivery_date) <= new Date(o.expected_delivery_date)
    ).length
    const lateDeliveries = deliveredOrders.length - onTimeDeliveries
    const avgDeliveryDays = deliveredOrders.length > 0 ? 
      Math.round(deliveredOrders.reduce((sum, order) => {
        const deliveryTime = Math.ceil((new Date(order.actual_delivery_date).getTime() - new Date(order.order_date).getTime()) / (24 * 60 * 60 * 1000))
        return sum + deliveryTime
      }, 0) / deliveredOrders.length) : 0

    // 5. Cost Analysis
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('purchase_order_items')
      .select(`
        quantity_ordered,
        unit_cost,
        total_cost,
        created_at,
        inventory_items!inner (item_name),
        purchase_orders!inner (
          created_at,
          suppliers!inner (name)
        )
      `)
      .gte('purchase_orders.created_at', startDate.toISOString())

    const totalSpend = orderItems?.reduce((sum, item) => sum + (item.total_cost || item.quantity_ordered * item.unit_cost), 0) || 0

    // Unit cost trends
    const itemCosts = (orderItems || []).reduce((acc, item) => {
      const itemName = item.inventory_items.item_name
      if (!acc[itemName]) {
        acc[itemName] = { costs: [], quantities: [] }
      }
      acc[itemName].costs.push(item.unit_cost)
      acc[itemName].quantities.push(item.quantity_ordered)
      return acc
    }, {} as Record<string, any>)

    const avgUnitCosts = Object.entries(itemCosts).map(([itemName, data]: [string, any]) => {
      const avgCost = data.costs.reduce((sum: number, cost: number) => sum + cost, 0) / data.costs.length
      const currentItem = inventoryItems?.find(item => item.item_name === itemName)
      const currentCost = currentItem?.unit_cost || avgCost
      const costChange = ((currentCost - avgCost) / avgCost) * 100
      
      return {
        item_name: itemName,
        current_cost: currentCost,
        avg_cost_30d: avgCost,
        cost_trend: costChange > 5 ? 'up' : costChange < -5 ? 'down' : 'stable' as 'up' | 'down' | 'stable',
        cost_change_percent: costChange
      }
    })

    // Spend by supplier
    const spendBySupplier = (orderItems || []).reduce((acc, item) => {
      const supplierName = item.purchase_orders.suppliers.name
      const itemTotal = item.total_cost || item.quantity_ordered * item.unit_cost
      if (!acc[supplierName]) {
        acc[supplierName] = 0
      }
      acc[supplierName] += itemTotal
      return acc
    }, {} as Record<string, number>)

    const supplierSpendData = Object.entries(spendBySupplier).map(([name, spend]) => ({
      supplier_name: name,
      total_spend: spend,
      percentage_of_total: totalSpend > 0 ? (spend / totalSpend) * 100 : 0
    })).sort((a, b) => b.total_spend - a.total_spend)

    // Mock spend by category (you could enhance this with actual categories)
    const spendByCategory = [
      { category: 'Food & Beverages', total_spend: totalSpend * 0.7, percentage_of_total: 70 },
      { category: 'Packaging', total_spend: totalSpend * 0.15, percentage_of_total: 15 },
      { category: 'Supplies', total_spend: totalSpend * 0.15, percentage_of_total: 15 }
    ]

    // 6. Trends (simplified - you could enhance with actual monthly data)
    const monthlyData = {
      monthly_inventory_value: [
        { month: 'Last Month', value: totalValue * 0.9 },
        { month: 'This Month', value: totalValue }
      ],
      monthly_stock_movements: [
        { month: 'Last Month', inbound: Math.round(inboundMovements * 0.8), outbound: Math.round(outboundMovements * 0.8) },
        { month: 'This Month', inbound: inboundMovements, outbound: outboundMovements }
      ],
      monthly_purchase_orders: [
        { month: 'Last Month', orders: Math.round(totalOrdersInPeriod * 0.7), value: Math.round(totalValueInPeriod * 0.7) },
        { month: 'This Month', orders: totalOrdersInPeriod, value: totalValueInPeriod }
      ]
    }

    // Calculate inventory turnover (simplified)
    const inventoryTurnover = totalValue > 0 ? (outboundQuantity * 10) / totalValue : 0 // Simplified calculation
    const daysOfInventory = inventoryTurnover > 0 ? 365 / inventoryTurnover : 0

    const analyticsData = {
      inventory_overview: {
        total_items: totalItems,
        total_value: totalValue,
        low_stock_items: lowStockItems,
        critical_stock_items: criticalStockItems,
        out_of_stock_items: outOfStockItems,
        average_stock_level: averageStockLevel,
        inventory_turnover_rate: inventoryTurnover,
        days_of_inventory: daysOfInventory
      },
      stock_movements: {
        total_movements_30d: totalMovements,
        inbound_movements_30d: inboundMovements,
        outbound_movements_30d: outboundMovements,
        net_change_30d: netChange,
        top_consumed_items: Object.values(consumedItems).sort((a: any, b: any) => b.total_consumed - a.total_consumed),
        top_restocked_items: Object.values(restockedItems).sort((a: any, b: any) => b.total_restocked - a.total_restocked)
      },
      supplier_metrics: {
        total_suppliers: totalSuppliers,
        active_suppliers: activeSuppliers,
        top_suppliers_by_orders: topSuppliers,
        supplier_performance: supplierPerformance
      },
      purchase_orders: {
        total_orders_30d: totalOrdersInPeriod,
        total_value_30d: totalValueInPeriod,
        avg_order_value: avgOrderValue,
        orders_by_status: {
          draft: ordersByStatus.draft || 0,
          sent: ordersByStatus.sent || 0,
          confirmed: ordersByStatus.confirmed || 0,
          received: ordersByStatus.received || 0,
          cancelled: ordersByStatus.cancelled || 0
        },
        delivery_performance: {
          on_time_deliveries: onTimeDeliveries,
          late_deliveries: lateDeliveries,
          avg_delivery_days: avgDeliveryDays
        }
      },
      cost_analysis: {
        total_spend_30d: totalSpend,
        avg_unit_costs: avgUnitCosts,
        spend_by_supplier: supplierSpendData,
        spend_by_category: spendByCategory
      },
      trends: monthlyData
    }

    console.log('✅ Successfully generated inventory analytics')

    return NextResponse.json({
      success: true,
      data: analyticsData,
      range: range,
      generated_at: new Date().toISOString(),
      message: 'Inventory analytics generated successfully'
    })

  } catch (error) {
    console.error('Failed to generate inventory analytics:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate inventory analytics', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}