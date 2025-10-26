'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Coffee, 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Menu as MenuIcon, 
  BarChart3, 
  Users,
  Settings,
  LogOut,
  Bell,
  FileText
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Menu Management', href: '/admin/menu', icon: MenuIcon },
  { name: 'Inventory', href: '/admin/inventory', icon: Package },
  { name: 'Invoice Import', href: '/admin/invoices', icon: FileText },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export function AdminNavigation() {
  const [user, setUser] = useState<any>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'SIGNED_OUT') {
        router.push('/admin/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 bg-gray-800">
        <div className="flex items-center">
          <Coffee className="w-8 h-8 text-primary-500" />
          <span className="ml-2 text-xl font-bold text-white">Little Cafe</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-8">
        <div className="px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                  ${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-800">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.email || 'Admin User'}
            </p>
            <p className="text-xs text-gray-400">Administrator</p>
          </div>
          <button
            onClick={handleSignOut}
            className="ml-2 p-1 text-gray-400 hover:text-white transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-3 flex space-x-2">
          <Link
            href="/"
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 px-3 rounded text-center transition-colors"
          >
            View Customer Site
          </Link>
          <button className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors">
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}