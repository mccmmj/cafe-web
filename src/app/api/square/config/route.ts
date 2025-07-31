import { NextResponse } from 'next/server'
import { config } from '@/lib/square/client'

export async function GET() {
  try {
    // Only return public configuration that's safe for the frontend
    return NextResponse.json({
      applicationId: config.applicationId,
      locationId: config.locationId,
      environment: config.environment
    })
  } catch (error) {
    console.error('Error fetching Square config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Square configuration' },
      { status: 500 }
    )
  }
}