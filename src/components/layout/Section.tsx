'use client'

import { ReactNode } from 'react'

interface SectionProps {
  children: ReactNode
  className?: string
  background?: 'white' | 'gray' | 'amber'
  padding?: 'sm' | 'md' | 'lg' | 'xl'
  id?: string
}

const Section = ({ 
  children, 
  className = '', 
  background = 'white',
  padding = 'lg',
  id
}: SectionProps) => {
  const backgroundClasses = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    amber: 'bg-amber-50'
  }

  const paddingClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-20',
    xl: 'py-32'
  }

  return (
    <section 
      id={id}
      className={`${backgroundClasses[background]} ${paddingClasses[padding]} ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  )
}

export default Section