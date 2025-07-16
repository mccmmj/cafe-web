import { NextResponse } from 'next/server'
import { fetchMenuCategories } from '@/lib/square/catalog'

export async function GET() {
  try {
    const categories = await fetchMenuCategories()
    
    return NextResponse.json({
      success: true,
      message: 'Square Catalog API test successful',
      categoriesCount: categories.length,
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        itemCount: cat.items.length
      }))
    })
  } catch (error) {
    console.error('Catalog test failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Square Catalog API test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}