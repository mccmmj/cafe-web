export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePassword = (password: string): boolean => {
  return password.length >= 6
}

export const formatAuthError = (error: any): string => {
  if (error?.message) {
    // Handle common Supabase auth errors
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Invalid email or password. Please try again.'
      case 'User already registered':
        return 'An account with this email already exists.'
      case 'Email not confirmed':
        return 'Please check your email and click the confirmation link.'
      case 'Password should be at least 6 characters':
        return 'Password must be at least 6 characters long.'
      default:
        return error.message
    }
  }
  return 'An unexpected error occurred. Please try again.'
}