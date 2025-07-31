import { toast } from 'react-hot-toast'

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  PAYMENT = 'PAYMENT',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType
  message: string
  code?: string
  details?: any
  retryable?: boolean
}

// Error classification
export const classifyError = (error: any): AppError => {
  // Network errors
  if (!navigator.onLine) {
    return {
      type: ErrorType.NETWORK,
      message: 'No internet connection. Please check your network and try again.',
      retryable: true,
    }
  }

  // Fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: ErrorType.NETWORK,
      message: 'Network error. Please check your connection and try again.',
      retryable: true,
    }
  }

  // HTTP Response errors
  if (error?.status) {
    switch (true) {
      case error.status >= 400 && error.status < 500:
        if (error.status === 401) {
          return {
            type: ErrorType.AUTHENTICATION,
            message: 'Please sign in to continue.',
            code: 'UNAUTHORIZED',
            retryable: false,
          }
        }
        if (error.status === 403) {
          return {
            type: ErrorType.AUTHORIZATION,
            message: 'You don\'t have permission to perform this action.',
            code: 'FORBIDDEN',
            retryable: false,
          }
        }
        if (error.status === 404) {
          return {
            type: ErrorType.NOT_FOUND,
            message: 'The requested resource was not found.',
            code: 'NOT_FOUND',
            retryable: false,
          }
        }
        if (error.status === 422) {
          return {
            type: ErrorType.VALIDATION,
            message: error.message || 'Invalid data provided.',
            details: error.details,
            retryable: false,
          }
        }
        return {
          type: ErrorType.VALIDATION,
          message: error.message || 'Invalid request. Please check your input.',
          retryable: false,
        }

      case error.status >= 500:
        return {
          type: ErrorType.SERVER,
          message: 'Server error. Please try again later.',
          retryable: true,
        }

      default:
        break
    }
  }

  // Validation errors (Zod)
  if (error?.name === 'ZodError' || error?.issues) {
    return {
      type: ErrorType.VALIDATION,
      message: 'Please check your input and try again.',
      details: error.issues,
      retryable: false,
    }
  }

  // Payment errors
  if (error?.code && error.code.startsWith('PAYMENT_')) {
    return {
      type: ErrorType.PAYMENT,
      message: error.message || 'Payment failed. Please try again.',
      code: error.code,
      retryable: true,
    }
  }

  // Square API errors
  if (error?.category) {
    switch (error.category) {
      case 'PAYMENT_METHOD_ERROR':
      case 'REFUND_ERROR':
        return {
          type: ErrorType.PAYMENT,
          message: error.detail || 'Payment error. Please try a different payment method.',
          code: error.code,
          retryable: true,
        }
      case 'RATE_LIMIT_ERROR':
        return {
          type: ErrorType.SERVER,
          message: 'Too many requests. Please try again in a moment.',
          retryable: true,
        }
      case 'AUTHENTICATION_ERROR':
        return {
          type: ErrorType.AUTHENTICATION,
          message: 'Authentication failed. Please sign in again.',
          retryable: false,
        }
      default:
        return {
          type: ErrorType.SERVER,
          message: error.detail || 'Server error. Please try again.',
          retryable: true,
        }
    }
  }

  // Generic error
  return {
    type: ErrorType.UNKNOWN,
    message: error?.message || 'An unexpected error occurred. Please try again.',
    retryable: true,
  }
}

// Error display utilities
export const getErrorDisplayMessage = (error: AppError): string => {
  switch (error.type) {
    case ErrorType.NETWORK:
      return error.message
    case ErrorType.AUTHENTICATION:
      return 'Please sign in to continue'
    case ErrorType.AUTHORIZATION:
      return 'Access denied'
    case ErrorType.NOT_FOUND:
      return 'Resource not found'
    case ErrorType.VALIDATION:
      return 'Please check your input'
    case ErrorType.PAYMENT:
      return 'Payment failed'
    case ErrorType.SERVER:
      return 'Server temporarily unavailable'
    default:
      return 'Something went wrong'
  }
}

// Toast notification helpers
export const showErrorToast = (error: AppError) => {
  const message = getErrorDisplayMessage(error)
  
  toast.error(message, {
    duration: error.retryable ? 4000 : 6000,
    position: 'bottom-right',
    style: {
      background: '#ef4444',
      color: 'white',
    },
  })
}

export const showRetryableErrorToast = (error: AppError, onRetry: () => void) => {
  if (!error.retryable) {
    showErrorToast(error)
    return
  }

  const message = getErrorDisplayMessage(error)
  
  toast.error(message, {
    duration: 8000,
    position: 'bottom-right',
    style: {
      background: '#ef4444',
      color: 'white',
    },
  })
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  retryCondition?: (error: AppError) => boolean
}

export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryCondition: (error) => error.retryable === true,
}

// Exponential backoff delay calculation
export const calculateRetryDelay = (
  attempt: number,
  config: RetryConfig = defaultRetryConfig
): number => {
  const delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1)
  return Math.min(delay, config.maxDelay)
}

// Retry wrapper for async operations
export const withRetry = async <T>(
  operation: () => Promise<T>,
  config: RetryConfig = defaultRetryConfig
): Promise<T> => {
  let lastError: AppError
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = classifyError(error)
      
      // Don't retry if error is not retryable
      if (config.retryCondition && !config.retryCondition(lastError)) {
        throw lastError
      }
      
      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        throw lastError
      }
      
      // Wait before retrying
      const delay = calculateRetryDelay(attempt, config)
      await new Promise(resolve => setTimeout(resolve, delay))
      
      console.warn(`Retry attempt ${attempt} failed:`, lastError.message)
    }
  }
  
  throw lastError!
}

// Error boundary helpers
export const logError = (error: AppError, context?: string) => {
  const logData = {
    type: error.type,
    message: error.message,
    code: error.code,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Application Error:', logData)
  }
  
  // In production, you might want to send to an error tracking service
  // like Sentry, LogRocket, or Bugsnag
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error, { extra: logData })
  }
}

// Network status utilities
export const isOnline = (): boolean => {
  return navigator.onLine
}

export const waitForOnline = (): Promise<void> => {
  return new Promise((resolve) => {
    if (navigator.onLine) {
      resolve()
      return
    }
    
    const handleOnline = () => {
      window.removeEventListener('online', handleOnline)
      resolve()
    }
    
    window.addEventListener('online', handleOnline)
  })
}

// Custom error classes
export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class PaymentError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'PaymentError'
  }
}