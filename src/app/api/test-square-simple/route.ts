import { NextResponse } from 'next/server'
import { testSquareConnection } from '@/lib/square/simple-client'

export async function GET() {
  try {
    const result = await testSquareConnection()
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Square API connection successful',
        locations: result.data
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Square API connection failed',
        error: result.error
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Square API test failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Square API connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}