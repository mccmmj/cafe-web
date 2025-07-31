'use client'

import { ReactNode } from 'react'
import Breadcrumbs from './Breadcrumbs'

interface PageContainerProps {
  children: ReactNode
  showBreadcrumbs?: boolean
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl'
}

const PageContainer = ({ 
  children, 
  showBreadcrumbs = true, 
  className = '',
  maxWidth = '7xl'
}: PageContainerProps) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '7xl': 'max-w-7xl'
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className={`${maxWidthClasses[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
        {showBreadcrumbs && <Breadcrumbs />}
        <div className={className}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default PageContainer