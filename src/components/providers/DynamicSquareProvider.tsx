'use client'

import { useEffect, useState, ReactNode } from 'react'
import { SquareProvider } from '@/providers/SquareProvider'

interface SquareConfig {
  applicationId: string
  locationId: string
  environment: 'sandbox' | 'production'
}

interface DynamicSquareProviderProps {
  children: ReactNode
}

export default function DynamicSquareProvider({ children }: DynamicSquareProviderProps) {
  const [config, setConfig] = useState<SquareConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch('/api/square/config')
        if (!response.ok) {
          throw new Error('Failed to fetch Square configuration')
        }
        
        const configData = await response.json()
        setConfig(configData)
      } catch (err) {
        console.error('Error fetching Square config:', err)
        setError(err instanceof Error ? err.message : 'Configuration error')
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  if (loading) {
    return <>{children}</>
  }

  if (error || !config) {
    console.warn('Square Payments not available:', error)
    return <>{children}</>
  }

  return (
    <SquareProvider
      applicationId={config.applicationId}
      locationId={config.locationId}
      environment={config.environment}
    >
      {children}
    </SquareProvider>
  )
}