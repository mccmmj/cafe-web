/**
 * Clear Square Sandbox Catalog and Reseed with Proper ID Management
 * Run with: node scripts/clear-and-reseed-catalog.js
 */

require('dotenv').config({ path: '.env.local' })

const SQUARE_BASE_URL = 'https://connect.squareupsandbox.com'
const SQUARE_VERSION = '2024-12-18'

function getHeaders() {
  return {
    'Square-Version': SQUARE_VERSION,
    'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  }
}

async function listAllCatalogObjects() {
  try {
    const response = await fetch(`${SQUARE_BASE_URL}/v2/catalog/list`, {
      method: 'GET',
      headers: getHeaders()
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Square API error: ${response.status} ${errorData}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error listing catalog objects:', error)
    throw error
  }
}

async function deleteCatalogObject(objectId) {
  try {
    const response = await fetch(`${SQUARE_BASE_URL}/v2/catalog/object/${objectId}`, {
      method: 'DELETE',
      headers: getHeaders()
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Square API error: ${response.status} ${errorData}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error deleting catalog object:', error)
    throw error
  }
}

async function createCatalogBatch(objects) {
  try {
    const response = await fetch(`${SQUARE_BASE_URL}/v2/catalog/batch-upsert`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        idempotency_key: `catalog-seed-${Date.now()}-${Math.random()}`,
        batches: [
          {
            objects: objects
          }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Square API error: ${response.status} ${errorData}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating catalog batch:', error)
    throw error
  }
}

async function clearAndReseedCatalog() {
  console.log('🧹 Clearing existing Square Sandbox Catalog...')
  
  try {
    // List all existing catalog objects
    const existingCatalog = await listAllCatalogObjects()
    
    if (existingCatalog.objects && existingCatalog.objects.length > 0) {
      console.log(`Found ${existingCatalog.objects.length} existing objects, deleting...`)
      
      // Delete all existing objects
      for (const obj of existingCatalog.objects) {
        await deleteCatalogObject(obj.id)
        console.log(`Deleted ${obj.type}: ${obj.id}`)
      }
    }

    console.log('✅ Catalog cleared successfully')
    console.log('🌱 Creating new catalog with proper structure...')

    // Create categories first and get their actual IDs
    const categoryData = [
      { name: 'Breakfast', description: 'Start your day right', ordinal: 1 },
      { name: 'Coffee & Drinks', description: 'Fresh brewed coffee and beverages', ordinal: 2 },
      { name: 'Pastries & Sweets', description: 'Fresh baked goods and treats', ordinal: 3 }
    ]

    const categories = categoryData.map((cat, index) => ({
      type: 'CATEGORY',
      id: `#category-${index}`,
      category_data: {
        name: cat.name,
        description: cat.description,
        ordinal: cat.ordinal
      }
    }))

    console.log('📁 Creating categories...')
    const categoryResult = await createCatalogBatch(categories)
    
    // Extract the actual category IDs returned by Square
    // Match by category name instead of relying on array order
    const categoryIdMap = {}
    categoryResult.objects.forEach((obj) => {
      if (obj.type === 'CATEGORY') {
        const categoryName = obj.category_data.name
        categoryIdMap[categoryName] = obj.id
      }
    })

    console.log('Category ID mapping:', categoryIdMap)

    // Now create items with the actual category IDs
    const items = [
      // Breakfast Items
      {
        type: 'ITEM',
        id: '#item-breakfast-burrito',
        item_data: {
          name: 'Breakfast Burrito',
          description: 'Scrambled eggs, cheese, and your choice of protein wrapped in a warm tortilla',
          categories: [
            {
              id: categoryIdMap['Breakfast'],
              ordinal: 0
            }
          ],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#var-burrito-bacon',
              item_variation_data: {
                name: 'Bacon',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 895, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#var-burrito-sausage',
              item_variation_data: {
                name: 'Sausage',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 895, currency: 'USD' }
              }
            }
          ]
        }
      },
      {
        type: 'ITEM',
        id: '#item-breakfast-sandwich',
        item_data: {
          name: 'Breakfast Sandwich',
          description: 'Artisan sandwich with egg and cheese on toasted bread',
          categories: [
            {
              id: categoryIdMap['Breakfast'],
              ordinal: 1
            }
          ],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#var-sandwich-regular',
              item_variation_data: {
                name: 'Regular',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 795, currency: 'USD' }
              }
            }
          ]
        }
      },
      // Coffee & Drinks
      {
        type: 'ITEM',
        id: '#item-latte',
        item_data: {
          name: 'Café Latte',
          description: 'Rich espresso with steamed milk',
          categories: [
            {
              id: categoryIdMap['Coffee & Drinks'],
              ordinal: 0
            }
          ],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#var-latte-tall',
              item_variation_data: {
                name: 'Tall',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 445, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#var-latte-grande',
              item_variation_data: {
                name: 'Grande',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 515, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#var-latte-venti',
              item_variation_data: {
                name: 'Venti',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 595, currency: 'USD' }
              }
            }
          ]
        }
      },
      {
        type: 'ITEM',
        id: '#item-americano',
        item_data: {
          name: 'Americano',
          description: 'Espresso shots with hot water',
          categories: [
            {
              id: categoryIdMap['Coffee & Drinks'],
              ordinal: 1
            }
          ],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#var-americano-tall',
              item_variation_data: {
                name: 'Tall',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 365, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#var-americano-grande',
              item_variation_data: {
                name: 'Grande',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 445, currency: 'USD' }
              }
            }
          ]
        }
      },
      {
        type: 'ITEM',
        id: '#item-cold-brew',
        item_data: {
          name: 'Cold Brew Coffee',
          description: 'Smooth, cold-brewed coffee served over ice',
          categories: [
            {
              id: categoryIdMap['Coffee & Drinks'],
              ordinal: 2
            }
          ],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#var-cold-brew-grande',
              item_variation_data: {
                name: 'Grande',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 495, currency: 'USD' }
              }
            }
          ]
        }
      },
      // Pastries & Sweets
      {
        type: 'ITEM',
        id: '#item-blueberry-muffin',
        item_data: {
          name: 'Blueberry Muffin',
          description: 'Fresh baked muffin with blueberries',
          categories: [
            {
              id: categoryIdMap['Pastries & Sweets'],
              ordinal: 0
            }
          ],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#var-muffin-regular',
              item_variation_data: {
                name: 'Regular',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 495, currency: 'USD' }
              }
            }
          ]
        }
      },
      {
        type: 'ITEM',
        id: '#item-chocolate-chip-cookie',
        item_data: {
          name: 'Chocolate Chip Cookie',
          description: 'Freshly baked chocolate chip cookie',
          categories: [
            {
              id: categoryIdMap['Pastries & Sweets'],
              ordinal: 1
            }
          ],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#var-cookie-regular',
              item_variation_data: {
                name: 'Regular',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 495, currency: 'USD' }
              }
            }
          ]
        }
      },
      {
        type: 'ITEM',
        id: '#item-croissant',
        item_data: {
          name: 'Butter Croissant',
          description: 'Flaky, buttery croissant',
          categories: [
            {
              id: categoryIdMap['Pastries & Sweets'],
              ordinal: 2
            }
          ],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#var-croissant-regular',
              item_variation_data: {
                name: 'Regular',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 495, currency: 'USD' }
              }
            }
          ]
        }
      }
    ]

    console.log('🍽️ Creating menu items with proper category associations...')
    
    // Debug: Show what category IDs are being assigned to items
    items.forEach(item => {
      const categoryId = item.item_data.categories?.[0]?.id
      console.log(`Item "${item.item_data.name}" assigned to category ID: ${categoryId}`)
    })
    
    const itemResult = await createCatalogBatch(items)

    console.log('\n🎉 Catalog seeding complete!')
    console.log('📋 Created:')
    console.log(`   - ${Object.keys(categoryIdMap).length} categories`)
    console.log(`   - ${items.length} menu items`)
    console.log('\n🔗 Category associations should now work correctly!')
    
  } catch (error) {
    console.error('❌ Error during clear and reseed:', error.message)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  clearAndReseedCatalog()
}

module.exports = { clearAndReseedCatalog }