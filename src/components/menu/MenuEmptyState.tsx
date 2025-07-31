'use client'

interface MenuEmptyStateProps {
  className?: string
  showHeader?: boolean
}

const MenuEmptyState = ({ className = '', showHeader = true }: MenuEmptyStateProps) => {
  return (
    <section className={showHeader ? `py-20 bg-gray-50 ${className}` : `py-8 bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Menu Coming Soon</h3>
          <p className="text-gray-600">We&apos;re updating our menu. Please check back soon!</p>
        </div>
      </div>
    </section>
  )
}

export default MenuEmptyState