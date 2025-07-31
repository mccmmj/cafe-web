'use client'

import { useState, useEffect, useCallback } from 'react'

// Async state management hook
export interface UseAsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  execute: (...args: any[]) => Promise<T | undefined>
  reset: () => void
}

export function useAsync<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  immediate: boolean = true
): UseAsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(immediate)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(
    async (...args: any[]): Promise<T | undefined> => {
      setLoading(true)
      setError(null)

      try {
        const result = await asyncFunction(...args)
        setData(result)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred'
        setError(errorMessage)
        return undefined
      } finally {
        setLoading(false)
      }
    },
    [asyncFunction]
  )

  const reset = useCallback(() => {
    setData(null)
    setLoading(false)
    setError(null)
  }, [])

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate])

  return { data, loading, error, execute, reset }
}

// Hook for API calls with automatic retry
export function useAsyncWithRetry<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000,
  immediate: boolean = true
): UseAsyncState<T> & { retryCount: number; retryManual: () => void } {
  const [retryCount, setRetryCount] = useState(0)
  
  const asyncWithRetry = useCallback(
    async (...args: any[]): Promise<T> => {
      let lastError: Error
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await asyncFunction(...args)
          setRetryCount(0) // Reset retry count on success
          return result
        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Unknown error')
          setRetryCount(attempt + 1)
          
          if (attempt < maxRetries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
          }
        }
      }
      
      throw lastError!
    },
    [asyncFunction, maxRetries, retryDelay]
  )

  const asyncState = useAsync(asyncWithRetry, immediate)
  
  const retryManual = useCallback(() => {
    setRetryCount(0)
    asyncState.execute()
  }, [asyncState.execute])

  return {
    ...asyncState,
    retryCount,
    retryManual
  }
}