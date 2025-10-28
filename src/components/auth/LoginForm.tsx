'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { z } from 'zod'
import { toast } from 'react-hot-toast'
import type { Factor } from '@supabase/supabase-js'
import { AuthError, type Session } from '@supabase/supabase-js'

interface LoginFormProps {
  onSuccess?: (user: any) => void
  onSwitchToSignup?: () => void
}

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function LoginForm({ onSuccess, onSwitchToSignup }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [phase, setPhase] = useState<'login' | 'mfa'>('login')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaError, setMfaError] = useState<string | null>(null)
  const [mfaFactors, setMfaFactors] = useState<Factor[]>([])
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    alert('handleSubmit hit')
    e.preventDefault()
    setLoading(true)
    setErrors({})
    setMfaError(null)

    try {
      const validatedData = loginSchema.parse({ email, password })
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      })

      if (error) {
        if (requiresMfa(error)) {
          const triggered = await initiateMfaChallenge()
          if (triggered) {
            toast('Enter your authentication code to continue.', { icon: '🔒' })
            return
          }
        }
        throw error
      }

      if (!data.user) {
        throw new Error('Login failed. Please try again.')
      }

      const needMfa = await initiateMfaChallenge(data.session)
      if (needMfa) {
        toast('Enter your authentication code to continue.', { icon: '🔒' })
        return
      }

      toast.success('Welcome back!')
      onSuccess?.(data.user)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        setErrors({ general: error instanceof Error ? error.message : 'Login failed. Please try again.' })
        toast.error('Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const initiateMfaChallenge = async (initialSession?: Session | null) => {
    const immediateFactors = extractVerifiedTotpFactors(initialSession?.user)
    if (immediateFactors.length > 0) {
      setMfaFactors(immediateFactors)
      setSelectedFactorId(immediateFactors[0].id)
      setPhase('mfa')
      setLoading(false)
      return true
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const sessionFactors = extractVerifiedTotpFactors(sessionData?.session?.user)
    if (sessionFactors.length > 0) {
      setMfaFactors(sessionFactors)
      setSelectedFactorId(sessionFactors[0].id)
      setPhase('mfa')
      setLoading(false)
      return true
    }

    const factors = await loadVerifiedFactors()
    if (!factors || !factors.length) {
      return false
    }

    setMfaFactors(factors)
    setSelectedFactorId(factors[0].id)
    setPhase('mfa')
    setLoading(false)
    return true
  }

  const requiresMfa = (error: AuthError) => {
    return (
      error instanceof AuthError &&
      ('code' in error ? error.code === 'insufficient_aal' : false)
    )
  }

  const handleMfaSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedFactorId) {
      setMfaError('Select an authenticator to continue.')
      return
    }
    if (!mfaCode.trim()) {
      setMfaError('Enter the 6-digit code from your authenticator app.')
      return
    }

    setLoading(true)
    setMfaError(null)

    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: selectedFactorId,
        code: mfaCode.trim()
      })

      if (error) {
        throw error
      }

      const { data: userResponse, error: userError } = await supabase.auth.getUser()
      if (userError || !userResponse.user) {
        throw userError ?? new Error('Unable to fetch user')
      }

      toast.success('Two-factor challenge verified!')
      onSuccess?.(userResponse.user)
    } catch (error) {
      console.error('MFA verification failed', error)
      const message =
        error instanceof Error ? error.message : 'Verification failed. Please try again.'
      setMfaError(message)
      toast.error('The code you entered was invalid.')
    } finally {
      setLoading(false)
    }
  }

  const loadVerifiedFactors = async (): Promise<Factor[] | null> => {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) {
      console.error('Failed to list MFA factors', error)
      setErrors({
        general:
          'Two-factor authentication is required but factors could not be loaded. Contact support for assistance.'
      })
      return null
    }

    return data?.totp ?? []
  }

  const extractVerifiedTotpFactors = (user: any): Factor[] => {
    const rawFactors = Array.isArray(user?.factors) ? user.factors : []
    return rawFactors.filter(
      (factor: any) => factor?.factor_type === 'totp' && factor?.status === 'verified'
    )
  }

  return (
    <div className="w-full">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          {phase === 'login' ? 'Welcome Back' : 'Enter Your Authenticator Code'}
        </h2>
        <p className="text-gray-600 text-center mb-6">
          {phase === 'login'
            ? 'Sign in to your Little Cafe account'
            : 'Enter the 6-digit code from your authenticator app to finish signing in.'}
        </p>

        {errors.general && phase === 'login' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errors.general}
          </div>
        )}

        {phase === 'login' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  error={errors.email}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  error={errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                <span className="ml-2 text-gray-600">Remember me</span>
              </label>
              <button type="button" className="text-amber-600 hover:text-amber-700 font-medium">
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={loading}
            >
              Sign In
            </Button>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Authenticator Code
              </label>
              <Input
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                placeholder="123456"
                className="tracking-widest text-center text-lg"
              />
            </div>

            {mfaFactors.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose authenticator
                </label>
                <select
                  value={selectedFactorId ?? ''}
                  onChange={(event) => setSelectedFactorId(event.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {mfaFactors.map((factor) => (
                    <option key={factor.id} value={factor.id}>
                      {factor.friendly_name || 'Authenticator App'} ({new Date(factor.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {mfaError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {mfaError}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={loading}
            >
              Verify Code
            </Button>

            <button
              type="button"
              onClick={() => {
                setPhase('login')
                setMfaCode('')
                setSelectedFactorId(null)
              }}
              className="w-full text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              Use a different account
            </button>
          </form>
        )}

        {phase === 'login' && (
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don&apos;t have an account?{' '}
              <button
                onClick={onSwitchToSignup}
                className="text-amber-600 hover:text-amber-700 font-medium"
              >
                Sign up
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
