'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Mail, Eye, EyeOff, Coffee, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui'
import type { Factor, Session } from '@supabase/supabase-js'
import { AuthError } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [phase, setPhase] = useState<'login' | 'mfa'>('login')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaError, setMfaError] = useState<string | null>(null)
  const [mfaFactors, setMfaFactors] = useState<Factor[]>([])
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMfaError(null)

    try {
      // Sign in with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        if (requiresMfa(authError)) {
          setPendingUserId(null)
          const triggered = await initiateMfaChallenge()
          if (triggered) {
            toast('Enter your authentication code to continue.', { icon: '🔒' })
            return
          }
        }
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError('Login failed')
        return
      }

      const needMfa = await initiateMfaChallenge(authData.session)
      if (needMfa) {
        setPendingUserId(authData.user.id)
        toast('Enter your authentication code to continue.', { icon: '🔒' })
        return
      }

      await finishAdminLogin(authData.user.id)

    } catch (error) {
      console.error('Admin login error:', error)
      setError('An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setIsResetting(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/reset-password`
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage('Password reset email sent! Check your inbox.')
      }
    } catch (error) {
      console.error('Failed to send reset email:', error)
      setError('Failed to send reset email')
    } finally {
      setIsResetting(false)
    }
  }

  const initiateMfaChallenge = async (initialSession?: Session | null) => {
    const immediateFactors = extractVerifiedTotpFactors(initialSession?.user)
    if (immediateFactors.length > 0) {
      setPhase('mfa')
      setMfaFactors(immediateFactors)
      setSelectedFactorId(immediateFactors[0].id)
      setLoading(false)
      return true
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const sessionFactors = extractVerifiedTotpFactors(sessionData?.session?.user)
    if (sessionFactors.length > 0) {
      setPhase('mfa')
      setMfaFactors(sessionFactors)
      setSelectedFactorId(sessionFactors[0].id)
      setLoading(false)
      return true
    }

    const factors = await loadVerifiedFactors()
    if (!factors || !factors.length) {
      return false
    }

    setPhase('mfa')
    setMfaFactors(factors)
    setSelectedFactorId(factors[0].id)
    setLoading(false)
    return true
  }

  const requiresMfa = (error: AuthError) => error instanceof AuthError && error.code === 'insufficient_aal'

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

      const { data: userRes, error: userError } = await supabase.auth.getUser()
      if (userError || !userRes.user) {
        throw userError ?? new Error('Unable to load user information')
      }

      await finishAdminLogin(pendingUserId ?? userRes.user.id)
    } catch (err) {
      console.error('MFA verification failed', err)
      const message = err instanceof Error ? err.message : 'Verification failed. Try again.'
      setMfaError(message)
      toast.error('Invalid authentication code.')
    } finally {
      setLoading(false)
    }
  }

  const loadVerifiedFactors = async (): Promise<Factor[] | null> => {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) {
      console.error('Failed to load factors', error)
      setError('Two-factor authentication is required but factors could not be loaded. Contact support.')
      return null
    }
    return data?.totp ?? []
  }

  type FactorContainer = { factors?: Factor[] | null }

  const isVerifiedTotpFactor = (factor: Factor | null | undefined): factor is Factor => {
    return Boolean(factor && factor.factor_type === 'totp' && factor.status === 'verified')
  }

  const extractVerifiedTotpFactors = (user: FactorContainer | null | undefined): Factor[] => {
    const rawFactors = Array.isArray(user?.factors) ? user.factors : []
    return rawFactors.filter(isVerifiedTotpFactor)
  }

  const finishAdminLogin = async (userId: string) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError) {
      setError('Failed to verify admin access')
      await supabase.auth.signOut()
      return
    }

    if (profile.role !== 'admin') {
      setError('Admin access required. This account does not have admin privileges.')
      await supabase.auth.signOut()
      return
    }

    router.push('/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary-600 p-3 rounded-full">
              <Coffee className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Little Cafe</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Admin Login</h2>
          <p className="text-gray-600">Access the admin dashboard to manage orders and inventory</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {phase === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="admin@littlecafe.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {message && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-green-700 text-sm">{message}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing In...' : 'Sign In to Admin Dashboard'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="flex items-center gap-3 text-gray-700">
                <ShieldCheck className="w-5 h-5 text-primary-600" />
                <span>Two-factor authentication required</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authenticator Code
                </label>
                <input
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent tracking-widest text-center text-lg"
                  placeholder="123456"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                  {mfaError}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !mfaCode}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setPhase('login')
                  setMfaCode('')
                  setSelectedFactorId(null)
                  setPendingUserId(null)
                }}
                className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign in with a different account
              </button>
            </form>
          )}

          {phase === 'login' && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isResetting || !email}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:text-gray-400"
              >
                {isResetting ? 'Sending...' : 'Forgot your password?'}
              </button>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Need access? Contact the system administrator.
            </p>
            <button
              onClick={() => router.push('/')}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2"
            >
              ← Back to Customer Site
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
