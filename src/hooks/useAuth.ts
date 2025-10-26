'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuthUser } from '@/lib/api/auth'
import { signInWithEmail, signUpWithEmail, signOut, getCurrentUser } from '@/lib/api/auth'
import type { LoginFormData, SignupFormData } from '@/lib/validations'

export interface UseAuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
  signIn: (data: LoginFormData) => Promise<void>
  signUp: (data: SignupFormData) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  refreshUser: () => Promise<void>
}

export function useAuth(): UseAuthState {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await getCurrentUser()
        if (response.user) {
          setUser(response.user)
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            firstName: session.user.user_metadata?.first_name,
            lastName: session.user.user_metadata?.last_name,
            role: session.user.user_metadata?.role || 'user',
            createdAt: session.user.created_at
          })
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signIn = useCallback(async (data: LoginFormData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await signInWithEmail(data)
      if (response.error) {
        setError(response.error)
      } else if (response.user) {
        setUser(response.user)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const signUp = useCallback(async (data: SignupFormData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await signUpWithEmail(data)
      if (response.error) {
        setError(response.error)
      } else if (response.user) {
        setUser(response.user)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await signOut()
      if (response.error) {
        setError(response.error)
      } else {
        setUser(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getCurrentUser()
      if (response.user) {
        setUser(response.user)
      } else if (response.error) {
        setError(response.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh user')
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    logout,
    clearError,
    refreshUser
  }
}