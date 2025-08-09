import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/middleware'

const SQUARE_BASE_URL = process.env.SQUARE_ENVIRONMENT === 'production' 
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com'

const SQUARE_VERSION = '2024-12-18'

function getHeaders() {
  return {
    'Square-Version': SQUARE_VERSION,
    'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  }
}

interface BulkAvailabilityRequest {
  itemIds: string[]
  isAvailable: boolean
}

export async function PATCH(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { itemIds, isAvailable }: BulkAvailabilityRequest = await request.json()

    if (!itemIds || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'No item IDs provided' },
        { status: 400 }
      )
    }

    console.log(`Admin bulk updating availability for ${itemIds.length} items to ${isAvailable}`)

    // Fetch current items to preserve their structure
    const fetchPromises = itemIds.map(async (itemId) => {
      const response = await fetch(`${SQUARE_BASE_URL}/v2/catalog/object/${itemId}`, {
        method: 'GET',
        headers: getHeaders()
      })
      
      if (response.ok) {
        const result = await response.json()
        return result.object
      }
      return null
    })

    const currentItems = (await Promise.all(fetchPromises)).filter(Boolean)

    if (currentItems.length === 0) {
      return NextResponse.json(
        { error: 'No valid items found to update' },
        { status: 404 }
      )
    }

    // Update availability for all items
    const updatedItems = currentItems.map(item => ({
      ...item,
      item_data: {
        ...item.item_data,
        available_for_pickup: isAvailable,
        available_online: isAvailable
      }
    }))

    // Batch update in Square
    const updateResponse = await fetch(`${SQUARE_BASE_URL}/v2/catalog/batch-upsert`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        idempotency_key: `admin-bulk-availability-${Date.now()}`,
        batches: [
          {
            objects: updatedItems
          }
        ]
      })
    })

    if (!updateResponse.ok) {
      const errorData = await updateResponse.text()
      throw new Error(`Square API error: ${updateResponse.status} ${errorData}`)
    }

    const result = await updateResponse.json()

    return NextResponse.json({
      success: true,
      updatedCount: updatedItems.length,
      items: result.objects,
      message: `Successfully ${isAvailable ? 'enabled' : 'disabled'} ${updatedItems.length} menu items`
    })
    
  } catch (error) {
    console.error('Failed to update item availability:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update item availability', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}