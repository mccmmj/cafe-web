import { NextResponse } from 'next/server'
import { locationsApi } from '@/lib/square/client'

export async function GET() {
  try {
    // Test Square connection by listing locations
    const { result } = await locationsApi.listLocations()
    
    return NextResponse.json({
      success: true,
      message: 'Square API connection successful',
      locations: result.locations?.map(location => ({
        id: location.id,
        name: location.name,
        status: location.status
      })) || []
    })
  } catch (error) {
    console.error('Square API test failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Square API connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}