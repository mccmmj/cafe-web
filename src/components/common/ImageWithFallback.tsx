'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageOff } from 'lucide-react'

interface ImageWithFallbackProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  fallbackIcon?: boolean
}

const ImageWithFallback = ({
  src,
  alt,
  width = 400,
  height = 300,
  className = '',
  fallbackIcon = true
}: ImageWithFallbackProps) => {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div 
        className={`bg-gray-100 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        {fallbackIcon ? (
          <ImageOff className="h-8 w-8 text-gray-400" />
        ) : (
          <span className="text-gray-500 text-sm">Image not available</span>
        )}
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setHasError(true)}
    />
  )
}

export default ImageWithFallback