'use client'

interface MenuLoadingStateProps {
  className?: string
  showHeader?: boolean
}

const MenuLoadingState = ({ className = '', showHeader = true }: MenuLoadingStateProps) => {
  return (
    <section className={showHeader ? `py-20 bg-gray-50 ${className}` : `py-8 bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {showHeader && (
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Menu</h2>
            <p className="text-xl text-gray-600">Loading fresh menu items...</p>
          </div>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-8 shadow-lg animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3].map(j => (
                  <div key={j} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default MenuLoadingState