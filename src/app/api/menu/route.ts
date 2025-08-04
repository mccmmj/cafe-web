import { NextResponse } from 'next/server'
import { listCatalogObjects, searchAllCatalogItems } from '@/lib/square/fetch-client'
import { sortMenuItems, sortMenuCategories } from '@/lib/constants/menu'

interface TransformedMenuItem {
  id: string
  name: string
  description: string
  price: number
  categoryId: string
  imageUrl?: string
  variations: Array<{
    id: string
    name: string
    priceDifference: number
  }>
  isAvailable: boolean
  modifiers: Array<{
    id: string
    name: string
    price: number
    type: 'selection'
  }>
}

interface CatalogObject {
  id: string
  type: string
  item_data?: {
    name: string
    description?: string
    categories?: Array<{ id: string }>
    variations?: Array<{
      id: string
      item_variation_data: {
        name: string
        price_money?: { amount: number }
      }
    }>
    image_ids?: string[]
    is_deleted?: boolean
    modifier_list_info?: Array<{
      modifier_list_id: string
      name?: string
    }>
  }
  category_data?: {
    name: string
    description?: string
    ordinal?: number
  }
}

export async function GET() {
  try {
    // Fetch items via search (to get all items including those missing from list API)
    // and categories via list API
    const [itemsData, categoriesData] = await Promise.all([
      searchAllCatalogItems(),
      listCatalogObjects(['CATEGORY'])
    ])
    
    // Combine the results (search returns different structure)
    const catalogData = {
      objects: [
        ...(itemsData.objects || []),
        ...(categoriesData.objects || [])
      ]
    }
    
    if (!catalogData.objects || catalogData.objects.length === 0) {
      // Return fallback menu when Square catalog is empty
      return NextResponse.json({ 
        categories: getFallbackMenu(),
        items: [],
        fallback: true,
        message: 'Using sample menu data. Run the catalog seeding script to populate Square sandbox.'
      })
    }

    // Debug logging removed - Square API 2024 categories structure working correctly
    // console.log('Catalog objects received:', catalogData.objects?.map((obj: any) => ({ 
    //   type: obj.type, 
    //   id: obj.id, 
    //   name: obj.item_data?.name || obj.category_data?.name,
    //   oldCategoryId: obj.item_data?.category_id, // deprecated field
    //   newCategories: obj.item_data?.categories, // new field structure
    //   categoryId: obj.item_data?.categories?.[0]?.id
    // })))

    // Separate items and categories, explicitly filter out ITEM_VARIATIONS and other types
    const items = catalogData.objects.filter((obj: CatalogObject) => obj.type === 'ITEM')
    const rawCategories = catalogData.objects.filter((obj: CatalogObject) => obj.type === 'CATEGORY')
    
    // console.log(`Found ${items.length} items and ${rawCategories.length} categories`)
    
    // Remove duplicate categories (same ID)
    const categories = rawCategories.filter((category: CatalogObject, index: number, arr: CatalogObject[]) => 
      arr.findIndex(c => c.id === category.id) === index
    )

    // Filter items for location availability and status
    const locationId = process.env.SQUARE_LOCATION_ID
    const availableItems = items.filter((item: CatalogObject) => {
      const itemData = item.item_data
      
      // Filter out deleted and archived items
      if (item.is_deleted || itemData?.is_deleted || itemData?.is_archived) {
        return false
      }
      
      // Filter by location availability
      if (item.present_at_all_locations === false) {
        // Item is location-specific, check if available at our location
        const presentAtLocations = item.present_at_location_ids || []
        const absentAtLocations = item.absent_at_location_ids || []
        
        // Must be present at our location and not absent
        if (!presentAtLocations.includes(locationId) || absentAtLocations.includes(locationId)) {
          return false
        }
      }
      
      return true
    })

    // console.log(`Filtered ${items.length} items to ${availableItems.length} available items for location ${locationId}`)

    // Transform Square data to our menu format
    const transformedItems = availableItems.map((item: CatalogObject) => {
      const itemData = item.item_data
      if (!itemData) {
        return {
          id: item.id,
          name: 'Unknown Item',
          description: '',
          price: 0,
          categoryId: 'uncategorized',
          variations: [],
          isAvailable: false,
          modifiers: []
        }
      }
      
      const baseVariation = itemData.variations?.[0]
      const price = baseVariation?.item_variation_data?.price_money?.amount || 0
      
      // Get category ID from the new categories array structure (Square API 2024)
      const categoryId = itemData.categories?.[0]?.id || 'uncategorized'
      
      return {
        id: item.id,
        name: itemData.name,
        description: itemData.description || '',
        price: price / 100, // Convert cents to dollars
        categoryId: categoryId,
        imageUrl: itemData.image_ids?.[0] ? `/api/square/image/${itemData.image_ids[0]}` : undefined,
        variations: itemData?.variations?.map((variation) => ({
          id: variation.id,
          name: variation.item_variation_data.name,
          priceDifference: (variation.item_variation_data.price_money?.amount || 0) / 100 - price / 100
        })) || [],
        isAvailable: !itemData.is_deleted,
        modifiers: itemData?.modifier_list_info?.map((modInfo) => ({
          id: modInfo.modifier_list_id,
          name: modInfo.name || 'Modifier',
          price: 0, // Modifier prices come from the modifier list details
          type: 'selection' as const
        })) || []
      }
    })

    const transformedCategories = categories.map((category: CatalogObject) => {
      // First try exact ID match, then try name-based matching for seeded data
      let categoryItems = transformedItems.filter((item: TransformedMenuItem) => item.categoryId === category.id)
      
      // If no items found by ID, try matching by category name for common seeded categories
      if (categoryItems.length === 0) {
        const categoryName = category.category_data?.name.toLowerCase() || ''
        categoryItems = transformedItems.filter((item: TransformedMenuItem) => {
          const itemCategoryId = item.categoryId?.toLowerCase()
          return itemCategoryId?.includes(categoryName.replace(/\s+/g, '-')) || 
                 itemCategoryId?.includes(categoryName.replace(/\s+/g, ''))
        })
      }
      
      // console.log(`Category ${category.category_data?.name} (${category.id}) has ${categoryItems.length} items:`, 
      //   categoryItems.map(item => `${item.name} (categoryId: ${item.categoryId})`))
      
      return {
        id: category.id,
        name: category.category_data?.name || '',
        description: category.category_data?.description || '',
        items: sortMenuItems(categoryItems), // Apply smart sorting to items
        sortOrder: category.category_data?.ordinal || 0
      }
    })

    // Add uncategorized items
    const uncategorizedItems = transformedItems.filter((item: TransformedMenuItem) => 
      !categories.some((cat: CatalogObject) => cat.id === item.categoryId)
    )

    // console.log(`Uncategorized items check:`)
    // console.log(`- Total items: ${transformedItems.length}`)
    // console.log(`- Available category IDs: [${categories.map(c => c.id).join(', ')}]`)
    // console.log(`- Items with their category IDs: ${transformedItems.slice(0, 5).map(item => `${item.name}:${item.categoryId}`).join(', ')}`)
    // console.log(`- Uncategorized items found: ${uncategorizedItems.length}`)

    if (uncategorizedItems.length > 0) {
      transformedCategories.push({
        id: 'uncategorized',
        name: 'Other Items',
        description: 'Additional menu items',
        items: sortMenuItems(uncategorizedItems), // Apply smart sorting to uncategorized items too
        sortOrder: 999
      })
    }

    // Sort categories using business logic priority instead of just ordinal
    const sortedCategories = sortMenuCategories(transformedCategories)

    return NextResponse.json({
      categories: sortedCategories,
      items: transformedItems,
      lastUpdated: new Date().toISOString(),
      // debug: {
      //   totalCatalogObjects: catalogData.objects?.length || 0,
      //   rawCategories: rawCategories.length,
      //   deduplicatedCategories: categories.length,
      //   itemsCount: items.length,
      //   categoryIds: categories.map((c: any) => c.id),
      //   itemCategoryIds: transformedItems.map((i: any) => i.categoryId),
      //   categoriesWithItems: transformedCategories.map((c: any) => ({ 
      //     name: c.name, 
      //     id: c.id, 
      //     itemCount: c.items.length 
      //   }))
      // }
    })

  } catch (error) {
    console.error('Error fetching menu from Square:', error)
    
    // Return fallback static menu data in case of Square API issues
    return NextResponse.json({
      error: 'Failed to fetch menu from Square',
      categories: getFallbackMenu(),
      items: [],
      fallback: true
    })
  }
}

