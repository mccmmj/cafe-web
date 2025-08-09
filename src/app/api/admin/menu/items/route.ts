import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/middleware'
import { searchAllCatalogItems } from '@/lib/square/fetch-client'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult // Return the error response
    }

    console.log('Admin fetching menu items for management...')
    
    // Fetch all catalog items from Square
    const catalogResult = await searchAllCatalogItems()
    
    if (!catalogResult.objects) {
      return NextResponse.json(
        { error: 'No menu items found' },
        { status: 404 }
      )
    }

    // Separate items and categories
    const allItems = catalogResult.objects.filter(obj => obj.type === 'ITEM')
    const allCategories = catalogResult.objects.filter(obj => obj.type === 'CATEGORY')
    
    // Create category lookup map
    const categoryMap = new Map()
    allCategories.forEach(category => {
      categoryMap.set(category.id, category.category_data.name)
    })

    console.log('📂 Found categories:', Array.from(categoryMap.entries()))

    // Process items for admin management view
    const items = allItems.map(item => {
      // Get category name from category lookup
      const categoryId = item.item_data.categories?.[0]?.id || item.item_data.category_id
      const categoryName = categoryId ? categoryMap.get(categoryId) || 'Uncategorized' : 'Uncategorized'
      
      return {
        id: item.id,
        name: item.item_data.name,
        description: item.item_data.description || '',
        categoryId: categoryId,
        categoryName: categoryName,
        isAvailable: item.item_data.available_for_pickup !== false && item.item_data.available_online !== false,
        variations: item.item_data.variations?.map(variation => ({
          id: variation.id,
          name: variation.item_variation_data.name,
          price: variation.item_variation_data.price_money?.amount || 0,
          currency: variation.item_variation_data.price_money?.currency || 'USD',
          isDefault: variation.item_variation_data.ordinal === 0
        })) || [],
        imageUrl: item.item_data.image_url,
        ordinal: item.item_data.ordinal || 0,
        lastUpdated: item.updated_at,
        version: item.version
      }
    })

    // Sort items by category and name
    items.sort((a, b) => {
      if (a.categoryName !== b.categoryName) {
        return a.categoryName.localeCompare(b.categoryName)
      }
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      success: true,
      items,
      total: items.length,
      message: 'Menu items fetched successfully'
    })
    
  } catch (error) {
    console.error('Failed to fetch admin menu items:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch menu items', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}