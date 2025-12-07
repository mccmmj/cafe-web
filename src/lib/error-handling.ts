import { createElement, type CSSProperties } from 'react'
import { toast, type Toast } from 'react-hot-toast'

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
  details?: unknown
  retryable?: boolean
}

const toRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>
  }
  return {}
}

const retryToastContainerStyle: CSSProperties = {
  backgroundColor: '#fff',
  border: '1px solid #fecaca',
  borderRadius: 12,
  padding: '0.75rem',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
  color: '#111827',
  fontSize: '0.875rem',
  maxWidth: '20rem'
}

const retryToastActionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.5rem',
  marginTop: '0.5rem'
}

const retryToastTitleStyle: CSSProperties = {
  margin: 0,
  fontWeight: 600,
  color: '#b91c1c'
}

const retryToastMessageStyle: CSSProperties = {
  margin: 0,
  color: '#374151'
}

const retryToastButtonStyle: CSSProperties = {
  border: 'none',
  background: 'none',
  color: '#6b7280',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 600
}

const retryToastRetryButtonStyle: CSSProperties = {
  border: 'none',
  backgroundColor: '#ef4444',
  color: '#fff',
  borderRadius: 9999,
  padding: '0.35rem 0.75rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer'
}

// Error classification
export const classifyError = (error: unknown): AppError => {
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

  const errRecord = toRecord(error)
  const status = typeof errRecord.status === 'number' ? errRecord.status : undefined
  const name = typeof errRecord.name === 'string' ? errRecord.name : undefined
  const errorCode = typeof errRecord.code === 'string' ? errRecord.code : undefined
  const category = typeof errRecord.category === 'string' ? errRecord.category : undefined
  const errorDetail = typeof errRecord.detail === 'string' ? errRecord.detail : undefined
  const message = typeof errRecord.message === 'string' ? errRecord.message : undefined
  const details = errRecord.details

  // HTTP Response errors
  if (status) {
    switch (true) {
      case status >= 400 && status < 500:
        if (status === 401) {
          return {
            type: ErrorType.AUTHENTICATION,
            message: 'Please sign in to continue.',
            code: 'UNAUTHORIZED',
            retryable: false,
          }
        }
        if (status === 403) {
          return {
            type: ErrorType.AUTHORIZATION,
            message: 'You don\'t have permission to perform this action.',
            code: 'FORBIDDEN',
            retryable: false,
          }
        }
        if (status === 404) {
          return {
            type: ErrorType.NOT_FOUND,
            message: 'The requested resource was not found.',
            code: 'NOT_FOUND',
            retryable: false,
          }
        }
        if (status === 422) {
          return {
            type: ErrorType.VALIDATION,
            message: message || 'Invalid data provided.',
            details,
            retryable: false,
          }
        }
        return {
          type: ErrorType.VALIDATION,
            message: message || 'Invalid request. Please check your input.',
          retryable: false,
        }

      case status >= 500:
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
  if (name === 'ZodError' || Array.isArray(errRecord.issues)) {
    return {
      type: ErrorType.VALIDATION,
      message: 'Please check your input and try again.',
      details: errRecord.issues,
      retryable: false,
    }
  }

  // Payment errors
  if (errorCode && errorCode.startsWith('PAYMENT_')) {
    return {
      type: ErrorType.PAYMENT,
      message: message || 'Payment failed. Please try again.',
      code: errorCode,
      retryable: true,
    }
  }

  // Square API errors
  if (category) {
    switch (category) {
      case 'PAYMENT_METHOD_ERROR':
      case 'REFUND_ERROR':
        return {
          type: ErrorType.PAYMENT,
          message: errorDetail || 'Payment error. Please try a different payment method.',
          code: errorCode,
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
          message: errorDetail || 'Server error. Please try again.',
          retryable: true,
        }
    }
  }

  // Generic error
  return {
    type: ErrorType.UNKNOWN,
    message: message || 'An unexpected error occurred. Please try again.',
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
  
  const renderRetryToast = (toastInstance: Toast) =>
    createElement(
      'div',
      { style: retryToastContainerStyle },
      createElement('p', { style: retryToastTitleStyle }, 'Retryable error'),
      createElement('p', { style: retryToastMessageStyle }, message),
      createElement(
        'div',
        { style: retryToastActionsStyle },
        createElement(
          'button',
          {
            type: 'button',
            style: retryToastButtonStyle,
            onClick: () => toast.dismiss(toastInstance.id)
          },
          'Dismiss'
        ),
        createElement(
          'button',
          {
            type: 'button',
            style: retryToastRetryButtonStyle,
            onClick: () => {
              onRetry()
              toast.dismiss(toastInstance.id)
            }
          },
          'Retry'
        )
      )
    )

  toast.custom(renderRetryToast, {
    duration: 8000,
    position: 'bottom-right',
    ariaProps: {
      role: 'status',
      'aria-live': 'polite'
    }
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
  constructor(message: string, public details?: unknown) {
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
