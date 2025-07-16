import { listCatalogObjects, searchCatalogItems } from './fetch-client'
import type { MenuCategory, MenuItem } from '@/types/menu'

export async function fetchMenuCategories(): Promise<MenuCategory[]> {
  try {
    const result = await listCatalogObjects(['CATEGORY'])
    const categories = result.objects || []
    
    // Get items for each category
    const categoriesWithItems = await Promise.all(
      categories.map(async (category) => {
        const items = await fetchMenuItemsByCategory(category.id!)
        return {
          id: category.id!,
          name: category.categoryData?.name || 'Unknown Category',
          description: category.categoryData?.description,
          items,
          sortOrder: category.categoryData?.ordinal || 0
        }
      })
    )
    
    // Sort categories by ordinal
    return categoriesWithItems.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  } catch (error) {
    console.error('Error fetching menu categories:', error)
    throw new Error('Failed to fetch menu categories')
  }
}

export async function fetchMenuItemsByCategory(categoryId: string): Promise<MenuItem[]> {
  try {
    const result = await searchCatalogItems({
      objectTypes: ['ITEM'],
      query: {
        exactQuery: {
          attributeName: 'category_id',
          attributeValue: categoryId
        }
      }
    })
    
    const items = result.items || []
    
    // Transform Square items to our format
    return await Promise.all(
      items.map(async (item) => {
        const itemData = item.itemData!
        const basePrice = itemData.variations?.[0]?.itemVariationData?.priceMoney?.amount || BigInt(0)
        
        // Check availability
        const isAvailable = await checkItemAvailability(item.id!)
        
        return {
          id: item.id!,
          name: itemData.name || 'Unknown Item',
          description: itemData.description,
          price: Number(basePrice) / 100, // Convert from cents to dollars
          categoryId,
          imageUrl: itemData.imageIds?.[0] ? await getImageUrl(itemData.imageIds[0]) : undefined,
          variations: itemData.variations?.map(variation => ({
            id: variation.id!,
            name: variation.itemVariationData?.name || '',
            priceDifference: Number(variation.itemVariationData?.priceMoney?.amount || BigInt(0)) / 100 - Number(basePrice) / 100
          })),
          isAvailable,
          modifiers: itemData.modifierListInfo?.map(modifierInfo => ({
            id: modifierInfo.modifierListId!,
            name: '', // Will be populated separately if needed
            price: 0,
            type: 'selection' as const
          }))
        }
      })
    )
  } catch (error) {
    console.error('Error fetching menu items for category:', categoryId, error)
    return []
  }
}

export async function checkItemAvailability(itemId: string): Promise<boolean> {
  try {
    // For now, we'll assume items are available
    // Inventory tracking would require additional API calls
    // TODO: Implement inventory checking when needed
    return true
  } catch (error) {
    console.error('Error checking availability for item:', itemId, error)
    return true // Default to available if check fails
  }
}

async function getImageUrl(imageId: string): Promise<string | undefined> {
  try {
    // TODO: Implement image retrieval via fetch client
    // For now, return undefined - images can be added later
    return undefined
  } catch (error) {
    console.error('Error fetching image:', imageId, error)
    return undefined
  }
}