/**
 * Tax Service - Frontend tax calculation using Square configuration
 * 
 * This service fetches tax configuration from Square and provides
 * standardized tax calculation for the frontend.
 */

'use client'

import { useState, useEffect } from 'react'

export interface TaxInfo {
  rate: number // Tax rate as decimal (e.g., 0.0825 for 8.25%)
  name: string
  enabled: boolean
  error?: string
}

let cachedTaxInfo: TaxInfo | null = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface CatalogTaxSummary {
  tax_data?: {
    enabled?: boolean
    name?: string
    percentage?: string
  }
}

/**
 * Fetches tax configuration from Square API
 */
async function fetchTaxConfiguration(): Promise<TaxInfo> {
  try {
    const response = await fetch('/api/square/tax-config')
    
    if (!response.ok) {
      throw new Error(`Tax config API failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Extract tax rate from catalog taxes
    const catalogTaxes: CatalogTaxSummary[] = data.taxConfig?.catalogTaxes || []
    
    if (catalogTaxes.length === 0) {
      return {
        rate: 0,
        name: 'No Tax',
        enabled: false,
        error: 'No tax configuration found in Square'
      }
    }
    
    // Filter for enabled taxes and use the first one
    const enabledTaxes = catalogTaxes.filter((tax): tax is CatalogTaxSummary & { tax_data: Required<CatalogTaxSummary['tax_data']> } => tax.tax_data?.enabled === true)
    const tax = enabledTaxes.length > 0 ? enabledTaxes[0] : catalogTaxes[0]
    
    if (!tax?.tax_data) {
      return {
        rate: 0,
        name: 'Invalid Tax',
        enabled: false,
        error: 'Invalid tax configuration'
      }
    }
    
    const percentage = parseFloat(tax.tax_data.percentage || '0')
    
    return {
      rate: percentage / 100, // Convert percentage to decimal
      name: tax.tax_data.name || 'Sales Tax',
      enabled: tax.tax_data.enabled || false
    }
    
  } catch (error) {
    console.error('Failed to fetch tax configuration:', error)
    
    // Return fallback configuration with error
    return {
      rate: 0,
      name: 'Tax Error',
      enabled: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Gets tax configuration with caching
 */
export async function getTaxInfo(): Promise<TaxInfo> {
  const now = Date.now()
  
  // Return cached result if still valid
  if (cachedTaxInfo && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedTaxInfo
  }
  
  // Fetch fresh tax configuration
  cachedTaxInfo = await fetchTaxConfiguration()
  lastFetchTime = now
  
  return cachedTaxInfo
}

/**
 * Calculates tax amount for a given subtotal
 */
export function calculateTax(subtotal: number, taxRate: number): number {
  return subtotal * taxRate
}

/**
 * Calculates cart totals including tax
 */
export function calculateCartTotals(subtotal: number, taxRate: number) {
  const tax = calculateTax(subtotal, taxRate)
  const total = subtotal + tax
  
  return {
    subtotal,
    tax,
    total,
    taxRate
  }
}

/**
 * Hook for tax information in React components
 */
export function useTaxInfo() {
  const [taxInfo, setTaxInfo] = useState<TaxInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    let mounted = true
    
    getTaxInfo()
      .then(info => {
        if (mounted) {
          setTaxInfo(info)
          setError(info.error || null)
          setLoading(false)
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message)
          setLoading(false)
        }
      })
    
    return () => {
      mounted = false
    }
  }, [])
  
  return { taxInfo, loading, error }
}

// For server-side or non-React usage
export { fetchTaxConfiguration }
