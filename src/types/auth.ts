// Authentication related types

export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  role: 'user' | 'admin' | 'staff'
  createdAt: string
  updatedAt?: string
  lastSignInAt?: string
  emailVerified?: boolean
  preferences?: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    email: boolean
    push: boolean
    orderUpdates: boolean
    promotions: boolean
  }
  favoriteItems: string[] // Array of item IDs
  defaultPaymentMethod?: string
  dietary: {
    vegetarian: boolean
    vegan: boolean
    glutenFree: boolean
    nutFree: boolean
    dairyFree: boolean
  }
}

export interface AuthSession {
  user: User
  accessToken: string
  refreshToken?: string
  expiresAt: string
  tokenType: 'bearer'
}

export interface AuthError {
  code: string
  message: string
  details?: Record<string, any>
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface SignupData {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  phone?: string
  acceptTerms: boolean
  acceptMarketing?: boolean
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordChangeRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface ProfileUpdateData {
  firstName?: string
  lastName?: string
  phone?: string
  preferences?: Partial<UserPreferences>
}

// Auth state for context/providers
export interface AuthContextState {
  user: User | null
  session: AuthSession | null
  loading: boolean
  error: AuthError | null
  isAuthenticated: boolean
  signIn: (credentials: LoginCredentials) => Promise<void>
  signUp: (data: SignupData) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (data: ProfileUpdateData) => Promise<void>
  clearError: () => void
  refreshSession: () => Promise<void>
}