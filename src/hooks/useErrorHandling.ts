'use client'

import { useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { 
  classifyError, 
  showErrorToast, 
  showRetryableErrorToast, 
  logError,
  isOnline,
  waitForOnline,
  type AppError,
  type RetryConfig,
  defaultRetryConfig
} from '@/lib/error-handling'

// Global error handling hook
export const useErrorHandling = () => {
  const queryClient = useQueryClient()

  // Handle and classify errors
  const handleError = useCallback((error: unknown, context?: string) => {
    const appError = classifyError(error)
    logError(appError, context)
    showErrorToast(appError)
    return appError
  }, [])

  // Handle errors with retry option
  const handleRetryableError = useCallback((error: unknown, onRetry: () => void, context?: string) => {
    const appError = classifyError(error)
    logError(appError, context)
    showRetryableErrorToast(appError, onRetry)
    return appError
  }, [])

  // Clear error state
  const clearErrors = useCallback(() => {
    // Clear any error-related query cache if needed
    queryClient.removeQueries({ 
      queryKey: ['errors'],
      exact: false 
    })
  }, [queryClient])

  // Network status handlers
  useEffect(() => {
    const handleOnline = () => {
      // Refetch failed queries when back online
      queryClient.refetchQueries({
        type: 'all',
        stale: true,
      })
    }

    const handleOffline = () => {
      // Could pause queries or show offline indicator
      console.warn('Application is offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [queryClient])

  return {
    handleError,
    handleRetryableError,
    clearErrors,
    isOnline: isOnline(),
  }
}

// Enhanced mutation hook with error handling
export const useMutationWithErrorHandling = <TData, TVariables, TContext>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables, context: TContext) => void
    onError?: (error: AppError, variables: TVariables, context: TContext | undefined) => void
    onSettled?: (data: TData | undefined, error: AppError | null, variables: TVariables, context: TContext | undefined) => void
    retryConfig?: RetryConfig
    showErrorToast?: boolean
    context?: string
  }
) => {
  const { handleError, handleRetryableError } = useErrorHandling()

  const retryConfig = { ...defaultRetryConfig, ...options?.retryConfig }
  const showToast = options?.showErrorToast ?? true

  return {
    mutate: async (variables: TVariables) => {
      let lastError: AppError | null = null
      
      for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
        try {
          const data = await mutationFn(variables)
          
          if (options?.onSuccess) {
            options.onSuccess(data, variables, undefined as unknown as TContext)
          }
          
          if (options?.onSettled) {
            options.onSettled(data, null, variables, undefined as unknown as TContext)
          }
          
          return data
        } catch (error) {
          lastError = classifyError(error)
          
          // Don't retry if error is not retryable
          if (!lastError.retryable || attempt === retryConfig.maxAttempts) {
            if (showToast) {
              if (attempt < retryConfig.maxAttempts && lastError.retryable) {
                handleRetryableError(error, () => {
                  // Trigger retry
                  // This would need to be handled by the calling component
                }, options?.context)
              } else {
                handleError(error, options?.context)
              }
            }
            
          if (options?.onError) {
            options.onError(lastError, variables, undefined as unknown as TContext)
          }
          
          if (options?.onSettled) {
            options.onSettled(undefined, lastError, variables, undefined as unknown as TContext)
          }
            
            throw lastError
          }
          
          // Wait before retrying
          const delay = retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, Math.min(delay, retryConfig.maxDelay)))
        }
      }
      
      throw lastError
    }
  }
}

// Hook for handling offline/online behavior
export const useOfflineHandler = () => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const handleOnline = async () => {
      // Wait a moment for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Refetch all stale queries
      await queryClient.refetchQueries({
        type: 'all',
        stale: true,
      })
      
      // Resume any paused mutations
      queryClient.resumePausedMutations()
    }

    const handleOffline = () => {
      // Pause mutations while offline
      // React Query automatically handles this, but we can add custom logic
      console.warn('Connection lost - mutations will be paused')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [queryClient])

  return {
    isOnline: isOnline(),
    waitForOnline,
  }
}

// Hook for automatic retry with exponential backoff
export const useRetryableOperation = <T>(
  operation: () => Promise<T>,
  config: RetryConfig = defaultRetryConfig
) => {
  const { handleError } = useErrorHandling()

  const executeWithRetry = useCallback(async (): Promise<T> => {
    let lastError: AppError | null = null
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = classifyError(error)
        
        // Check if we should retry
        if (!config.retryCondition?.(lastError) || attempt === config.maxAttempts) {
          handleError(error, 'Retryable Operation')
          throw lastError
        }
        
        // Calculate delay and wait
        const delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, Math.min(delay, config.maxDelay)))
        
        console.warn(`Retry attempt ${attempt} for operation`, lastError.message)
      }
    }
    
    throw lastError!
  }, [operation, config, handleError])

  return { executeWithRetry }
}

// Hook for handling form errors
type ValidationIssue = {
  path?: Array<string | number>
  message: string
}

export const useFormErrorHandling = () => {
  const { handleError } = useErrorHandling()

  const handleFormError = useCallback((error: unknown, formName?: string) => {
    const appError = classifyError(error)
    
    // Handle validation errors specifically
    if (appError.type === 'VALIDATION' && appError.details) {
      // Extract field-specific errors from Zod validation
      const fieldErrors: Record<string, string> = {}
      
      if (Array.isArray(appError.details)) {
        appError.details.forEach((issue) => {
          const issueDetail = issue as ValidationIssue
          const field = issueDetail.path?.join('.') || 'general'
          fieldErrors[field] = issueDetail.message
        })
      }
      
      return { appError, fieldErrors }
    }
    
    // Handle general form errors
    handleError(error, formName ? `Form: ${formName}` : 'Form Submission')
    return { appError, fieldErrors: {} }
  }, [handleError])

  return { handleFormError }
}
