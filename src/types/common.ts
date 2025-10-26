// Common types used across the application

// API Response types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
  statusCode?: number
}

export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  error?: string
}

// Generic CRUD operations
export interface CreateRequest<T = any> {
  data: T
}

export interface UpdateRequest<T = any> {
  id: string
  data: Partial<T>
}

export interface DeleteRequest {
  id: string
}

export interface FindRequest {
  id: string
}

export interface ListRequest {
  page?: number
  limit?: number
  search?: string
  filter?: Record<string, any>
  sort?: {
    field: string
    direction: 'asc' | 'desc'
  }
}

// Status types
export type Status = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T = any> {
  data: T | null
  status: Status
  error: string | null
}

// Form types
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio'
  placeholder?: string
  required?: boolean
  validation?: ValidationRule[]
  options?: SelectOption[] // For select fields
  defaultValue?: any
  disabled?: boolean
  helper?: string
}

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface ValidationRule {
  type: 'required' | 'email' | 'min' | 'max' | 'pattern' | 'custom'
  value?: any
  message: string
}

export interface FormErrors {
  [fieldName: string]: string
}

export interface FormState {
  values: Record<string, any>
  errors: FormErrors
  touched: Record<string, boolean>
  isSubmitting: boolean
  isValid: boolean
}

// Navigation types
export interface NavItem {
  name: string
  href: string
  icon?: React.ComponentType<any>
  isActive?: boolean
  badge?: string | number
  children?: NavItem[]
}

export interface BreadcrumbItem {
  name: string
  href: string
  icon?: React.ComponentType<any>
}

// Modal/Dialog types
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  children: React.ReactNode
}

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'warning' | 'error' | 'success'
}

// Notification types
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  timestamp: string
}

// Search types
export interface SearchConfig {
  placeholder: string
  debounceMs: number
  minLength: number
  maxResults: number
  fields: string[] // Fields to search in
  weights?: Record<string, number> // Weight for each field
}

export interface SearchResult<T = any> {
  item: T
  score: number
  matches: SearchMatch[]
}

export interface SearchMatch {
  field: string
  value: string
  indices: [number, number][]
}

// Theme types
export interface Theme {
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: {
      primary: string
      secondary: string
      disabled: string
    }
    border: string
    error: string
    warning: string
    success: string
    info: string
  }
  typography: {
    fontFamily: {
      sans: string
      serif: string
      mono: string
    }
    fontSize: Record<string, string>
    fontWeight: Record<string, number>
    lineHeight: Record<string, number>
  }
  spacing: Record<string, string>
  borderRadius: Record<string, string>
  shadows: Record<string, string>
  breakpoints: Record<string, string>
}

// Environment types
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'test' | 'production'
  APP_URL: string
  API_URL: string
  SQUARE_ENVIRONMENT: 'sandbox' | 'production'
  SQUARE_APPLICATION_ID: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  ENABLE_ANALYTICS: boolean
  ENABLE_ERROR_REPORTING: boolean
}

// Error types
export interface AppError {
  code: string
  message: string
  details?: Record<string, any>
  stack?: string
  timestamp: string
  userId?: string
  context?: Record<string, any>
}

// Analytics types
export interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  userId?: string
  timestamp: string
}

export interface PageView {
  path: string
  title: string
  userId?: string
  timestamp: string
  referrer?: string
  duration?: number
}