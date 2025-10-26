import { NextRequest, NextResponse } from 'next/server'
import { listCatalogObjects } from '@/lib/square/fetch-client'

export async function POST(request: NextRequest) {
  try {
    const { catalogObjectId } = await request.json()
    
    if (!catalogObjectId) {
      return NextResponse.json({ error: 'catalogObjectId required' }, { status: 400 })
    }
    
    console.log('Validating catalog object ID:', catalogObjectId)
    
    // Fetch all catalog objects to see what's available
    const catalogData = await listCatalogObjects(['ITEM', 'ITEM_VARIATION', 'CATEGORY'])
    
    if (!catalogData.objects) {
      return NextResponse.json({
        error: 'No catalog objects found',
        exists: false
      })
    }
    
    // Check if the specific ID exists
    const foundObject = catalogData.objects.find((obj: any) => obj.id === catalogObjectId)
    
    return NextResponse.json({
      exists: !!foundObject,
      objectDetails: foundObject || null,
      totalCatalogObjects: catalogData.objects.length,
      allObjectIds: catalogData.objects.map((obj: any) => ({
        id: obj.id,
        type: obj.type,
        name: obj.item_data?.name || obj.item_variation_data?.name || obj.category_data?.name || 'Unknown'
      }))
    })
    
  } catch (error) {
    console.error('Error validating catalog object:', error)
    return NextResponse.json({
      error: 'Failed to validate catalog object',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}