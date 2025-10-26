import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { getCachedSiteStatus } from '@/lib/services/siteSettings.edge'

function shouldBypassMaintenance(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/under-construction') ||
    pathname === '/favicon.ico'
  ) {
    return true
  }

  return false
}

function applyRewriteWithCookies(
  source: NextResponse,
  destinationUrl: URL
) {
  const rewriteResponse = NextResponse.rewrite(destinationUrl)
  source.headers.forEach((value, key) => {
    if (!['content-length'].includes(key.toLowerCase())) {
      rewriteResponse.headers.set(key, value)
    }
  })
  const cookies = source.cookies.getAll()
  cookies.forEach(cookie => {
    rewriteResponse.cookies.set(cookie)
  })
  return rewriteResponse
}

export async function middleware(request: NextRequest) {
  const sessionResponse = await updateSession(request)

  if (shouldBypassMaintenance(request)) {
    return sessionResponse
  }

  try {
    const status = await getCachedSiteStatus(request)
    if (!status.isCustomerAppLive) {
      const maintenanceUrl = request.nextUrl.clone()
      maintenanceUrl.pathname = '/under-construction'
      maintenanceUrl.searchParams.set('from', request.nextUrl.pathname)
      return applyRewriteWithCookies(sessionResponse, maintenanceUrl)
    }
  } catch (error) {
    console.error('Maintenance gate check failed:', error)
  }

  return sessionResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
