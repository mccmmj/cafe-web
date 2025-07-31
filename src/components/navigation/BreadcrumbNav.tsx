'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  name: string
  href: string
  icon?: React.ReactNode
}

interface BreadcrumbNavProps {
  className?: string
  customBreadcrumbs?: BreadcrumbItem[]
}

const PAGE_TITLES: Record<string, string> = {
  'menu': 'Menu',
  'about': 'About Us',
  'gallery': 'Gallery',
  'contact': 'Contact',
  'cart': 'Shopping Cart',
  'profile': 'My Profile',
  'auth': 'Sign In',
  'test': 'System Test',
  'admin': 'Admin Dashboard',
  'orders': 'Order History',
  'checkout': 'Checkout'
}

export default function BreadcrumbNav({ className = '', customBreadcrumbs }: BreadcrumbNavProps) {
  const pathname = usePathname()
  
  // Generate breadcrumb paths
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customBreadcrumbs) return customBreadcrumbs
    
    const paths = pathname.split('/').filter(Boolean)
    
    const breadcrumbs: BreadcrumbItem[] = [
      { name: 'Home', href: '/', icon: <Home className="h-4 w-4" /> }
    ]
    
    let currentPath = ''
    for (const path of paths) {
      currentPath += `/${path}`
      const name = PAGE_TITLES[path] || path.charAt(0).toUpperCase() + path.slice(1)
      breadcrumbs.push({
        name,
        href: currentPath
      })
    }
    
    return breadcrumbs
  }
  
  const breadcrumbs = generateBreadcrumbs()
  
  // Don't show breadcrumbs on home page
  if (pathname === '/' && !customBreadcrumbs) return null
  
  return (
    <nav className={`bg-white border-b border-gray-200 pt-16 ${className}`} aria-label="Breadcrumb">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <ol className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((breadcrumb, index) => (
            <li key={breadcrumb.href} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-gray-400 mx-2 flex-shrink-0" />
              )}
              {index === breadcrumbs.length - 1 ? (
                <span className="text-gray-900 font-medium flex items-center">
                  {breadcrumb.icon && <span className="mr-1">{breadcrumb.icon}</span>}
                  {breadcrumb.name}
                </span>
              ) : (
                <Link
                  href={breadcrumb.href}
                  className="text-gray-500 hover:text-amber-600 transition-colors flex items-center hover:underline"
                >
                  {breadcrumb.icon && <span className="mr-1">{breadcrumb.icon}</span>}
                  {breadcrumb.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}