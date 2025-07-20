'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, LogOut, Heart, Clock, Settings } from 'lucide-react'

interface UserMenuProps {
  user: {
    id: string
    email?: string
    user_metadata?: {
      full_name?: string
    }
  }
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setIsOpen(false)
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-gray-700 hover:text-amber-600 p-2 rounded-md transition-colors group"
        title={displayName}
      >
        <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {displayName}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false)
                // TODO: Navigate to order history
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Clock className="h-4 w-4 mr-3" />
              Order History
            </button>
            
            <button
              onClick={() => {
                setIsOpen(false)
                // TODO: Navigate to favorites
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Heart className="h-4 w-4 mr-3" />
              Favorites
            </button>
            
            <button
              onClick={() => {
                setIsOpen(false)
                window.location.href = '/profile'
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Settings className="h-4 w-4 mr-3" />
              Profile Settings
            </button>
          </div>
          
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4 mr-3" />
              {loading ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}