export async function POST() {
  // For future use - update menu items, manage inventory, etc.
  return NextResponse.json({ message: 'Menu updates not implemented yet' }, { status: 501 })
}

function getFallbackMenu() {
  const fallbackCategories = [
    {
      id: 'breakfast',
      name: 'Breakfast',
      description: 'Start your day right',
      items: [
        {
          id: 'breakfast-burrito',
          name: 'Breakfast Burrito',
          description: 'Scrambled eggs, cheese, and your choice of protein',
          price: 8.95,
          categoryId: 'breakfast',
          variations: [
            { id: 'bacon', name: 'Bacon', priceDifference: 0 },
            { id: 'sausage', name: 'Sausage', priceDifference: 0 }
          ],
          isAvailable: true,
          modifiers: []
        },
        {
          id: 'breakfast-sandwich',
          name: 'Breakfast Sandwich',
          description: 'Egg and cheese on toasted bread',
          price: 7.95,
          categoryId: 'breakfast',
          variations: [],
          isAvailable: true,
          modifiers: []
        }
      ],
      sortOrder: 1
    },
    {
      id: 'drinks',
      name: 'Coffee & Drinks',
      description: 'Fresh brewed coffee and beverages',
      items: [
        {
          id: 'latte',
          name: 'Café Latte',
          description: 'Rich espresso with steamed milk',
          price: 4.45,
          categoryId: 'drinks',
          variations: [
            { id: 'tall', name: 'Tall', priceDifference: 0 },
            { id: 'grande', name: 'Grande', priceDifference: 0.70 },
            { id: 'venti', name: 'Venti', priceDifference: 1.50 }
          ],
          isAvailable: true,
          modifiers: []
        },
        {
          id: 'americano',
          name: 'Americano',
          description: 'Espresso shots with hot water',
          price: 3.65,
          categoryId: 'drinks',
          variations: [
            { id: 'tall', name: 'Tall', priceDifference: 0 },
            { id: 'grande', name: 'Grande', priceDifference: 0.80 }
          ],
          isAvailable: true,
          modifiers: []
        },
        {
          id: 'cold-brew',
          name: 'Cold Brew Coffee',
          description: 'Smooth, cold-brewed coffee served over ice',
          price: 4.95,
          categoryId: 'drinks',
          variations: [],
          isAvailable: true,
          modifiers: []
        }
      ],
      sortOrder: 2
    },
    {
      id: 'pastries',
      name: 'Pastries & Sweets',
      description: 'Fresh baked goods and treats',
      items: [
        {
          id: 'blueberry-muffin',
          name: 'Blueberry Muffin',
          description: 'Fresh baked muffin with blueberries',
          price: 4.95,
          categoryId: 'pastries',
          variations: [],
          isAvailable: true,
          modifiers: []
        },
        {
          id: 'chocolate-chip-cookie',
          name: 'Chocolate Chip Cookie',
          description: 'Freshly baked chocolate chip cookie',
          price: 4.95,
          categoryId: 'pastries',
          variations: [],
          isAvailable: true,
          modifiers: []
        },
        {
          id: 'croissant',
          name: 'Butter Croissant',
          description: 'Flaky, buttery croissant',
          price: 4.95,
          categoryId: 'pastries',
          variations: [],
          isAvailable: true,
          modifiers: []
        }
      ],
      sortOrder: 3
    }
  ]
  
  // Apply sorting to fallback menu items too
  return fallbackCategories.map(category => ({
    ...category,
    items: sortMenuItems(category.items)
  }))
}