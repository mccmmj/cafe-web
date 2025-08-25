/**
 * Security headers configuration
 * Protects against common web vulnerabilities
 */

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  
  // Prevent XSS attacks
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-XSS-Protection', '1; mode=block')
  
  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://web.squarecdn.com https://connect.squareup.com https://js.squareup.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://connect.squareup.com https://pci-connect.squareup.com wss: https:",
    "frame-src 'self' https://connect.squareup.com https://js.squareup.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
  
  headers.set('Content-Security-Policy', csp)
  
  // Referrer policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions policy (formerly Feature Policy)
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

/**
 * CORS configuration for API endpoints
 */
export function configureCORS(origin?: string) {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean)
  
  const isAllowedOrigin = origin && allowedOrigins.includes(origin)
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0] || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400' // 24 hours
  }
}

/**
 * Add CORS headers to response
 */
export function addCORSHeaders(response: Response, origin?: string): Response {
  const corsHeaders = configureCORS(origin)
  const headers = new Headers(response.headers)
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value)
  })
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

/**
 * Handle preflight OPTIONS request
 */
export function handlePreflight(origin?: string): Response {
  const corsHeaders = configureCORS(origin)
  
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  })
}