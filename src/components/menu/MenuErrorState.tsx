'use client'

import { Button } from '@/components/ui'

interface MenuErrorStateProps {
  error: string
  onRetry: () => void
  className?: string
  showHeader?: boolean
}

const MenuErrorState = ({ error, onRetry, className = '', showHeader = true }: MenuErrorStateProps) => {
  return (
    <section className={showHeader ? `py-20 bg-gray-50 ${className}` : `py-8 bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Menu Temporarily Unavailable</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={onRetry}>
            Try Again
          </Button>
        </div>
      </div>
    </section>
  )
}

export default MenuErrorState