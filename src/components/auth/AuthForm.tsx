'use client'

import { useState } from 'react'
import { Button, Input } from '@/components/ui'
import { validateEmail, validatePassword } from '@/lib/auth-utils'

interface AuthFormProps {
  mode: 'login' | 'signup'
  onSubmit: (email: string, password: string, fullName?: string) => Promise<void>
  onSwitchMode: () => void
  isLoading?: boolean
}

const AuthForm = ({ mode, onSubmit, onSwitchMode, isLoading = false }: AuthFormProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required'
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 6 characters long'
    }

    if (mode === 'signup' && !fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(email, password, mode === 'signup' ? fullName : undefined)
    } catch (error) {
      console.error('Auth error:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'signup' && (
        <Input
          label="Full Name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
          placeholder="Enter your full name"
          required
        />
      )}
      
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        placeholder="Enter your email"
        required
      />
      
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        placeholder="Enter your password"
        helper={mode === 'signup' ? 'Password must be at least 6 characters' : undefined}
        required
      />

      <Button
        type="submit"
        className="w-full"
        isLoading={isLoading}
      >
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={onSwitchMode}
          className="text-sm text-amber-600 hover:text-amber-700 underline"
        >
          {mode === 'login' 
            ? "Don't have an account? Sign up" 
            : 'Already have an account? Sign in'
          }
        </button>
      </div>
    </form>
  )
}

export default AuthForm