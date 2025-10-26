'use client'

import { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'
import { Button } from '../ui'

interface ScrollSection {
  id: string
  label: string
  href: string
}

interface SmoothScrollNavProps {
  sections: ScrollSection[]
  className?: string
}

export default function SmoothScrollNav({ sections, className = '' }: SmoothScrollNavProps) {
  const [activeSection, setActiveSection] = useState<string>('')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      
      // Show nav after scrolling down 200px
      setIsVisible(scrollY > 200)

      // Find active section
      const sectionElements = sections.map(section => ({
        ...section,
        element: document.getElementById(section.id)
      }))

      for (const section of sectionElements) {
        if (section.element) {
          const rect = section.element.getBoundingClientRect()
          const isInView = rect.top <= windowHeight / 2 && rect.bottom >= windowHeight / 2
          
          if (isInView) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial state

    return () => window.removeEventListener('scroll', handleScroll)
  }, [sections])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const headerOffset = 80 // Account for fixed header
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  if (!isVisible) return null

  return (
    <div className={`fixed right-4 bottom-4 z-40 ${className}`}>
      {/* Section Navigation */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-2 mb-2">
        <nav className="flex flex-col space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 text-left ${
                activeSection === section.id
                  ? 'bg-amber-100 text-amber-700 border-l-2 border-amber-600'
                  : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
              }`}
              title={`Go to ${section.label}`}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Back to Top Button */}
      <Button
        variant="primary"
        className="w-full flex items-center justify-center p-3 rounded-lg shadow-lg"
        onClick={scrollToTop}
        title="Back to top"
      >
        <ChevronUp className="h-5 w-5" />
      </Button>
    </div>
  )
}