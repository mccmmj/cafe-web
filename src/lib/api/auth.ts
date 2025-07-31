// Authentication API operations
import { createClient } from '@/lib/supabase/client'
import type { LoginFormData, SignupFormData } from '@/lib/validations'

export interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  role?: 'user' | 'admin'
  createdAt: string
}

export interface AuthResponse {
  user?: AuthUser
  error?: string
  session?: any
}

// Sign up with email and password
export const signUpWithEmail = async (data: SignupFormData): Promise<AuthResponse> => {
  try {
    const supabase = createClient()
    
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName
        }
      }
    })

    if (error) {
      return { error: error.message }
    }

    if (authData.user) {
      return {
        user: {
          id: authData.user.id,
          email: authData.user.email!,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'user',
          createdAt: authData.user.created_at
        },
        session: authData.session
      }
    }

    return { error: 'Sign up failed' }
  } catch (error) {
    console.error('Sign up error:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to sign up'
    }
  }
}

// Sign in with email and password
export const signInWithEmail = async (data: LoginFormData): Promise<AuthResponse> => {
  try {
    const supabase = createClient()
    
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    })

    if (error) {
      return { error: error.message }
    }

    if (authData.user) {
      return {
        user: {
          id: authData.user.id,
          email: authData.user.email!,
          firstName: authData.user.user_metadata?.first_name,
          lastName: authData.user.user_metadata?.last_name,
          role: authData.user.user_metadata?.role || 'user',
          createdAt: authData.user.created_at
        },
        session: authData.session
      }
    }

    return { error: 'Sign in failed' }
  } catch (error) {
    console.error('Sign in error:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to sign in'
    }
  }
}

// Sign out
export const signOut = async (): Promise<{ error?: string }> => {
  try {
    const supabase = createClient()
    
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { error: error.message }
    }

    return {}
  } catch (error) {
    console.error('Sign out error:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to sign out'
    }
  }
}

// Get current user session
export const getCurrentUser = async (): Promise<AuthResponse> => {
  try {
    const supabase = createClient()
    
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      return { error: error.message }
    }

    if (session?.user) {
      return {
        user: {
          id: session.user.id,
          email: session.user.email!,
          firstName: session.user.user_metadata?.first_name,
          lastName: session.user.user_metadata?.last_name,
          role: session.user.user_metadata?.role || 'user',
          createdAt: session.user.created_at
        },
        session
      }
    }

    return { error: 'No active session' }
  } catch (error) {
    console.error('Get current user error:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to get current user'
    }
  }
}

// Update user profile
export const updateUserProfile = async (updates: Partial<AuthUser>): Promise<AuthResponse> => {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.updateUser({
      data: {
        first_name: updates.firstName,
        last_name: updates.lastName,
        phone: updates.phone
      }
    })

    if (error) {
      return { error: error.message }
    }

    if (data.user) {
      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
          firstName: data.user.user_metadata?.first_name,
          lastName: data.user.user_metadata?.last_name,
          phone: data.user.user_metadata?.phone,
          role: data.user.user_metadata?.role || 'user',
          createdAt: data.user.created_at
        }
      }
    }

    return { error: 'Profile update failed' }
  } catch (error) {
    console.error('Update profile error:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to update profile'
    }
  }
}

// Reset password
export const resetPassword = async (email: string): Promise<{ error?: string }> => {
  try {
    const supabase = createClient()
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    if (error) {
      return { error: error.message }
    }

    return {}
  } catch (error) {
    console.error('Reset password error:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to reset password'
    }
  }
}