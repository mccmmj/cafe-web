import { NextResponse } from 'next/server'
import { addSecurityHeaders } from '@/lib/security/headers'
import { getSiteStatusUsingServiceClient } from '@/lib/services/siteSettings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const status = await getSiteStatusUsingServiceClient()

    return addSecurityHeaders(NextResponse.json({
      success: true,
      status
    }))
  } catch (error) {
    console.error('Failed to fetch public site status:', error)
    return addSecurityHeaders(NextResponse.json(
      { success: false, error: 'Unable to load site status' },
      { status: 500 }
    ))
  }
}
