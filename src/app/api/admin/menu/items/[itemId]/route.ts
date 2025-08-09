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

interface UpdateItemRequest {
  name?: string
  description?: string
  isAvailable?: boolean
  variations?: Array<{
    id: string
    name: string
    price: number
  }>
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { itemId } = params
    const updateData: UpdateItemRequest = await request.json()

    console.log(`Admin updating menu item ${itemId}:`, updateData)

    // First, get the current item to preserve structure
    const currentItemResponse = await fetch(
      `${SQUARE_BASE_URL}/v2/catalog/object/${itemId}`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    )

    if (!currentItemResponse.ok) {
      const errorData = await currentItemResponse.text()
      throw new Error(`Failed to fetch current item: ${currentItemResponse.status} ${errorData}`)
    }

    const currentItemResult = await currentItemResponse.json()
    const currentItem = currentItemResult.object

    if (!currentItem || currentItem.type !== 'ITEM') {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Prepare the updated item data
    const updatedItem = {
      ...currentItem,
      item_data: {
        ...currentItem.item_data,
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.isAvailable !== undefined && { 
          available_for_pickup: updateData.isAvailable,
          available_online: updateData.isAvailable 
        })
      }
    }

    // Update variations if provided
    if (updateData.variations && updateData.variations.length > 0) {
      updatedItem.item_data.variations = currentItem.item_data.variations?.map(variation => {
        const updateVariation = updateData.variations?.find(v => v.id === variation.id)
        if (updateVariation) {
          return {
            ...variation,
            item_variation_data: {
              ...variation.item_variation_data,
              name: updateVariation.name,
              price_money: {
                amount: updateVariation.price,
                currency: 'USD'
              }
            }
          }
        }
        return variation
      })
    }

    // Update the item in Square
    const updateResponse = await fetch(`${SQUARE_BASE_URL}/v2/catalog/batch-upsert`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        idempotency_key: `admin-update-${itemId}-${Date.now()}`,
        batches: [
          {
            objects: [updatedItem]
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
      item: result.objects?.[0],
      message: 'Menu item updated successfully'
    })
    
  } catch (error) {
    console.error('Failed to update menu item:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update menu item', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { itemId } = params

    console.log(`Admin deleting menu item ${itemId}`)

    // Delete the item from Square catalog
    const deleteResponse = await fetch(`${SQUARE_BASE_URL}/v2/catalog/object/${itemId}`, {
      method: 'DELETE',
      headers: getHeaders()
    })

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.text()
      throw new Error(`Square API error: ${deleteResponse.status} ${errorData}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Menu item deleted successfully'
    })
    
  } catch (error) {
    console.error('Failed to delete menu item:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete menu item', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}