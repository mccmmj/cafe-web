// Authentication validation schemas

export interface LoginFormData {
  email: string
  password: string
}

export interface SignupFormData {
  email: string
  password: string
  confirmPassword: string
  firstName?: string
  lastName?: string
}

export interface ProfileFormData {
  firstName: string
  lastName: string
  email: string
  phone?: string
}

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Password validation
export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
  return passwordRegex.test(password)
}

// Phone validation (US format)
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
  return phoneRegex.test(phone)
}

// Validation functions
export const validateLoginForm = (data: LoginFormData): { isValid: boolean; errors: Partial<LoginFormData> } => {
  const errors: Partial<LoginFormData> = {}

  if (!data.email) {
    errors.email = 'Email is required'
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email address'
  }

  if (!data.password) {
    errors.password = 'Password is required'
  } else if (data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export const validateSignupForm = (data: SignupFormData): { isValid: boolean; errors: Partial<SignupFormData> } => {
  const errors: Partial<SignupFormData> = {}

  if (!data.email) {
    errors.email = 'Email is required'
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email address'
  }

  if (!data.password) {
    errors.password = 'Password is required'
  } else if (!isValidPassword(data.password)) {
    errors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number'
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password'
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export const validateProfileForm = (data: ProfileFormData): { isValid: boolean; errors: Partial<ProfileFormData> } => {
  const errors: Partial<ProfileFormData> = {}

  if (!data.firstName?.trim()) {
    errors.firstName = 'First name is required'
  }

  if (!data.lastName?.trim()) {
    errors.lastName = 'Last name is required'
  }

  if (!data.email) {
    errors.email = 'Email is required'
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email address'
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.phone = 'Please enter a valid phone number'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}