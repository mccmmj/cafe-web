'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createClientDatabaseHelpers } from '@/lib/supabase/database-client'
import { User, Mail, Phone, Save, Heart, Clock, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()
  const db = createClientDatabaseHelpers()
  
  useEffect(() => {
    async function loadUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/')
          return
        }
        
        setUser(user)
        const profile = await db.getMyProfile()
        setProfile(profile || {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          phone: user.user_metadata?.phone || ''
        })
      } catch (error) {
        setError('Failed to load profile')
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadUserProfile()
  }, [supabase.auth, db, router])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    
    try {
      await db.updateMyProfile({
        full_name: profile.full_name,
        phone: profile.phone
      })
      setSuccess('Profile updated successfully!')
    } catch (error) {
      setError('Failed to update profile')
      console.error('Error updating profile:', error)
    } finally {
      setSaving(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-20">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="space-y-3">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Cafe
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-amber-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">My Profile</h1>
            <p className="text-amber-100">Manage your account information</p>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    id="email"
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    id="fullName"
                    type="text"
                    value={profile?.full_name || ''}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    id="phone"
                    type="tel"
                    value={profile?.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center bg-amber-600 text-white px-6 py-2 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Clock className="h-6 w-6 text-amber-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Order History</h3>
            </div>
            <p className="text-gray-600 mb-4">View your past orders and reorder favorites</p>
            <button className="text-amber-600 hover:text-amber-700 font-medium">
              View Orders →
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Heart className="h-6 w-6 text-amber-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Favorites</h3>
            </div>
            <p className="text-gray-600 mb-4">Manage your favorite menu items</p>
            <button className="text-amber-600 hover:text-amber-700 font-medium">
              View Favorites →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}