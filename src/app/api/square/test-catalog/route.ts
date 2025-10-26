import { NextRequest, NextResponse } from 'next/server'
import { listCatalogObjects } from '@/lib/square/fetch-client'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing catalog objects...')
    
    // Get all catalog objects
    const result = await listCatalogObjects(['ITEM', 'ITEM_VARIATION'])
    
    console.log('Catalog result:', JSON.stringify(result, null, 2))
    
    // Find the specific variation IDs we're trying to use
    const testVariationIds = [
      '5GBBDNQQUYSGCRNHFAG7ON2T', // Breakfast Burrito
      'V6O4NECF3WU5TOBQHGR45GIO', // Café Latte  
      'ROOS4KCBAN2LKITBWI2VH6XE'  // Chocolate Chip Cookie
    ]
    
    const foundVariations = []
    const missingVariations = []
    
    if (result.objects) {
      for (const variationId of testVariationIds) {
        const found = result.objects.find((obj: any) => obj.id === variationId)
        if (found) {
          foundVariations.push({
            id: found.id,
            type: found.type,
            itemVariationData: found.item_variation_data
          })
        } else {
          missingVariations.push(variationId)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      totalObjects: result.objects?.length || 0,
      foundVariations,
      missingVariations,
      message: `Found ${foundVariations.length} of ${testVariationIds.length} variations`
    })
    
  } catch (error) {
    console.error('Test catalog error:', error)
    return NextResponse.json(
      { error: 'Failed to test catalog', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}