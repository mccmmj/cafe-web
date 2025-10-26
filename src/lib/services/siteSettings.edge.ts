import type { NextRequest } from 'next/server'
import type { SiteStatus } from '@/types/settings'
import { DEFAULT_SITE_STATUS } from './siteSettings.shared'

type CacheEntry = {
  status: SiteStatus
  expiresAt: number
}

const CACHE_TTL_MS = 5 * 1000

declare global {
  // eslint-disable-next-line no-var
  var __siteStatusCacheEdge: CacheEntry | undefined
}

async function fetchSiteStatus(request: NextRequest): Promise<SiteStatus> {
  try {
    const statusUrl = new URL('/api/public/site-status', request.url)
    const response = await fetch(statusUrl, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error('Failed to load site status route:', response.status)
      return DEFAULT_SITE_STATUS
    }

    const data = await response.json()
    return data.status ?? DEFAULT_SITE_STATUS
  } catch (error) {
    console.error('Error fetching site status via middleware:', error)
    return DEFAULT_SITE_STATUS
  }
}

export async function getCachedSiteStatus(request: NextRequest, forceRefresh = false): Promise<SiteStatus> {
  const now = Date.now()
  const cache = globalThis.__siteStatusCacheEdge

  if (!forceRefresh && cache && cache.expiresAt > now) {
    return cache.status
  }

  const status = await fetchSiteStatus(request)
  globalThis.__siteStatusCacheEdge = {
    status,
    expiresAt: now + CACHE_TTL_MS
  } as CacheEntry

  return status
}

export function invalidateSiteStatusCache() {
  globalThis.__siteStatusCacheEdge = undefined
}
