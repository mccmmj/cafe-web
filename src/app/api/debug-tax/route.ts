import { NextRequest, NextResponse } from 'next/server'

// Test the Square API directly without using our helper function
const SQUARE_BASE_URL = process.env.SQUARE_ENVIRONMENT === 'production' 
  ? 'https://connect.squareup.com' 
  : 'https://connect.squareupsandbox.com'

const SQUARE_VERSION = '2024-12-18'

function getHeaders() {
  const accessToken = process.env.NODE_ENV === 'production'
    ? process.env.SQUARE_ACCESS_TOKEN_PROD
    : process.env.SQUARE_ACCESS_TOKEN

  return {
    'Square-Version': SQUARE_VERSION,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('Debug: Testing Square tax API directly...')
    
    // Test direct API call to Square
    const response = await fetch(`${SQUARE_BASE_URL}/v2/catalog/search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        object_types: ['TAX']
      })
    })

    console.log('Debug: Response status:', response.status)
    console.log('Debug: Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorData = await response.text()
      console.error('Debug: API error:', errorData)
      return NextResponse.json({
        error: 'Square API error',
        status: response.status,
        details: errorData
      }, { status: 500 })
    }

    const data = await response.json()
    console.log('Debug: Raw response:', JSON.stringify(data, null, 2))
    
    return NextResponse.json({
      success: true,
      status: response.status,
      foundTaxes: data.objects?.length || 0,
      taxes: data.objects || [],
      rawResponse: data
    })
    
  } catch (error) {
    console.error('Debug: Failed to fetch taxes:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch taxes', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}