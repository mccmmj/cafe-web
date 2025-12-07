'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatAuthError } from '@/lib/auth-utils'
import { Modal, Button, Input } from '@/components/ui'
import AuthForm from './AuthForm'
import type { Factor, Session } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'

interface AuthContainerProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'login' | 'signup'
}

const AuthContainer = ({ isOpen, onClose, defaultMode = 'login' }: AuthContainerProps) => {
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode)
  const [phase, setPhase] = useState<'login' | 'mfa'>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mfaFactors, setMfaFactors] = useState<Factor[]>([])
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  
  const supabase = createClient()

  const handleAuth = async (email: string, password: string, fullName?: string) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) throw error

        const needMfa = await initiateMfaChallenge(data.session)
        if (needMfa) {
          return
        }

        finalizeSuccess()
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

  const initiateMfaChallenge = async (initialSession?: Session | null) => {
    const immediateFactors = extractVerifiedTotpFactors(initialSession?.user)
    if (immediateFactors.length > 0) {
      setMfaFactors(immediateFactors)
      setSelectedFactorId(immediateFactors[0].id)
      setPhase('mfa')
      setIsLoading(false)
      toast('Enter your authentication code to continue.', { icon: '🔒' })
      return true
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const sessionFactors = extractVerifiedTotpFactors(sessionData?.session?.user)
    if (sessionFactors.length > 0) {
      setMfaFactors(sessionFactors)
      setSelectedFactorId(sessionFactors[0].id)
      setPhase('mfa')
      setIsLoading(false)
      toast('Enter your authentication code to continue.', { icon: '🔒' })
      return true
    }

    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) {
      console.error('Failed to list MFA factors', error)
      setError('Two-factor authentication is required but factors could not be loaded. Contact support.')
      return false
    }

    const factors = data?.totp ?? []
    if (!factors.length) {
      return false
    }

    setMfaFactors(factors)
    setSelectedFactorId(factors[0].id)
    setPhase('mfa')
    setIsLoading(false)
    toast('Enter your authentication code to continue.', { icon: '🔒' })
    return true
  }

  const handleVerifyMfa = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedFactorId) {
      setError('Select an authenticator to continue.')
      return
    }
    if (!mfaCode.trim()) {
      setError('Enter the 6-digit code from your authenticator app.')
      return
    }

    setIsLoading(true)
    setError(null)

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
        throw userError ?? new Error('Unable to fetch user details')
      }

      finalizeSuccess()
    } catch (err) {
      console.error('MFA verification failed', err)
      const message = err instanceof Error ? err.message : 'Verification failed. Please try again.'
      setError(message)
      toast.error('Invalid authentication code.')
    } finally {
      setIsLoading(false)
    }
  }

  const finalizeSuccess = () => {
    setSuccess('Successfully signed in!')
    setPhase('login')
    setMfaCode('')
    setMfaFactors([])
    setSelectedFactorId(null)
    setTimeout(() => {
      setSuccess(null)
      onClose()
    }, 800)
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
    setPhase('login')
    setError(null)
    setSuccess(null)
    setMfaFactors([])
    setSelectedFactorId(null)
    setMfaCode('')
  }

  const extractVerifiedTotpFactors = (user?: { factors?: Factor[] | null } | null): Factor[] => {
    const rawFactors = Array.isArray(user?.factors) ? user.factors : []
    return rawFactors.filter(
      (factor) => factor?.factor_type === 'totp' && factor?.status === 'verified'
    )
  }

  const mfaSelectOptions = useMemo(() => {
    return mfaFactors.map((factor) => ({
      id: factor.id,
      label: factor.friendly_name
        ? `${factor.friendly_name} (${new Date(factor.created_at).toLocaleDateString()})`
        : `Authenticator App (${new Date(factor.created_at).toLocaleDateString()})`
    }))
  }, [mfaFactors])
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={phase === 'mfa' ? 'Two-Factor Verification' : mode === 'login' ? 'Sign In' : 'Create Account'}
      description={
        phase === 'mfa'
          ? 'Enter the 6-digit code from your authenticator app to finish signing in.'
          : mode === 'login'
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

        {phase === 'login' ? (
          <AuthForm
            mode={mode}
            onSubmit={handleAuth}
            onSwitchMode={switchMode}
            isLoading={isLoading}
          />
        ) : (
          <form onSubmit={handleVerifyMfa} className="space-y-4">
            {mfaSelectOptions.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select authenticator
                </label>
                <select
                  value={selectedFactorId ?? ''}
                  onChange={(event) => setSelectedFactorId(event.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {mfaSelectOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Input
              label="Authenticator Code"
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              maxLength={10}
              placeholder="123456"
              required
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Verify Code
            </Button>

            <button
              type="button"
              onClick={() => {
                setPhase('login')
                setMfaFactors([])
                setSelectedFactorId(null)
                setMfaCode('')
                setError(null)
              }}
              className="text-sm text-amber-600 hover:text-amber-700 underline w-full text-center"
            >
              Use a different account
            </button>
          </form>
        )}
      </div>
    </Modal>
  )
}

export default AuthContainer
