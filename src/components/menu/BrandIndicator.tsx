'use client'

import Image from 'next/image'
import { Coffee } from 'lucide-react'
import { BRAND_SETTINGS } from '@/lib/constants/menu'

interface BrandIndicatorProps {
  brand: 'starbucks'
  size?: 'sm' | 'md' | 'lg'
  position?: 'inline' | 'badge'
}

const BrandIndicator = ({ 
  brand, 
  size = 'md', 
  position = 'inline' 
}: BrandIndicatorProps) => {
  if (brand !== 'starbucks') return null

  const { STARBUCKS_DISPLAY } = BRAND_SETTINGS

  // Don't render if both logo and text label are disabled
  if (!STARBUCKS_DISPLAY.SHOW_LOGO && !STARBUCKS_DISPLAY.SHOW_TEXT_LABEL) {
    return null
  }

  // Size classes
  const sizeClasses = {
    sm: {
      icon: 'h-3 w-3',
      text: 'text-xs',
      container: 'gap-1'
    },
    md: {
      icon: 'h-4 w-4', 
      text: 'text-sm',
      container: 'gap-2'
    },
    lg: {
      icon: 'h-5 w-5',
      text: 'text-base',
      container: 'gap-2'
    }
  }

  // Position styles
  const positionClasses = position === 'badge' 
    ? 'bg-green-50 border border-green-200 rounded-full px-2 py-1'
    : ''

  const currentSize = sizeClasses[size]

  const logoDimensions = {
    sm: 12,
    md: 16,
    lg: 20
  }

  return (
    <div className={`flex items-center ${currentSize.container} ${positionClasses}`}>
      {/* Icon (if enabled and not showing logo) */}
      {!STARBUCKS_DISPLAY.SHOW_LOGO && STARBUCKS_DISPLAY.ICON_TYPE === 'coffee' && (
        <Coffee className={`${currentSize.icon} ${STARBUCKS_DISPLAY.LABEL_COLOR}`} />
      )}
      
      {/* Logo (if enabled and available) */}
      {STARBUCKS_DISPLAY.SHOW_LOGO && (
        <Image
          src="/images/starbucks-logo.svg"
          alt="Starbucks"
          width={logoDimensions[size]}
          height={logoDimensions[size]}
          className={`${currentSize.icon} ${STARBUCKS_DISPLAY.LABEL_COLOR}`}
        />
      )}
      
      {/* Text Label */}
      {STARBUCKS_DISPLAY.SHOW_TEXT_LABEL && (
        <span className={`${currentSize.text} font-medium ${STARBUCKS_DISPLAY.LABEL_COLOR}`}>
          {STARBUCKS_DISPLAY.LABEL_TEXT}
        </span>
      )}
    </div>
  )
}

export default BrandIndicator
