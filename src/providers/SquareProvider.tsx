'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
// Using any for Square types since we're loading from CDN

interface SquareContextType {
  payments: any | null
  isLoading: boolean
  error: string | null
}

const SquareContext = createContext<SquareContextType>({
  payments: null,
  isLoading: true,
  error: null
})

export function useSquarePayments() {
  const context = useContext(SquareContext)
  if (!context) {
    throw new Error('useSquarePayments must be used within a SquareProvider')
  }
  return context
}

interface SquareProviderProps {
  children: ReactNode
  applicationId: string
  locationId: string
  environment: 'sandbox' | 'production'
}

export function SquareProvider({ 
  children, 
  applicationId, 
  locationId, 
  environment = 'sandbox' 
}: SquareProviderProps) {
  const [payments, setPayments] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function initializeSquare() {
      try {
        setIsLoading(true)
        setError(null)

        // Load Square Web Payments SDK from CDN
        if (!(window as any).Square) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://sandbox.web.squarecdn.com/v1/square.js'
            script.onload = resolve
            script.onerror = reject
            document.head.appendChild(script)
          })
        }
        
        const paymentsInstance = await (window as any).Square.payments(applicationId, locationId, environment)
        
        setPayments(paymentsInstance)
      } catch (err) {
        console.error('Failed to initialize Square Payments:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize Square Payments')
      } finally {
        setIsLoading(false)
      }
    }

    if (applicationId && locationId) {
      initializeSquare()
    } else {
      setError('Missing Square configuration')
      setIsLoading(false)
    }
  }, [applicationId, locationId, environment])

  return (
    <SquareContext.Provider value={{ payments, isLoading, error }}>
      {children}
    </SquareContext.Provider>
  )
}