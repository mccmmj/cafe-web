'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Calendar,
  AlertTriangle,
  Building2,
  RefreshCw,
  Download,
  Eye,
  Activity,
  ShoppingCart,
  Truck
} from 'lucide-react'

interface AnalyticsData {
  inventory_overview: {
    total_items: number
    total_value: number
    low_stock_items: number
    critical_stock_items: number
    out_of_stock_items: number
    average_stock_level: number
    inventory_turnover_rate: number
    days_of_inventory: number
  }
  stock_movements: {
    total_movements_30d: number
    inbound_movements_30d: number
    outbound_movements_30d: number
    net_change_30d: number
    top_consumed_items: Array<{
      item_name: string
      total_consumed: number
      unit_type: string
      frequency: number
    }>
    top_restocked_items: Array<{
      item_name: string
      total_restocked: number
      unit_type: string
      frequency: number
    }>
  }
  supplier_metrics: {
    total_suppliers: number
    active_suppliers: number
    top_suppliers_by_orders: Array<{
      supplier_name: string
      total_orders: number
      total_value: number
      avg_delivery_days: number
      on_time_percentage: number
    }>
    supplier_performance: Array<{
      supplier_name: string
      orders_sent: number
      orders_received: number
      orders_overdue: number
      avg_cost_per_order: number
    }>
  }
  purchase_orders: {
    total_orders_30d: number
    total_value_30d: number
    avg_order_value: number
    orders_by_status: {
      draft: number
      sent: number
      confirmed: number
      received: number
      cancelled: number
    }
    delivery_performance: {
      on_time_deliveries: number
      late_deliveries: number
      avg_delivery_days: number
    }
  }
  cost_analysis: {
    total_spend_30d: number
    avg_unit_costs: Array<{
      item_name: string
      current_cost: number
      avg_cost_30d: number
      cost_trend: 'up' | 'down' | 'stable'
      cost_change_percent: number
    }>
    spend_by_supplier: Array<{
      supplier_name: string
      total_spend: number
      percentage_of_total: number
    }>
    spend_by_category: Array<{
      category: string
      total_spend: number
      percentage_of_total: number
    }>
  }
  trends: {
    monthly_inventory_value: Array<{
      month: string
      value: number
    }>
    monthly_stock_movements: Array<{
      month: string
      inbound: number
      outbound: number
    }>
    monthly_purchase_orders: Array<{
      month: string
      orders: number
      value: number
    }>
  }
}

