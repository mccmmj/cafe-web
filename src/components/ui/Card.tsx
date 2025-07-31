'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'filled' | 'elevated' | 'interactive'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', ...props }, ref) => {
    const variants = {
      default: cn(
        'bg-surface-primary border border-border-primary shadow-sm',
        'dark:bg-surface-primary dark:border-border-primary'
      ),
      outline: cn(
        'bg-transparent border-2 border-border-primary',
        'hover:bg-surface-secondary transition-colors',
        'dark:border-border-primary dark:hover:bg-surface-secondary'
      ),
      filled: cn(
        'bg-surface-secondary border border-border-primary',
        'dark:bg-surface-secondary dark:border-border-primary'
      ),
      elevated: cn(
        'bg-surface-primary border border-border-primary hover-lift',
        'shadow-md hover:shadow-lg',
        'dark:bg-surface-primary dark:border-border-primary'
      ),
      interactive: cn(
        'bg-surface-primary border border-border-primary shadow-sm cursor-pointer',
        'hover:shadow-md hover:border-border-secondary hover-lift',
        'focus-ring focus:outline-none transition-base',
        'dark:bg-surface-primary dark:border-border-primary dark:hover:border-border-secondary'
      )
    }

    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6'
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl text-text-primary transition-colors',
          variants[variant],
          paddingClasses[padding],
          className
        )}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-text-secondary', className)}
      {...props}
    />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }