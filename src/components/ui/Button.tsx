'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning' | 'info'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isLoading?: boolean
  fullWidth?: boolean
  rounded?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false, 
    disabled, 
    fullWidth = false,
    rounded = false,
    children, 
    ...props 
  }, ref) => {
    const baseClasses = cn(
      'inline-flex items-center justify-center font-medium transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
      'hover-lift focus-ring',
      rounded ? 'rounded-full' : 'rounded-lg',
      fullWidth ? 'w-full' : ''
    )
    
    const variants = {
      primary: cn(
        'bg-primary-600 text-white shadow-sm',
        'hover:bg-primary-700 hover:shadow-md',
        'focus-visible:ring-primary-500',
        'active:bg-primary-800'
      ),
      secondary: cn(
        'bg-gray-100 text-gray-900 shadow-sm',
        'hover:bg-gray-200 hover:shadow-md',
        'focus-visible:ring-gray-500',
        'active:bg-gray-300'
      ),
      outline: cn(
        'border-2 border-primary-600 text-primary-600 bg-transparent',
        'hover:bg-primary-50 hover:border-primary-700',
        'focus-visible:ring-primary-500',
        'active:bg-primary-100'
      ),
      ghost: cn(
        'text-gray-700 bg-transparent',
        'hover:bg-gray-100 hover:text-gray-900',
        'focus-visible:ring-gray-500',
        'active:bg-gray-200'
      ),
      danger: cn(
        'bg-error-500 text-white shadow-sm',
        'hover:bg-error-600 hover:shadow-md',
        'focus-visible:ring-error-500',
        'active:bg-error-700'
      ),
      success: cn(
        'bg-success-500 text-white shadow-sm',
        'hover:bg-success-600 hover:shadow-md',
        'focus-visible:ring-success-500',
        'active:bg-success-700'
      ),
      warning: cn(
        'bg-warning-500 text-white shadow-sm',
        'hover:bg-warning-600 hover:shadow-md',
        'focus-visible:ring-warning-500',
        'active:bg-warning-700'
      ),
      info: cn(
        'bg-info-500 text-white shadow-sm',
        'hover:bg-info-600 hover:shadow-md',
        'focus-visible:ring-info-500',
        'active:bg-info-700'
      )
    }
    
    const sizes = {
      xs: 'h-6 px-2 text-xs gap-1',
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2',
      xl: 'h-14 px-8 text-lg gap-2.5'
    }

    return (
      <button
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className={cn(
              'animate-spin',
              size === 'xs' ? 'h-3 w-3' :
              size === 'sm' ? 'h-4 w-4' :
              size === 'md' ? 'h-4 w-4' :
              size === 'lg' ? 'h-5 w-5' : 'h-6 w-6'
            )}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            data-testid="loading-spinner"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button