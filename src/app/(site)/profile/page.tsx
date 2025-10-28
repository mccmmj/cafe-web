'use client'

import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, MapPin, Calendar, Star, Receipt, CreditCard, Settings, LogOut, Shield } from 'lucide-react'
import { Button, Input, Card, PhoneInput } from '@/components/ui'
import Navigation from '@/components/Navigation'
import Breadcrumbs from '@/components/layout/Breadcrumbs'
import { createClient } from '@/lib/supabase/client'
import { createClientDatabaseHelpers } from '@/lib/supabase/database-client'
import { toast } from 'react-hot-toast'
import TwoFactorSettings from '@/components/security/TwoFactorSettings'

interface UserProfile {
  id: string
  email: string
  name: string
  phone?: string
  loyaltyNumber?: string
  joinDate: string
  totalOrders: number
  totalSpent: number
  favoriteItems: string[]
}

interface Order {
  id: string
  date: string
  total: number
  status: 'completed' | 'cancelled' | 'pending'
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  orderType: 'pickup' | 'dine_in'
}

interface EditFormState {
  name: string
  phone: string
  email: string
}

interface ProfileTabProps {
  user: UserProfile
  editForm: EditFormState
  setEditForm: Dispatch<SetStateAction<EditFormState>>
  isEditing: boolean
  onEdit: () => void
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'preferences' | 'security'>('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [editForm, setEditForm] = useState<EditFormState>({
    name: '',
    phone: '',
    email: '',
  })

  const supabase = useMemo(() => createClient(), [])
  const db = useMemo(() => createClientDatabaseHelpers(), [])

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        const { data: authUser } = await supabase.auth.getUser()

        if (!authUser.user) {
          if (!isMounted) return

          setUser(mockUserProfile)
          setEditForm({
            name: mockUserProfile.name,
            phone: mockUserProfile.phone || '',
            email: mockUserProfile.email,
          })
        } else {
          const profile = await db.getMyProfile()
          if (!isMounted) return

          const userProfile: UserProfile = {
            id: authUser.user.id,
            email: authUser.user.email ?? '',
            name: profile?.full_name || authUser.user.user_metadata?.full_name || 'User',
            phone: profile?.phone || authUser.user.user_metadata?.phone,
            loyaltyNumber: `LC${authUser.user.id.slice(0, 8).toUpperCase()}`,
            joinDate: authUser.user.created_at,
            totalOrders: 0,
            totalSpent: 0,
            favoriteItems: [],
          }

          setUser(userProfile)
          setEditForm({
            name: userProfile.name,
            phone: userProfile.phone || '',
            email: userProfile.email,
          })
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        if (isMounted) {
          setUser(mockUserProfile)
        }
      } finally {
        if (isMounted) {
          setOrders(mockOrders)
          setIsLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      isMounted = false
    }
  }, [db, supabase])

  const handleEditProfile = async () => {
    if (!isEditing) {
      setIsEditing(true)
      return
    }

    try {
      // Update profile
      if (user) {
        await db.updateMyProfile({
          fullName: editForm.name,
          phone: editForm.phone
        })
        
        const updatedUser = {
          ...user,
          name: editForm.name,
          phone: editForm.phone,
          email: editForm.email,
        }
        setUser(updatedUser)
        toast.success('Profile updated successfully!')
      }
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error('Failed to update profile')
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Signed out successfully')
      // Redirect to home page
      window.location.href = '/'
    } catch (error) {
      console.error('Failed to sign out:', error)
      toast.error('Failed to sign out')
    }
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card variant="default" className="p-8 max-w-md mx-4">
          <div className="text-center">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in required</h2>
            <p className="text-gray-600 mb-6">Please sign in to view your profile</p>
            <Button variant="primary" onClick={() => window.location.href = '/'}>
              Go to Sign In
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <Breadcrumbs />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Account</h1>
          <p className="text-gray-600">Manage your profile, orders, and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card variant="default" className="p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
                {user.loyaltyNumber && (
                  <div className="mt-2 inline-flex items-center px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                    <Star className="w-3 h-3 mr-1" />
                    {user.loyaltyNumber}
                  </div>
                )}
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'profile' 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <User className="w-4 h-4 inline mr-3" />
                  Profile
                </button>
                
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'orders' 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Receipt className="w-4 h-4 inline mr-3" />
                  Order History
                </button>
                
                <button
                  onClick={() => setActiveTab('preferences')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'preferences' 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Settings className="w-4 h-4 inline mr-3" />
                  Preferences
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'security'
                      ? 'bg-amber-100 text-amber-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Shield className="w-4 h-4 inline mr-3" />
                  Security
                </button>
              </nav>

              <div className="mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={handleSignOut}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'profile' && (
                <ProfileTab 
                  user={user}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  isEditing={isEditing}
                  onEdit={handleEditProfile}
                />
              )}
              
              {activeTab === 'orders' && (
                <OrdersTab orders={orders} />
              )}
              
              {activeTab === 'preferences' && (
                <PreferencesTab />
              )}

              {activeTab === 'security' && (
                <TwoFactorSettings />
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Profile Tab Component
function ProfileTab({ user, editForm, setEditForm, isEditing, onEdit }: ProfileTabProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="outline" className="p-6 text-center">
          <Receipt className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{user.totalOrders}</div>
          <div className="text-sm text-gray-600">Total Orders</div>
        </Card>
        
        <Card variant="outline" className="p-6 text-center">
          <CreditCard className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">${user.totalSpent.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Spent</div>
        </Card>
        
        <Card variant="outline" className="p-6 text-center">
          <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {new Date(user.joinDate).getFullYear()}
          </div>
          <div className="text-sm text-gray-600">Member Since</div>
        </Card>
      </div>

      {/* Profile Information */}
      <Card variant="default" className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
          <Button
            variant={isEditing ? "primary" : "outline"}
            onClick={onEdit}
          >
            {isEditing ? 'Save Changes' : 'Edit Profile'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            {isEditing ? (
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            ) : (
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-400" />
                <span>{user.name}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            {isEditing ? (
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                disabled
              />
            ) : (
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{user.email}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            {isEditing ? (
              <PhoneInput
                value={editForm.phone}
                onChange={(value) => setEditForm({ ...editForm, phone: value })}
                placeholder="(555) 123-4567"
              />
            ) : (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{user.phone || 'Not provided'}</span>
              </div>
            )}
          </div>

          {user.loyaltyNumber && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loyalty Number
              </label>
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-amber-600" />
                <span className="font-mono">{user.loyaltyNumber}</span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// Orders Tab Component
function OrdersTab({ orders }: { orders: Order[] }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Order History</h3>
        <div className="text-sm text-gray-600">
          {orders.length} order{orders.length !== 1 ? 's' : ''}
        </div>
      </div>

      {orders.length === 0 ? (
        <Card variant="outline" className="p-8 text-center">
          <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h4>
          <p className="text-gray-600 mb-6">Start by placing your first order!</p>
          <Button variant="primary" onClick={() => window.location.href = '/'}>
            Browse Menu
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} variant="default" className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900">Order #{order.id}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(order.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {order.orderType === 'pickup' ? 'Pickup' : 'Dine In'}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">${order.total.toFixed(2)}</div>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm">
                  Reorder
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Preferences Tab Component
function PreferencesTab() {
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    orderReminders: true,
    promotionalEmails: true,
    dietaryRestrictions: [] as string[],
    favoriteLocation: 'kaiser-denver',
  })

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Preferences</h3>

      {/* Notifications */}
      <Card variant="default" className="p-6">
        <h4 className="font-medium text-gray-900 mb-4">Notifications</h4>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-gray-700">Email notifications</span>
            <input
              type="checkbox"
              checked={preferences.emailNotifications}
              onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <span className="text-gray-700">SMS notifications</span>
            <input
              type="checkbox"
              checked={preferences.smsNotifications}
              onChange={(e) => setPreferences({ ...preferences, smsNotifications: e.target.checked })}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <span className="text-gray-700">Order ready reminders</span>
            <input
              type="checkbox"
              checked={preferences.orderReminders}
              onChange={(e) => setPreferences({ ...preferences, orderReminders: e.target.checked })}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <span className="text-gray-700">Promotional emails</span>
            <input
              type="checkbox"
              checked={preferences.promotionalEmails}
              onChange={(e) => setPreferences({ ...preferences, promotionalEmails: e.target.checked })}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
          </label>
        </div>
      </Card>

      {/* Dietary Restrictions */}
      <Card variant="default" className="p-6">
        <h4 className="font-medium text-gray-900 mb-4">Dietary Restrictions</h4>
        <p className="text-sm text-gray-600 mb-4">
          Select any dietary restrictions to help us recommend suitable items.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Keto'].map((restriction) => (
            <label key={restriction} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={preferences.dietaryRestrictions.includes(restriction)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPreferences({
                      ...preferences,
                      dietaryRestrictions: [...preferences.dietaryRestrictions, restriction]
                    })
                  } else {
                    setPreferences({
                      ...preferences,
                      dietaryRestrictions: preferences.dietaryRestrictions.filter(r => r !== restriction)
                    })
                  }
                }}
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm text-gray-700">{restriction}</span>
            </label>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary">Save Preferences</Button>
      </div>
    </div>
  )
}

// Mock data
const mockUserProfile: UserProfile = {
  id: 'mock-user-id',
  email: 'john.doe@example.com',
  name: 'John Doe',
  phone: '(555) 123-4567',
  loyaltyNumber: 'LC12345678',
  joinDate: '2023-01-15T00:00:00Z',
  totalOrders: 24,
  totalSpent: 186.50,
  favoriteItems: ['Signature Latte', 'Avocado Toast', 'Blueberry Muffin'],
}

const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    date: '2024-01-15T10:30:00Z',
    total: 12.45,
    status: 'completed',
    orderType: 'pickup',
    items: [
      { name: 'Signature Latte', quantity: 1, price: 4.95 },
      { name: 'Blueberry Muffin', quantity: 2, price: 3.25 },
    ],
  },
  {
    id: 'ORD-002',
    date: '2024-01-10T14:15:00Z',
    total: 18.95,
    status: 'completed',
    orderType: 'dine_in',
    items: [
      { name: 'Chicken Caesar Wrap', quantity: 1, price: 9.95 },
      { name: 'Green Smoothie', quantity: 1, price: 6.75 },
    ],
  },
]
