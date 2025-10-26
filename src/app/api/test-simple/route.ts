import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simple environment test
    const hasSquareConfig = !!(
      process.env.SQUARE_ACCESS_TOKEN && 
      process.env.SQUARE_APPLICATION_ID &&
      process.env.SQUARE_LOCATION_ID
    )
    
    const hasSupabaseConfig = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    return NextResponse.json({
      success: true,
      environment: process.env.NODE_ENV,
      square: {
        configured: hasSquareConfig,
        environment: process.env.SQUARE_ENVIRONMENT,
        applicationId: process.env.SQUARE_APPLICATION_ID ? '✓ Set' : '✗ Missing',
        accessToken: process.env.SQUARE_ACCESS_TOKEN ? '✓ Set' : '✗ Missing',
        locationId: process.env.SQUARE_LOCATION_ID ? '✓ Set' : '✗ Missing'
      },
      supabase: {
        configured: hasSupabaseConfig,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}