'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Factor } from '@supabase/supabase-js'
import { ShieldCheck, ShieldAlert, Loader2, RefreshCcw, Copy, Trash2 } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { toast } from 'react-hot-toast'

type TOTPEnrollment = {
  factorId: string
  qrSvg: string
  secret: string
}

type AssuranceInfo = {
  currentLevel: 'aal1' | 'aal2' | null
  nextLevel: 'aal1' | 'aal2' | null
}

export default function TwoFactorSettings() {
  const [loading, setLoading] = useState(true)
  const [factors, setFactors] = useState<Factor[]>([])
  const [assurance, setAssurance] = useState<AssuranceInfo | null>(null)
  const [enrollment, setEnrollment] = useState<TOTPEnrollment | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supportsTotp, setSupportsTotp] = useState(true)

  const verifiedTotpFactors = useMemo(
    () => factors.filter((factor) => factor.factor_type === 'totp' && factor.status === 'verified'),
    [factors]
  )

  const supabase = useMemo(() => createClient(), [])

  const refreshState = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [factorRes, aalRes] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      ])

      if (factorRes.error) {
        if (factorRes.error.code === 'mfa_totp_enroll_not_enabled') {
          setSupportsTotp(false)
        } else {
          throw factorRes.error
        }
      } else {
        setFactors(factorRes.data?.all ?? [])
      }

      if (aalRes.error) {
        throw aalRes.error
      } else {
        setAssurance(aalRes.data ?? null)
      }
    } catch (err) {
      console.error('Failed to load MFA data', err)
      setError('Could not load multi-factor settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void refreshState()
  }, [refreshState])

  const beginEnrollment = async () => {
    setWorking(true)
    setError(null)
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (enrollError) {
        if (enrollError.code === 'mfa_totp_enroll_not_enabled') {
          setSupportsTotp(false)
          setError('TOTP enrollment is not enabled for this project. Enable it in Supabase Auth settings.')
          return
        }
        throw enrollError
      }
      if (!data) {
        throw new Error('No enrollment data returned.')
      }

      setEnrollment({
        factorId: data.id,
        qrSvg: data.totp.qr_code,
        secret: data.totp.secret
      })
      setVerificationCode('')
      toast.success('Authenticator enrollment created. Scan the QR code to continue.')
    } catch (err) {
      console.error('MFA enroll error', err)
      setError(err instanceof Error ? err.message : 'Unable to start enrollment.')
    } finally {
      setWorking(false)
    }
  }

  const cancelEnrollment = async () => {
    if (!enrollment) {
      return
    }
    setWorking(true)
    try {
      await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId })
    } catch (err) {
      console.warn('Failed to clean up pending factor', err)
    } finally {
      setEnrollment(null)
      setVerificationCode('')
      setWorking(false)
      void refreshState()
    }
  }

  const verifyEnrollment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!enrollment) {
      return
    }
    if (!verificationCode.trim()) {
      setError('Enter the 6-digit code from your authenticator app.')
      return
    }

    setWorking(true)
    setError(null)
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollment.factorId,
        code: verificationCode.trim()
      })

      if (verifyError) {
        throw verifyError
      }

      toast.success('Two-factor authentication enabled.')
      setEnrollment(null)
      setVerificationCode('')
      await refreshState()
    } catch (err) {
      console.error('MFA verify error', err)
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.')
    } finally {
      setWorking(false)
    }
  }

  const disableFactor = async (factorId: string) => {
    setWorking(true)
    setError(null)
    try {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId })
      if (unenrollError) {
        throw unenrollError
      }
      toast.success('Two-factor authentication disabled for this factor.')
      await refreshState()
    } catch (err) {
      console.error('MFA disable error', err)
      setError(err instanceof Error ? err.message : 'Could not disable the factor.')
    } finally {
      setWorking(false)
    }
  }

  const copySecret = () => {
    if (!enrollment) return
    navigator.clipboard.writeText(enrollment.secret).then(() => {
      toast.success('Secret copied to clipboard')
    }).catch(() => {
      toast.error('Unable to copy secret')
    })
  }

  const renderEnrollmentPanel = () => {
    if (!enrollment) return null

    return (
      <Card variant="default" className="p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Finish Two-Factor Setup</h3>
        <p className="text-sm text-gray-600 mb-4">
          Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter the 6-digit code to verify.
        </p>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div
              className="w-48 h-48"
              dangerouslySetInnerHTML={{ __html: enrollment.qrSvg }}
            />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manual Entry Code
              </label>
              <div className="flex items-center gap-2">
                <code className="px-3 py-2 bg-gray-100 rounded-md text-sm tracking-widest">
                  {enrollment.secret}
                </code>
                <Button type="button" variant="outline" size="sm" onClick={copySecret}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>

            <form onSubmit={verifyEnrollment} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <Input
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  placeholder="123456"
                  maxLength={10}
                  className="max-w-xs tracking-widest text-center text-lg"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" variant="primary" disabled={working}>
                  {working && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Verify & Enable
                </Button>
                <Button type="button" variant="ghost" onClick={cancelEnrollment} disabled={working}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Card>
    )
  }

  const renderCurrentFactors = () => {
    if (!verifiedTotpFactors.length) {
      return (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <div className="text-sm text-amber-700">
            Two-factor authentication is currently disabled. Enable it to add an extra layer of protection to your account.
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {verifiedTotpFactors.map((factor) => (
          <div key={factor.id} className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Authenticator App
              </p>
              <p className="text-xs text-gray-500">
                Created {new Date(factor.created_at).toLocaleString()}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => disableFactor(factor.id)}
              disabled={working}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Disable
            </Button>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <Card variant="default" className="p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading security settings...
        </div>
      </Card>
    )
  }

  if (!supportsTotp) {
    return (
      <Card variant="default" className="p-6">
        <div className="flex items-start gap-3 text-amber-700">
          <ShieldAlert className="w-5 h-5 mt-1" />
          <div>
            <h3 className="text-base font-semibold text-gray-900">Two-Factor Authentication Not Enabled</h3>
            <p className="text-sm">
              TOTP-based two-factor authentication is disabled for this Supabase project. Enable it in the Supabase dashboard (Authentication → Multi-factor Auth) to allow users to configure a second factor.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card variant="default" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary-600" />
              Two-Factor Authentication
            </h2>
            <p className="text-sm text-gray-600">
              Protect your account with a second layer of security using an authenticator app.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={refreshState} disabled={working}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {assurance && (
          <div className="mb-4 text-sm text-gray-600">
            Current assurance level: <span className="font-semibold text-gray-800">{assurance.currentLevel ?? 'aal1'}</span>
            {assurance.nextLevel && assurance.nextLevel !== assurance.currentLevel && (
              <span className="ml-2 text-amber-600">
                ({assurance.nextLevel} available after verifying a factor)
              </span>
            )}
          </div>
        )}

        {renderCurrentFactors()}

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        {!enrollment ? (
          <div className="mt-6">
            <Button
              type="button"
              variant="primary"
              onClick={beginEnrollment}
              disabled={working}
            >
              {working && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {verifiedTotpFactors.length ? 'Add another authenticator' : 'Enable authenticator app'}
            </Button>
          </div>
        ) : null}
      </Card>

      {renderEnrollmentPanel()}
    </div>
  )
}
