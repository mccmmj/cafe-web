import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/middleware'

const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN
const squareEnvironment = process.env.SQUARE_ENVIRONMENT || 'sandbox'

const SQUARE_BASE_URL =
  squareEnvironment === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com'
const SQUARE_VERSION = '2024-12-18'

interface SquareCatalogObject {
  id: string
  item_data?: {
    name?: string
    variations?: Array<{
      id: string
      item_variation_data?: {
        name?: string
        sku?: string
        price_money?: {
          amount?: number
          currency?: string
        }
      }
    }>
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    if (!squareAccessToken) {
      return NextResponse.json(
        { success: false, error: 'Square credentials are not configured' },
        { status: 500 }
      )
    }

    const query = request.nextUrl.searchParams.get('q')?.trim()
    if (!query || query.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Search term must be at least 2 characters' },
        { status: 400 }
      )
    }

    const limit = Math.min(
      Math.max(parseInt(request.nextUrl.searchParams.get('limit') || '5', 10), 1),
      25
    )

    const response = await fetch(`${SQUARE_BASE_URL}/v2/catalog/search`, {
      method: 'POST',
      headers: {
        'Square-Version': SQUARE_VERSION,
        Authorization: `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        object_types: ['ITEM'],
        query: {
          text_query: {
            keywords: [query.slice(0, 100)]
          }
        },
        include_related_objects: false,
        limit
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Square search error:', errorText)
      return NextResponse.json(
        { success: false, error: 'Square search failed' },
        { status: 502 }
      )
    }

    const payload = await response.json()
    const objects: SquareCatalogObject[] = payload.objects || []

    const results = objects.flatMap((item) => {
      const itemName = item.item_data?.name || 'Unnamed Item'
      const variations = item.item_data?.variations || []
      if (variations.length === 0) {
        return [
          {
            itemId: item.id,
            itemName,
            variationId: item.id,
            variationName: 'Default',
            sku: undefined,
            price: undefined,
            currency: undefined
          }
        ]
      }

      return variations.map((variation) => ({
        itemId: item.id,
        itemName,
        variationId: variation.id,
        variationName: variation.item_variation_data?.name || 'Variation',
        sku: variation.item_variation_data?.sku || undefined,
        price:
          typeof variation.item_variation_data?.price_money?.amount === 'number'
            ? variation.item_variation_data?.price_money?.amount / 100
            : undefined,
        currency: variation.item_variation_data?.price_money?.currency
      }))
    })

    return NextResponse.json({
      success: true,
      results
    })
  } catch (error) {
    console.error('Square catalog search failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error searching Square catalog'
      },
      { status: 500 }
    )
  }
}
