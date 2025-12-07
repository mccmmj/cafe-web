// Simple Square API client using fetch instead of SDK for testing
const SQUARE_BASE_URL = process.env.SQUARE_ENVIRONMENT === 'production' 
  ? 'https://connect.squareup.com' 
  : 'https://connect.squareupsandbox.com'

const headers = {
  'Square-Version': '2024-12-18',
  'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
}

interface SquareLocationResponse {
  locations?: SquareLocationSummary[]
}

interface SquareLocationSummary {
  id: string
  name: string
  status?: string
}

export async function testSquareConnection() {
  try {
    const response = await fetch(`${SQUARE_BASE_URL}/v2/locations`, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Square API error: ${response.status} ${errorData}`)
    }

    const data = await response.json() as SquareLocationResponse
    return {
      success: true,
      data: data.locations?.map((location) => ({
        id: location.id,
        name: location.name,
        status: location.status
      })) || []
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
