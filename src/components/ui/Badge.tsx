'use client'

import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  dot?: boolean
}

const Badge = ({ 
  className, 
  variant = 'default', 
  size = 'md', 
  dot = false,
  children,
  ...props 
}: BadgeProps) => {
  const baseClasses = cn(
    'inline-flex items-center rounded-full font-medium transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-offset-1',
    dot && 'gap-1.5'
  )
  
  const variants = {
    default: cn(
      'border border-primary-200 bg-primary-50 text-primary-800',
      'dark:border-primary-800 dark:bg-primary-900 dark:text-primary-200'
    ),
    secondary: cn(
      'border border-border-primary bg-surface-secondary text-text-secondary',
      'dark:border-border-primary dark:bg-surface-secondary dark:text-text-secondary'
    ),
    success: cn(
      'border border-success-200 bg-success-50 text-success-800',
      'dark:border-success-800 dark:bg-success-900 dark:text-success-200'
    ),
    warning: cn(
      'border border-warning-200 bg-warning-50 text-warning-800',
      'dark:border-warning-800 dark:bg-warning-900 dark:text-warning-200'
    ),
    danger: cn(
      'border border-error-200 bg-error-50 text-error-800',
      'dark:border-error-800 dark:bg-error-900 dark:text-error-200'
    ),
    info: cn(
      'border border-info-200 bg-info-50 text-info-800',
      'dark:border-info-800 dark:bg-info-900 dark:text-info-200'
    ),
    outline: cn(
      'border-2 border-border-primary bg-transparent text-text-primary',
      'hover:bg-surface-secondary',
      'dark:border-border-primary dark:text-text-primary dark:hover:bg-surface-secondary'
    )
  }
  
  const sizes = {
    xs: 'px-1.5 py-0.5 text-xs h-4',
    sm: 'px-2 py-0.5 text-xs h-5',
    md: 'px-2.5 py-1 text-sm h-6',
    lg: 'px-3 py-1.5 text-sm h-7'
  }

  const dotColors = {
    default: 'bg-primary-500',
    secondary: 'bg-gray-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-error-500',
    info: 'bg-info-500',
    outline: 'bg-border-primary'
  }

  return (
    <div
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <div 
          className={cn(
            'w-2 h-2 rounded-full',
            dotColors[variant]
          )} 
        />
      )}
      {children}
    </div>
  )
}

export default Badge