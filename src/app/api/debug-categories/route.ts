import { NextResponse } from 'next/server'
import { searchAllCatalogItems } from '@/lib/square/fetch-client'

export async function GET() {
  try {
    console.log('🔍 Debug: Fetching Square catalog for category analysis...')
    
    const catalogData = await searchAllCatalogItems()
    
    if (!catalogData.objects) {
      return NextResponse.json({ 
        message: 'No catalog objects found',
        totalObjects: 0
      })
    }

    // Analyze catalog objects by type
    const objectsByType = catalogData.objects.reduce((acc: any, obj: any) => {
      acc[obj.type] = (acc[obj.type] || 0) + 1
      return acc
    }, {})

    // Get all categories
    const rawCategories = catalogData.objects.filter((obj: any) => obj.type === 'CATEGORY')
    
    // Analyze category structure
    const categoryAnalysis = rawCategories.map((cat: any) => ({
      id: cat.id,
      name: cat.category_data?.name || 'Unnamed',
      hasParent: !!cat.category_data?.parent_category,
      parentId: cat.category_data?.parent_category?.id || null,
      isDeleted: cat.is_deleted || false,
      presentAtAllLocations: cat.present_at_all_locations
    }))

    // Group by parent-child relationships
    const topLevel = categoryAnalysis.filter(cat => !cat.hasParent)
    const childCategories = categoryAnalysis.filter(cat => cat.hasParent)

    return NextResponse.json({
      success: true,
      totalObjects: catalogData.objects.length,
      objectsByType,
      totalCategories: rawCategories.length,
      categoriesWithParents: childCategories.length,
      topLevelCategories: topLevel.length,
      categoryAnalysis: {
        topLevel,
        children: childCategories
      }
    })

  } catch (error) {
    console.error('Debug categories error:', error)
    return NextResponse.json({
      error: 'Failed to debug categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}