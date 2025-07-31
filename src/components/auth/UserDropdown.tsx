'use client'

import { useState, useRef, useEffect } from 'react'
import { User, Settings, LogOut, ChevronDown, Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import UserAvatar from './UserAvatar'
import Link from 'next/link'

interface UserDropdownProps {
  user: { id: string; email?: string; user_metadata?: { full_name?: string } }
}

const UserDropdown = ({ user }: UserDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setIsOpen(false)
  }

  const fullName = user.user_metadata?.full_name || user.email || 'User'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 transition-colors"
      >
        <UserAvatar user={user} size="sm" />
        <span className="hidden md:block text-sm font-medium text-gray-700 max-w-32 truncate">
          {fullName}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{fullName}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          
          <Link
            href="/profile"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
          
          <Link
            href="/orders"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Receipt className="h-4 w-4" />
            Order History
          </Link>
          
          <Link
            href="/profile"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

export default UserDropdown