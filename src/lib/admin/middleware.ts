import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimiters } from '@/lib/security/rate-limiter'
import { addSecurityHeaders } from '@/lib/security/headers'

/**
 * Admin authentication middleware for API routes with enhanced security
 * Returns admin auth info or NextResponse error
 */
export async function requireAdminAuth(request: NextRequest) {
  try {
    // Apply admin-specific rate limiting
    const rateLimitResult = rateLimiters.admin(request)
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: rateLimitResult.error },
        { status: 429 }
      )
      Object.entries(rateLimitResult.headers || {}).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return addSecurityHeaders(response)
    }

    // CSRF protection check
    const referer = request.headers.get('referer')
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    
    // Allow requests from same origin or valid referer
    const allowedOrigins = [
      `https://${host}`,
      `http://${host}`,
      'http://localhost:3000',
      'http://localhost:3001'
    ]
    
    const hasValidOrigin = origin && allowedOrigins.includes(origin)
    const hasValidReferer = referer && allowedOrigins.some(allowed => referer.startsWith(allowed))
    
    if (!hasValidOrigin && !hasValidReferer) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 }
      ))
    }

    const supabase = await createClient()
    
    // Get the user from the request (using cookies)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ))
    }
    
    // Check if user has admin role with additional validation
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, created_at, last_sign_in_at')
      .eq('id', user.id)
      .single()
    
    if (profileError || profile?.role !== 'admin') {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      ))
    }
    
    // Check for suspicious activity (optional additional validation)
    const lastSignIn = profile.last_sign_in_at ? new Date(profile.last_sign_in_at) : null
    const now = new Date()
    const sessionAge = lastSignIn ? (now.getTime() - lastSignIn.getTime()) / 1000 / 60 / 60 : 0 // hours
    
    if (sessionAge > 24) { // Session older than 24 hours
      console.warn(`Admin session potentially stale for user ${user.id}: ${sessionAge} hours old`)
    }
    
    return { 
      user, 
      profile,
      userId: user.id, // Helper for convenience
      sessionInfo: {
        age: sessionAge,
        ip: getClientIP(request)
      }
    }
  } catch (error) {
    console.error('Admin auth middleware error:', error)
    return addSecurityHeaders(NextResponse.json(
      { error: 'Authentication error' },
      { status: 500 }
    ))
  }
}

/**
 * Extract client IP for logging and security
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}