const InventoryAnalytics = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState('30d') // 7d, 30d, 90d, 1y
  
  // Fetch analytics data
  const { data: analyticsData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-inventory-analytics', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/inventory/analytics?range=${dateRange}`)
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }
      return response.json()
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })

  const analytics: AnalyticsData = analyticsData?.data || {
    inventory_overview: {
      total_items: 0,
      total_value: 0,
      low_stock_items: 0,
      critical_stock_items: 0,
      out_of_stock_items: 0,
      average_stock_level: 0,
      inventory_turnover_rate: 0,
      days_of_inventory: 0
    },
    stock_movements: {
      total_movements_30d: 0,
      inbound_movements_30d: 0,
      outbound_movements_30d: 0,
      net_change_30d: 0,
      top_consumed_items: [],
      top_restocked_items: []
    },
    supplier_metrics: {
      total_suppliers: 0,
      active_suppliers: 0,
      top_suppliers_by_orders: [],
      supplier_performance: []
    },
    purchase_orders: {
      total_orders_30d: 0,
      total_value_30d: 0,
      avg_order_value: 0,
      orders_by_status: { draft: 0, sent: 0, confirmed: 0, received: 0, cancelled: 0 },
      delivery_performance: { on_time_deliveries: 0, late_deliveries: 0, avg_delivery_days: 0 }
    },
    cost_analysis: {
      total_spend_30d: 0,
      avg_unit_costs: [],
      spend_by_supplier: [],
      spend_by_category: []
    },
    trends: {
      monthly_inventory_value: [],
      monthly_stock_movements: [],
      monthly_purchase_orders: []
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />
      default: return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const exportAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/inventory/analytics/export?range=${dateRange}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `inventory-analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to export analytics:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center text-red-600">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-medium mb-2">Failed to Load Analytics</h3>
          <p className="text-red-500 mb-4">{(error as Error).message}</p>
          <Button onClick={() => refetch()} className="bg-primary-600 hover:bg-primary-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <BarChart3 className="w-6 h-6 mr-2 text-primary-600" />
            Inventory Analytics
          </h2>
          <p className="text-gray-600 mt-1">Insights and metrics for inventory performance</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Range Filter */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          
          <Button
            onClick={exportAnalytics}
            className="bg-primary-600 hover:bg-primary-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Movements
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Costs
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.inventory_overview.total_items}</p>
                  <p className="text-xs text-gray-500 mt-1">Active inventory items</p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.inventory_overview.total_value)}</p>
                  <p className="text-xs text-gray-500 mt-1">Current stock value</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-amber-600">{analytics.inventory_overview.low_stock_items}</p>
                  <p className="text-xs text-gray-500 mt-1">Need reordering</p>
                </div>
                <TrendingDown className="w-8 h-8 text-amber-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Critical Stock</p>
                  <p className="text-2xl font-bold text-red-600">{analytics.inventory_overview.critical_stock_items}</p>
                  <p className="text-xs text-gray-500 mt-1">Urgent attention needed</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Stock Level</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.inventory_overview.average_stock_level.toFixed(1)}</p>
                  <p className="text-xs text-gray-500 mt-1">Units per item</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Turnover Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.inventory_overview.inventory_turnover_rate.toFixed(1)}x</p>
                  <p className="text-xs text-gray-500 mt-1">Times per period</p>
                </div>
                <Activity className="w-8 h-8 text-indigo-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Days of Inventory</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(analytics.inventory_overview.days_of_inventory)}</p>
                  <p className="text-xs text-gray-500 mt-1">Days until depleted</p>
                </div>
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">{analytics.inventory_overview.out_of_stock_items}</p>
                  <p className="text-xs text-gray-500 mt-1">Items at zero</p>
                </div>
                <Package className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Stock Status Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Status Distribution</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.inventory_overview.total_items - analytics.inventory_overview.low_stock_items - analytics.inventory_overview.critical_stock_items - analytics.inventory_overview.out_of_stock_items}
                </div>
                <div className="text-sm text-gray-600">Good Stock</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ 
                      width: `${((analytics.inventory_overview.total_items - analytics.inventory_overview.low_stock_items - analytics.inventory_overview.critical_stock_items - analytics.inventory_overview.out_of_stock_items) / analytics.inventory_overview.total_items * 100) || 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{analytics.inventory_overview.low_stock_items}</div>
                <div className="text-sm text-gray-600">Low Stock</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-amber-600 h-2 rounded-full" 
                    style={{ 
                      width: `${(analytics.inventory_overview.low_stock_items / analytics.inventory_overview.total_items * 100) || 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{analytics.inventory_overview.critical_stock_items}</div>
                <div className="text-sm text-gray-600">Critical</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ 
                      width: `${(analytics.inventory_overview.critical_stock_items / analytics.inventory_overview.total_items * 100) || 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{analytics.inventory_overview.out_of_stock_items}</div>
                <div className="text-sm text-gray-600">Out of Stock</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gray-600 h-2 rounded-full" 
                    style={{ 
                      width: `${(analytics.inventory_overview.out_of_stock_items / analytics.inventory_overview.total_items * 100) || 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Stock Movements Tab */}
        <TabsContent value="movements" className="space-y-6">
          {/* Movement Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Movements</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.stock_movements.total_movements_30d}</p>
                  <p className="text-xs text-gray-500 mt-1">{dateRange === '7d' ? 'Last 7 days' : dateRange === '30d' ? 'Last 30 days' : dateRange === '90d' ? 'Last 90 days' : 'Last year'}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inbound</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.stock_movements.inbound_movements_30d}</p>
                  <p className="text-xs text-gray-500 mt-1">Stock received</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Outbound</p>
                  <p className="text-2xl font-bold text-red-600">{analytics.stock_movements.outbound_movements_30d}</p>
                  <p className="text-xs text-gray-500 mt-1">Stock consumed</p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Change</p>
                  <p className={`text-2xl font-bold ${analytics.stock_movements.net_change_30d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.stock_movements.net_change_30d >= 0 ? '+' : ''}{analytics.stock_movements.net_change_30d}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Overall change</p>
                </div>
                {analytics.stock_movements.net_change_30d >= 0 ? 
                  <TrendingUp className="w-8 h-8 text-green-600" /> : 
                  <TrendingDown className="w-8 h-8 text-red-600" />
                }
              </div>
            </div>
          </div>

          {/* Top Consumed and Restocked Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Consumed Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <TrendingDown className="w-5 h-5 mr-2 text-red-600" />
                Most Consumed Items
              </h3>
              
              <div className="space-y-3">
                {analytics.stock_movements.top_consumed_items.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.item_name}</p>
                      <p className="text-xs text-gray-500">{item.frequency} movements</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">{item.total_consumed} {item.unit_type}</p>
                    </div>
                  </div>
                ))}
                
                {analytics.stock_movements.top_consumed_items.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No consumption data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Most Restocked Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Most Restocked Items
              </h3>
              
              <div className="space-y-3">
                {analytics.stock_movements.top_restocked_items.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.item_name}</p>
                      <p className="text-xs text-gray-500">{item.frequency} movements</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">+{item.total_restocked} {item.unit_type}</p>
                    </div>
                  </div>
                ))}
                
                {analytics.stock_movements.top_restocked_items.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No restock data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-6">
          {/* Supplier Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Suppliers</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.supplier_metrics.total_suppliers}</p>
                  <p className="text-xs text-gray-500 mt-1">In database</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Suppliers</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.supplier_metrics.active_suppliers}</p>
                  <p className="text-xs text-gray-500 mt-1">Currently active</p>
                </div>
                <Building2 className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Utilization Rate</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {analytics.supplier_metrics.total_suppliers > 0 ? 
                      formatPercent((analytics.supplier_metrics.active_suppliers / analytics.supplier_metrics.total_suppliers) * 100) : 
                      '0%'
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Active vs total</p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary-600" />
              </div>
            </div>
          </div>

          {/* Top Suppliers and Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Suppliers by Orders */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Truck className="w-5 h-5 mr-2 text-primary-600" />
                Top Suppliers by Orders
              </h3>
              
              <div className="space-y-3">
                {analytics.supplier_metrics.top_suppliers_by_orders.slice(0, 5).map((supplier, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{supplier.supplier_name}</p>
                      <p className="text-xs text-gray-500">
                        Avg delivery: {supplier.avg_delivery_days} days • On-time: {formatPercent(supplier.on_time_percentage)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary-600">{supplier.total_orders} orders</p>
                      <p className="text-xs text-gray-500">{formatCurrency(supplier.total_value)}</p>
                    </div>
                  </div>
                ))}
                
                {analytics.supplier_metrics.top_suppliers_by_orders.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No supplier order data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Supplier Performance */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-primary-600" />
                Supplier Performance
              </h3>
              
              <div className="space-y-3">
                {analytics.supplier_metrics.supplier_performance.slice(0, 5).map((supplier, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900">{supplier.supplier_name}</p>
                      <p className="text-sm font-medium text-primary-600">
                        {formatCurrency(supplier.avg_cost_per_order)} avg
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">{supplier.orders_sent}</div>
                        <div className="text-gray-500">Sent</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{supplier.orders_received}</div>
                        <div className="text-gray-500">Received</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-red-600">{supplier.orders_overdue}</div>
                        <div className="text-gray-500">Overdue</div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {analytics.supplier_metrics.supplier_performance.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No supplier performance data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          {/* Order Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.purchase_orders.total_orders_30d}</p>
                  <p className="text-xs text-gray-500 mt-1">{dateRange === '7d' ? 'Last 7 days' : dateRange === '30d' ? 'Last 30 days' : dateRange === '90d' ? 'Last 90 days' : 'Last year'}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics.purchase_orders.total_value_30d)}</p>
                  <p className="text-xs text-gray-500 mt-1">Order value</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                  <p className="text-2xl font-bold text-primary-600">{formatCurrency(analytics.purchase_orders.avg_order_value)}</p>
                  <p className="text-xs text-gray-500 mt-1">Per order</p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Delivery</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.purchase_orders.delivery_performance.avg_delivery_days}</p>
                  <p className="text-xs text-gray-500 mt-1">Days</p>
                </div>
                <Truck className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Order Status and Delivery Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders by Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2 text-primary-600" />
                Orders by Status
              </h3>
              
              <div className="space-y-3">
                {Object.entries(analytics.purchase_orders.orders_by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        status === 'draft' ? 'bg-gray-400' :
                        status === 'sent' ? 'bg-blue-400' :
                        status === 'confirmed' ? 'bg-yellow-400' :
                        status === 'received' ? 'bg-green-400' :
                        'bg-red-400'
                      }`}></div>
                      <span className="font-medium text-gray-900 capitalize">{status}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Performance */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Truck className="w-5 h-5 mr-2 text-primary-600" />
                Delivery Performance
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-3 bg-green-400"></div>
                    <span className="font-medium text-gray-900">On-Time Deliveries</span>
                  </div>
                  <span className="font-semibold text-green-600">{analytics.purchase_orders.delivery_performance.on_time_deliveries}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-3 bg-red-400"></div>
                    <span className="font-medium text-gray-900">Late Deliveries</span>
                  </div>
                  <span className="font-semibold text-red-600">{analytics.purchase_orders.delivery_performance.late_deliveries}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-3 bg-blue-400"></div>
                    <span className="font-medium text-gray-900">Average Delivery Time</span>
                  </div>
                  <span className="font-semibold text-blue-600">{analytics.purchase_orders.delivery_performance.avg_delivery_days} days</span>
                </div>

                {(analytics.purchase_orders.delivery_performance.on_time_deliveries + analytics.purchase_orders.delivery_performance.late_deliveries) > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>On-Time Rate</span>
                      <span>
                        {formatPercent((analytics.purchase_orders.delivery_performance.on_time_deliveries / 
                        (analytics.purchase_orders.delivery_performance.on_time_deliveries + analytics.purchase_orders.delivery_performance.late_deliveries)) * 100)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ 
                          width: `${(analytics.purchase_orders.delivery_performance.on_time_deliveries / 
                          (analytics.purchase_orders.delivery_performance.on_time_deliveries + analytics.purchase_orders.delivery_performance.late_deliveries)) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Cost Analysis Tab */}
        <TabsContent value="costs" className="space-y-6">
          {/* Cost Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Spend</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.cost_analysis.total_spend_30d)}</p>
                  <p className="text-xs text-gray-500 mt-1">{dateRange === '7d' ? 'Last 7 days' : dateRange === '30d' ? 'Last 30 days' : dateRange === '90d' ? 'Last 90 days' : 'Last year'}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cost Trends</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.cost_analysis.avg_unit_costs.filter(item => item.cost_trend === 'up').length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Items increasing</p>
                </div>
                <TrendingUp className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Top Suppliers</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.cost_analysis.spend_by_supplier.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Active spending</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Cost Analysis Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Unit Cost Trends */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-primary-600" />
                Unit Cost Trends
              </h3>
              
              <div className="space-y-3">
                {analytics.cost_analysis.avg_unit_costs.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.item_name}</p>
                      <div className="flex items-center mt-1">
                        {getTrendIcon(item.cost_trend)}
                        <span className={`text-xs ml-1 ${getTrendColor(item.cost_trend)}`}>
                          {item.cost_change_percent >= 0 ? '+' : ''}{item.cost_change_percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(item.current_cost)}</p>
                      <p className="text-xs text-gray-500">Avg: {formatCurrency(item.avg_cost_30d)}</p>
                    </div>
                  </div>
                ))}
                
                {analytics.cost_analysis.avg_unit_costs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No cost trend data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Spend by Supplier */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-primary-600" />
                Spend by Supplier
              </h3>
              
              <div className="space-y-3">
                {analytics.cost_analysis.spend_by_supplier.slice(0, 5).map((supplier, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{supplier.supplier_name}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full" 
                          style={{ width: `${supplier.percentage_of_total}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-primary-600">{formatCurrency(supplier.total_spend)}</p>
                      <p className="text-xs text-gray-500">{formatPercent(supplier.percentage_of_total)}</p>
                    </div>
                  </div>
                ))}
                
                {analytics.cost_analysis.spend_by_supplier.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No supplier spend data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Spend by Category */}
          {analytics.cost_analysis.spend_by_category.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2 text-primary-600" />
                Spend by Category
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics.cost_analysis.spend_by_category.map((category, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900">{category.category}</p>
                      <p className="text-sm font-medium text-primary-600">{formatPercent(category.percentage_of_total)}</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(category.total_spend)}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full" 
                        style={{ width: `${category.percentage_of_total}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default InventoryAnalytics
