'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface PageTransitionProps {
  children: React.ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [displayChildren, setDisplayChildren] = useState(children)
  const pathname = usePathname()

  useEffect(() => {
    // Start transition
    setIsLoading(true)
    
    // Update content after a brief delay
    const timer = setTimeout(() => {
      setDisplayChildren(children)
      setIsLoading(false)
    }, 150)

    return () => clearTimeout(timer)
  }, [pathname, children])

  return (
    <div className="relative">
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      )}
      
      {/* Page content */}
      <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
        {displayChildren}
      </div>
    </div>
  )
}