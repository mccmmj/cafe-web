import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Validate required environment variables
    const requiredVars = {
      applicationId: process.env.SQUARE_APPLICATION_ID,
      locationId: process.env.SQUARE_LOCATION_ID,
      environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
      accessToken: process.env.SQUARE_ACCESS_TOKEN
    }

    const missingVars = Object.entries(requiredVars)
      .filter(([key, value]) => !value && key !== 'environment')
      .map(([key]) => key)

    if (missingVars.length > 0) {
      console.error('Missing Square environment variables:', missingVars)
      return NextResponse.json(
        { error: `Missing Square configuration: ${missingVars.join(', ')}` },
        { status: 500 }
      )
    }

    // Only return public configuration that's safe for the frontend
    return NextResponse.json({
      applicationId: requiredVars.applicationId,
      locationId: requiredVars.locationId,
      environment: requiredVars.environment
    })
  } catch (error) {
    console.error('Error fetching Square config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Square configuration' },
      { status: 500 }
    )
  }
}
