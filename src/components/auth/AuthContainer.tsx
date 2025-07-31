'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatAuthError } from '@/lib/auth-utils'
import { Modal } from '@/components/ui'
import AuthForm from './AuthForm'

interface AuthContainerProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'login' | 'signup'
}

const AuthContainer = ({ isOpen, onClose, defaultMode = 'login' }: AuthContainerProps) => {
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const supabase = createClient()

  const handleAuth = async (email: string, password: string, fullName?: string) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) throw error
        
        setSuccess('Successfully signed in!')
        setTimeout(() => {
          onClose()
        }, 1000)
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })
        
        if (error) throw error
        
        setSuccess('Account created! Please check your email to verify your account.')
      }
    } catch (error) {
      setError(formatAuthError(error))
    } finally {
      setIsLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
    setError(null)
    setSuccess(null)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'login' ? 'Sign In' : 'Create Account'}
      description={mode === 'login' 
        ? 'Welcome back! Please sign in to your account.' 
        : 'Join Little Cafe to track your orders and favorites.'
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
            {success}
          </div>
        )}

        <AuthForm
          mode={mode}
          onSubmit={handleAuth}
          onSwitchMode={switchMode}
          isLoading={isLoading}
        />
      </div>
    </Modal>
  )
}

export default AuthContainer