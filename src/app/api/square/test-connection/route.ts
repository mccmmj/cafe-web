import { NextResponse } from 'next/server'
import { listLocations } from '@/lib/square/fetch-client'
import { config } from '@/lib/square/client'

export async function GET() {
  try {
    console.log('Testing Square API connection...')
    console.log('Environment:', config.environment)
    console.log('Location ID:', config.locationId)
    
    // Test basic Square API connection using fetch client
    const result = await listLocations()
    
    if (!result.locations || result.locations.length === 0) {
      return NextResponse.json({
        error: 'No locations found in Square account',
        config: {
          environment: config.environment,
          hasLocationId: !!config.locationId,
          hasApplicationId: !!config.applicationId
        }
      }, { status: 500 })
    }
    
    const location = result.locations[0]
    
    return NextResponse.json({
      success: true,
      message: 'Square API connection working',
      location: {
        id: location.id,
        name: location.name,
        status: location.status
      },
      config: {
        environment: config.environment,
        locationId: config.locationId,
        hasApplicationId: !!config.applicationId
      }
    })
    
  } catch (error) {
    console.error('Square API connection test failed:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    
    return NextResponse.json({
      error: 'Square API connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      config: {
        environment: config.environment,
        hasLocationId: !!config.locationId,
        hasApplicationId: !!config.applicationId
      }
    }, { status: 500 })
  }
}