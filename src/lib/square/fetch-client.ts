// Square API client using fetch for better Next.js compatibility
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

function getLocationId() {
  return process.env.NODE_ENV === 'production'
    ? process.env.SQUARE_LOCATION_ID_PROD
    : process.env.SQUARE_LOCATION_ID
}

// Catalog API
export async function listCatalogObjects(types?: string[]) {
  try {
    const url = new URL(`${SQUARE_BASE_URL}/v2/catalog/list`)
    if (types) {
      url.searchParams.append('types', types.join(','))
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getHeaders()
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Square Catalog API error: ${response.status} ${errorData}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error listing catalog objects:', error)
    throw error
  }
}

export async function searchCatalogItems(query: any) {
  try {
    const response = await fetch(`${SQUARE_BASE_URL}/v2/catalog/search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(query)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Square Catalog Search API error: ${response.status} ${errorData}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error searching catalog items:', error)
    throw error
  }
}

// Orders API
export async function createOrder(orderData: any) {
  try {
    const response = await fetch(`${SQUARE_BASE_URL}/v2/orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        ...orderData,
        order: {
          ...orderData.order,
          location_id: getLocationId()
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Square Orders API detailed error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorData
      })
      throw new Error(`Square Orders API error: ${response.status} ${errorData}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating order:', error)
    throw error
  }
}

// Payments API
export async function createPayment(paymentData: any) {
  try {
    const response = await fetch(`${SQUARE_BASE_URL}/v2/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        ...paymentData,
        location_id: getLocationId()
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Square Payments API error: ${response.status} ${errorData}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating payment:', error)
    throw error
  }
}

// Locations API
export async function listLocations() {
  try {
    const response = await fetch(`${SQUARE_BASE_URL}/v2/locations`, {
      method: 'GET',
      headers: getHeaders()
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Square Locations API error: ${response.status} ${errorData}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error listing locations:', error)
    throw error
  }
}

// Configuration
export const squareConfig = {
  applicationId: process.env.NODE_ENV === 'production'
    ? process.env.SQUARE_APPLICATION_ID_PROD
    : process.env.SQUARE_APPLICATION_ID,
  environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
  locationId: getLocationId()
}