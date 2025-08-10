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

    console.log('Exporting inventory analytics for range:', range)

    // Fetch all relevant data for export
    const [inventoryResult, movementsResult, ordersResult, suppliersResult] = await Promise.all([
      supabase
        .from('inventory_items')
        .select('item_name, current_stock, minimum_threshold, reorder_point, unit_cost, unit_type, location, supplier_name, notes'),
      
      supabase
        .from('stock_movements')
        .select(`
          created_at,
          movement_type,
          quantity_change,
          reference_type,
          notes,
          inventory_items!inner (item_name, unit_type)
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),
      
      supabase
        .from('purchase_orders')
        .select(`
          order_number,
          status,
          order_date,
          expected_delivery_date,
          actual_delivery_date,
          total_amount,
          suppliers!inner (name)
        `)
        .gte('created_at', startDate.toISOString())
        .order('order_date', { ascending: false }),
      
      supabase
        .from('suppliers')
        .select('name, contact_person, email, phone, is_active, created_at')
        .order('name')
    ])

    // Build CSV content
    const csvSections = []

    // Inventory Overview Section
    csvSections.push('INVENTORY OVERVIEW')
    csvSections.push('Item Name,Current Stock,Unit Type,Unit Cost,Value,Status,Min Threshold,Reorder Point,Location,Supplier,Notes')
    
    if (inventoryResult.data) {
      inventoryResult.data.forEach(item => {
        const value = item.current_stock * item.unit_cost
        const status = item.current_stock === 0 ? 'Out of Stock' :
                     item.current_stock <= item.minimum_threshold ? 'Critical' :
                     item.current_stock <= item.reorder_point ? 'Low Stock' : 'Good'
        
        csvSections.push([
          `"${item.item_name}"`,
          item.current_stock,
          `"${item.unit_type}"`,
          item.unit_cost.toFixed(2),
          value.toFixed(2),
          `"${status}"`,
          item.minimum_threshold,
          item.reorder_point,
          `"${item.location || ''}"`,
          `"${item.supplier_name || ''}"`,
          `"${item.notes || ''}"`
        ].join(','))
      })
    }

    csvSections.push('')
    csvSections.push('')

    // Stock Movements Section
    csvSections.push('STOCK MOVEMENTS')
    csvSections.push('Date,Time,Item Name,Movement Type,Quantity,Unit Type,Reference Type,Notes')
    
    if (movementsResult.data) {
      movementsResult.data.forEach(movement => {
        const date = new Date(movement.created_at)
        csvSections.push([
          date.toLocaleDateString(),
          date.toLocaleTimeString(),
          `"${movement.inventory_items.item_name}"`,
          movement.movement_type.toUpperCase(),
          movement.quantity_change,
          `"${movement.inventory_items.unit_type}"`,
          `"${movement.reference_type || ''}"`,
          `"${movement.notes || ''}"`
        ].join(','))
      })
    }

    csvSections.push('')
    csvSections.push('')

    // Purchase Orders Section
    csvSections.push('PURCHASE ORDERS')
    csvSections.push('Order Number,Supplier,Status,Order Date,Expected Delivery,Actual Delivery,Total Amount,Delivery Performance')
    
    if (ordersResult.data) {
      ordersResult.data.forEach(order => {
        const orderDate = new Date(order.order_date)
        const expectedDate = order.expected_delivery_date ? new Date(order.expected_delivery_date) : null
        const actualDate = order.actual_delivery_date ? new Date(order.actual_delivery_date) : null
        
        let deliveryPerformance = 'N/A'
        if (actualDate && expectedDate) {
          deliveryPerformance = actualDate <= expectedDate ? 'On Time' : 'Late'
        } else if (expectedDate && order.status !== 'received' && order.status !== 'cancelled') {
          deliveryPerformance = expectedDate < now ? 'Overdue' : 'Pending'
        }
        
        csvSections.push([
          `"${order.order_number}"`,
          `"${order.suppliers.name}"`,
          order.status.toUpperCase(),
          orderDate.toLocaleDateString(),
          expectedDate ? expectedDate.toLocaleDateString() : '',
          actualDate ? actualDate.toLocaleDateString() : '',
          order.total_amount.toFixed(2),
          `"${deliveryPerformance}"`
        ].join(','))
      })
    }

    csvSections.push('')
    csvSections.push('')

    // Suppliers Section
    csvSections.push('SUPPLIERS')
    csvSections.push('Name,Contact Person,Email,Phone,Status,Added Date')
    
    if (suppliersResult.data) {
      suppliersResult.data.forEach(supplier => {
        const addedDate = new Date(supplier.created_at)
        csvSections.push([
          `"${supplier.name}"`,
          `"${supplier.contact_person || ''}"`,
          `"${supplier.email || ''}"`,
          `"${supplier.phone || ''}"`,
          supplier.is_active ? 'Active' : 'Inactive',
          addedDate.toLocaleDateString()
        ].join(','))
      })
    }

    csvSections.push('')
    csvSections.push('')

    // Summary Statistics
    const totalItems = inventoryResult.data?.length || 0
    const totalValue = inventoryResult.data?.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0) || 0
    const lowStockItems = inventoryResult.data?.filter(item => 
      item.current_stock <= item.reorder_point && item.current_stock > item.minimum_threshold
    ).length || 0
    const criticalStockItems = inventoryResult.data?.filter(item => 
      item.current_stock <= item.minimum_threshold && item.current_stock > 0
    ).length || 0
    const outOfStockItems = inventoryResult.data?.filter(item => item.current_stock === 0).length || 0
    
    const totalOrders = ordersResult.data?.length || 0
    const totalOrderValue = ordersResult.data?.reduce((sum, order) => sum + order.total_amount, 0) || 0
    const totalSuppliers = suppliersResult.data?.length || 0
    const activeSuppliers = suppliersResult.data?.filter(s => s.is_active).length || 0

    csvSections.push('SUMMARY STATISTICS')
    csvSections.push('Metric,Value')
    csvSections.push(`Total Inventory Items,${totalItems}`)
    csvSections.push(`Total Inventory Value,$${totalValue.toFixed(2)}`)
    csvSections.push(`Low Stock Items,${lowStockItems}`)
    csvSections.push(`Critical Stock Items,${criticalStockItems}`)
    csvSections.push(`Out of Stock Items,${outOfStockItems}`)
    csvSections.push(`Total Purchase Orders,${totalOrders}`)
    csvSections.push(`Total Order Value,$${totalOrderValue.toFixed(2)}`)
    csvSections.push(`Total Suppliers,${totalSuppliers}`)
    csvSections.push(`Active Suppliers,${activeSuppliers}`)
    csvSections.push('')
    csvSections.push(`Report Generated,${new Date().toLocaleString()}`)
    csvSections.push(`Date Range,${range}`)

    // Join all sections
    const csvContent = csvSections.join('\n')

    console.log('✅ Successfully generated analytics export')

    // Return as downloadable CSV
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="inventory-analytics-${range}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Failed to export inventory analytics:', error)
    return NextResponse.json(
      { 
        error: 'Failed to export inventory analytics', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}