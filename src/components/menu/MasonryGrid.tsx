'use client'

import { useEffect, useRef, useState } from 'react'

interface MasonryGridProps {
  children: React.ReactNode[]
  gap?: number
  minColumnWidth?: number
  className?: string
}

const MasonryGrid = ({ 
  children, 
  gap = 32, 
  minColumnWidth = 350,
  className = '' 
}: MasonryGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState<React.ReactNode[][]>([])
  const [columnCount, setColumnCount] = useState(1)

  useEffect(() => {
    const updateLayout = () => {
      if (!containerRef.current) return

      const containerWidth = containerRef.current.offsetWidth
      const newColumnCount = Math.floor(containerWidth / minColumnWidth) || 1
      
      // Only recalculate if column count changed
      if (newColumnCount !== columnCount) {
        setColumnCount(newColumnCount)
        
        // Distribute children across columns
        const newColumns: React.ReactNode[][] = Array.from(
          { length: newColumnCount }, 
          () => []
        )
        
        children.forEach((child, index) => {
          const columnIndex = index % newColumnCount
          newColumns[columnIndex].push(child)
        })
        
        setColumns(newColumns)
      }
    }

    // Initial layout
    updateLayout()

    // Update on resize
    const resizeObserver = new ResizeObserver(updateLayout)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [children, minColumnWidth, columnCount])

  return (
    <div 
      ref={containerRef}
      className={`w-full ${className}`}
      style={{ gap: `${gap}px` }}
    >
      <div 
        className="flex items-start"
        style={{ gap: `${gap}px` }}
      >
        {columns.map((column, columnIndex) => (
          <div 
            key={columnIndex}
            className="flex-1 flex flex-col"
            style={{ gap: `${gap}px` }}
          >
            {column}
          </div>
        ))}
      </div>
    </div>
  )
}

export default MasonryGrid