export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePassword = (password: string): boolean => {
  return password.length >= 6
}

export const formatAuthError = (error: unknown): string => {
  const message = typeof error === 'object' && error !== null && 'message' in error
    ? (error as { message?: string }).message
    : undefined

  if (message) {
    // Handle common Supabase auth errors
    switch (message) {
      case 'Invalid login credentials':
        return 'Invalid email or password. Please try again.'
      case 'User already registered':
        return 'An account with this email already exists.'
      case 'Email not confirmed':
        return 'Please check your email and click the confirmation link.'
      case 'Password should be at least 6 characters':
        return 'Password must be at least 6 characters long.'
      default:
        return message
    }
  }
  return 'An unexpected error occurred. Please try again.'
}
