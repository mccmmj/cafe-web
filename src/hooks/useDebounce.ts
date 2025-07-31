'use client'

import { useState, useEffect } from 'react'

// Debounce hook for delaying value changes
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Advanced debounce hook with immediate execution option
export function useAdvancedDebounce<T>(
  value: T,
  delay: number,
  options: {
    leading?: boolean  // Execute immediately on first call
    trailing?: boolean // Execute after delay (default behavior)
    maxWait?: number  // Maximum time to wait before executing
  } = {}
): T {
  const { leading = false, trailing = true, maxWait } = options
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  const [lastCallTime, setLastCallTime] = useState<number>(0)

  useEffect(() => {
    const now = Date.now()
    setLastCallTime(now)

    // Immediate execution for leading edge
    if (leading && (!lastCallTime || now - lastCallTime > delay)) {
      setDebouncedValue(value)
      return
    }

    // Standard debounced execution
    const timer = setTimeout(() => {
      if (trailing) {
        setDebouncedValue(value)
      }
    }, delay)

    // Max wait timer
    let maxTimer: NodeJS.Timeout | undefined
    if (maxWait && maxWait > delay) {
      maxTimer = setTimeout(() => {
        setDebouncedValue(value)
      }, maxWait)
    }

    return () => {
      clearTimeout(timer)
      if (maxTimer) clearTimeout(maxTimer)
    }
  }, [value, delay, leading, trailing, maxWait, lastCallTime])

  return debouncedValue
}