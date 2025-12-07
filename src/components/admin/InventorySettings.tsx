'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { 
  Settings,
  AlertTriangle,
  Package,
  MapPin,
  Bell,
  Plus,
  Save,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface InventorySettings {
  id?: string
  global_low_stock_threshold: number
  global_critical_stock_threshold: number
  default_reorder_point_multiplier: number
  auto_create_alerts: boolean
  alert_email_notifications: boolean
  alert_email: string
  default_unit_type: string
  default_location: string
  currency: string
  enable_barcode_scanning: boolean
  enable_expiry_tracking: boolean
  require_purchase_orders: boolean
  auto_update_costs: boolean
}

interface Location {
  id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
}

interface UnitType {
  id: string
  name: string
  symbol: string
  category: string
  is_active: boolean
  created_at: string
}

const UNIT_CATEGORIES = ['Weight', 'Volume', 'Count', 'Length']
const InventorySettings = () => {
  const [activeTab, setActiveTab] = useState('general')
  const [newLocation, setNewLocation] = useState({ name: '', description: '' })
  const [newUnit, setNewUnit] = useState({ name: '', symbol: '', category: 'Count' })
  
  const queryClient = useQueryClient()

  // Fetch settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin-inventory-settings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/inventory/settings')
      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }
      return response.json()
    }
  })

  // Fetch locations
  const { data: locationsData } = useQuery({
    queryKey: ['admin-inventory-locations'],
    queryFn: async () => {
      const response = await fetch('/api/admin/inventory/locations')
      if (!response.ok) {
        throw new Error('Failed to fetch locations')
      }
      return response.json()
    }
  })

  // Fetch unit types
  const { data: unitsData } = useQuery({
    queryKey: ['admin-inventory-units'],
    queryFn: async () => {
      const response = await fetch('/api/admin/inventory/units')
      if (!response.ok) {
        throw new Error('Failed to fetch unit types')
      }
      return response.json()
    }
  })

  const settings: InventorySettings = useMemo(() => settingsData?.settings || {
    global_low_stock_threshold: 10,
    global_critical_stock_threshold: 5,
    default_reorder_point_multiplier: 2.0,
    auto_create_alerts: true,
    alert_email_notifications: false,
    alert_email: '',
    default_unit_type: 'each',
    default_location: 'main',
    currency: 'USD',
    enable_barcode_scanning: false,
    enable_expiry_tracking: false,
    require_purchase_orders: false,
    auto_update_costs: true
  }, [settingsData?.settings])

  const locations: Location[] = locationsData?.locations || []
  const units: UnitType[] = unitsData?.units || []

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: Partial<InventorySettings>) => {
      const response = await fetch('/api/admin/inventory/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save settings')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Settings saved successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-settings'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save settings')
    }
  })

  // Add location mutation
  const addLocationMutation = useMutation({
    mutationFn: async (data: { name: string, description?: string }) => {
      const response = await fetch('/api/admin/inventory/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to add location')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Location added successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-locations'] })
      setNewLocation({ name: '', description: '' })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add location')
    }
  })

  // Add unit type mutation
  const addUnitMutation = useMutation({
    mutationFn: async (data: { name: string, symbol: string, category: string }) => {
      const response = await fetch('/api/admin/inventory/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to add unit type')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Unit type added successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-units'] })
      setNewUnit({ name: '', symbol: '', category: 'Count' })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add unit type')
    }
  })

  // Toggle location active status
  const toggleLocationMutation = useMutation({
    mutationFn: async ({ locationId, isActive }: { locationId: string, isActive: boolean }) => {
      const response = await fetch(`/api/admin/inventory/locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update location')
      }

      return response.json()
    },
    onSuccess: (_, { isActive }) => {
      toast.success(`Location ${isActive ? 'activated' : 'deactivated'} successfully`)
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-locations'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update location')
    }
  })

  // Toggle unit active status
  const toggleUnitMutation = useMutation({
    mutationFn: async ({ unitId, isActive }: { unitId: string, isActive: boolean }) => {
      const response = await fetch(`/api/admin/inventory/units/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update unit type')
      }

      return response.json()
    },
    onSuccess: (_, { isActive }) => {
      toast.success(`Unit type ${isActive ? 'activated' : 'deactivated'} successfully`)
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-units'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update unit type')
    }
  })

  const [formSettings, setFormSettings] = useState(settings)

  // Update form when settings load
  React.useEffect(() => {
    setFormSettings(settings)
  }, [settings])

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(formSettings)
  }

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLocation.name.trim()) {
      toast.error('Location name is required')
      return
    }
    addLocationMutation.mutate(newLocation)
  }

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUnit.name.trim() || !newUnit.symbol.trim()) {
      toast.error('Unit name and symbol are required')
      return
    }
    addUnitMutation.mutate(newUnit)
  }

  if (settingsLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Settings className="w-6 h-6 mr-2 text-primary-600" />
            Inventory Settings
          </h2>
          <p className="text-gray-600 mt-1">Configure inventory management preferences and defaults</p>
        </div>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="units" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Units
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Default Values</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Unit Type
                </label>
                <select
                  value={formSettings.default_unit_type}
                  onChange={(e) => setFormSettings(prev => ({ ...prev, default_unit_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {units.filter(unit => unit.is_active).map(unit => (
                    <option key={unit.id} value={unit.symbol}>{unit.name} ({unit.symbol})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Location
                </label>
                <select
                  value={formSettings.default_location}
                  onChange={(e) => setFormSettings(prev => ({ ...prev, default_location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {locations.filter(loc => loc.is_active).map(location => (
                    <option key={location.id} value={location.name}>{location.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={formSettings.currency}
                  onChange={(e) => setFormSettings(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (C$)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reorder Point Multiplier
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={formSettings.default_reorder_point_multiplier}
                  onChange={(e) => setFormSettings(prev => ({ ...prev, default_reorder_point_multiplier: parseFloat(e.target.value) || 2.0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Multiplier used to calculate reorder point from minimum threshold
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <h4 className="font-medium text-gray-900">Features</h4>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formSettings.enable_barcode_scanning}
                    onChange={(e) => setFormSettings(prev => ({ ...prev, enable_barcode_scanning: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable Barcode Scanning</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formSettings.enable_expiry_tracking}
                    onChange={(e) => setFormSettings(prev => ({ ...prev, enable_expiry_tracking: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable Expiry Date Tracking</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formSettings.require_purchase_orders}
                    onChange={(e) => setFormSettings(prev => ({ ...prev, require_purchase_orders: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Require Purchase Orders for Restocking</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formSettings.auto_update_costs}
                    onChange={(e) => setFormSettings(prev => ({ ...prev, auto_update_costs: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-update Unit Costs from Purchase Orders</span>
                </label>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <Button
                onClick={handleSaveSettings}
                disabled={saveSettingsMutation.isPending}
                className="bg-primary-600 hover:bg-primary-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Alert Settings */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />
              Stock Alert Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Global Low Stock Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  value={formSettings.global_low_stock_threshold}
                  onChange={(e) => setFormSettings(prev => ({ ...prev, global_low_stock_threshold: parseInt(e.target.value) || 10 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default threshold for low stock alerts
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Global Critical Stock Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={formSettings.global_critical_stock_threshold}
                  onChange={(e) => setFormSettings(prev => ({ ...prev, global_critical_stock_threshold: parseInt(e.target.value) || 5 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default threshold for critical stock alerts
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <h4 className="font-medium text-gray-900">Alert Preferences</h4>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formSettings.auto_create_alerts}
                    onChange={(e) => setFormSettings(prev => ({ ...prev, auto_create_alerts: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Automatically Create Stock Alerts</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formSettings.alert_email_notifications}
                    onChange={(e) => setFormSettings(prev => ({ ...prev, alert_email_notifications: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Send Email Notifications for Alerts</span>
                </label>
              </div>

              {formSettings.alert_email_notifications && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Email Address
                  </label>
                  <input
                    type="email"
                    value={formSettings.alert_email}
                    onChange={(e) => setFormSettings(prev => ({ ...prev, alert_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="manager@littlecafe.com"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <Button
                onClick={handleSaveSettings}
                disabled={saveSettingsMutation.isPending}
                className="bg-primary-600 hover:bg-primary-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveSettingsMutation.isPending ? 'Saving...' : 'Save Alert Settings'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Locations */}
        <TabsContent value="locations" className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-primary-600" />
              Storage Locations
            </h3>

            {/* Add New Location */}
            <form onSubmit={handleAddLocation} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Add New Location</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Main Storage, Walk-in Cooler"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newLocation.description}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="mt-3">
                <Button
                  type="submit"
                  disabled={addLocationMutation.isPending}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addLocationMutation.isPending ? 'Adding...' : 'Add Location'}
                </Button>
              </div>
            </form>

            {/* Locations List */}
            <div className="space-y-3">
              {locations.map((location) => (
                <div key={location.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-gray-900">{location.name}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        location.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {location.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {location.description && (
                      <p className="text-sm text-gray-600 mt-1">{location.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleLocationMutation.mutate({
                        locationId: location.id,
                        isActive: !location.is_active
                      })}
                      className={location.is_active ? "text-red-600" : "text-green-600"}
                      disabled={toggleLocationMutation.isPending}
                    >
                      {location.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))}

              {locations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h4 className="text-lg font-medium mb-2">No locations configured</h4>
                  <p>Add your first storage location to get started</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Unit Types */}
        <TabsContent value="units" className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-primary-600" />
              Unit Types
            </h3>

            {/* Add New Unit Type */}
            <form onSubmit={handleAddUnit} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Add New Unit Type</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Name *
                  </label>
                  <input
                    type="text"
                    value={newUnit.name}
                    onChange={(e) => setNewUnit(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Kilograms"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Symbol *
                  </label>
                  <input
                    type="text"
                    value={newUnit.symbol}
                    onChange={(e) => setNewUnit(prev => ({ ...prev, symbol: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., kg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newUnit.category}
                    onChange={(e) => setNewUnit(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {UNIT_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <Button
                  type="submit"
                  disabled={addUnitMutation.isPending}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addUnitMutation.isPending ? 'Adding...' : 'Add Unit Type'}
                </Button>
              </div>
            </form>

            {/* Unit Types by Category */}
            <div className="space-y-6">
              {UNIT_CATEGORIES.map(category => {
                const categoryUnits = units.filter(unit => unit.category === category)
                if (categoryUnits.length === 0) return null

                return (
                  <div key={category}>
                    <h4 className="font-medium text-gray-900 mb-3">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categoryUnits.map((unit) => (
                        <div key={unit.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{unit.name}</span>
                              <span className="text-sm text-gray-500">({unit.symbol})</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                unit.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {unit.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleUnitMutation.mutate({
                              unitId: unit.id,
                              isActive: !unit.is_active
                            })}
                            className={unit.is_active ? "text-red-600" : "text-green-600"}
                            disabled={toggleUnitMutation.isPending}
                          >
                            {unit.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {units.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h4 className="text-lg font-medium mb-2">No unit types configured</h4>
                  <p>Add your first unit type to get started</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default InventorySettings
