/**
 * Square Sandbox Catalog Seeding Script - Fixed Version
 * Run with: node scripts/seed-square-catalog-fixed.js
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

// Sample cafe menu data with proper types
const sampleCategories = [
  {
    type: 'CATEGORY',
    id: '#breakfast-category',
    category_data: {
      name: 'Breakfast',
      ordinal: 1
    }
  },
  {
    type: 'CATEGORY',
    id: '#drinks-category',
    category_data: {
      name: 'Coffee & Drinks',
      ordinal: 2
    }
  },
  {
    type: 'CATEGORY',
    id: '#pastries-category',
    category_data: {
      name: 'Pastries & Sweets',
      ordinal: 3
    }
  }
]

const sampleItems = [
  // Breakfast Items
  {
    type: 'ITEM',
    id: '#breakfast-burrito',
    item_data: {
      name: 'Breakfast Burrito',
      description: 'Scrambled eggs, cheese, and your choice of protein wrapped in a warm tortilla',
      category_id: '#breakfast-category',
      variations: [
        {
          type: 'ITEM_VARIATION',
          id: '#breakfast-burrito-bacon',
          item_variation_data: {
            name: 'Bacon',
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: 895, // $8.95
              currency: 'USD'
            }
          }
        },
        {
          type: 'ITEM_VARIATION',
          id: '#breakfast-burrito-sausage',
          item_variation_data: {
            name: 'Sausage',
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: 895,
              currency: 'USD'
            }
          }
        }
      ]
    }
  },
  {
    type: 'ITEM',
    id: '#breakfast-sandwich',
    item_data: {
      name: 'Breakfast Sandwich',
      description: 'Artisan sandwich with egg and cheese on toasted bread',
      category_id: '#breakfast-category',
      variations: [
        {
          type: 'ITEM_VARIATION',
          id: '#breakfast-sandwich-basic',
          item_variation_data: {
            name: 'Regular',
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: 795, // $7.95
              currency: 'USD'
            }
          }
        }
      ]
    }
  },
  // Coffee & Drinks
  {
    type: 'ITEM',
    id: '#latte',
    item_data: {
      name: 'Café Latte',
      description: 'Rich espresso with steamed milk',
      category_id: '#drinks-category',
      variations: [
        {
          type: 'ITEM_VARIATION',
          id: '#latte-tall',
          item_variation_data: {
            name: 'Tall',
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: 445, // $4.45
              currency: 'USD'
            }
          }
        },
        {
          type: 'ITEM_VARIATION',
          id: '#latte-grande',
          item_variation_data: {
            name: 'Grande',
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: 515, // $5.15
              currency: 'USD'
            }
          }
        },
        {
          type: 'ITEM_VARIATION',
          id: '#latte-venti',
          item_variation_data: {
            name: 'Venti',
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: 595, // $5.95
              currency: 'USD'
            }
          }
        }
      ]
    }
  },
  {
    type: 'ITEM',
    id: '#americano',
    item_data: {
      name: 'Americano',
      description: 'Espresso shots with hot water',
      category_id: '#drinks-category',
      variations: [
        {
          type: 'ITEM_VARIATION',
          id: '#americano-tall',
          item_variation_data: {
            name: 'Tall',
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: 365, // $3.65
              currency: 'USD'
            }
          }
        },
        {
          type: 'ITEM_VARIATION',
          id: '#americano-grande',
          item_variation_data: {
            name: 'Grande',
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: 445,
              currency: 'USD'
            }
          }
        }
      ]
    }
  },
  {
    type: 'ITEM',
    id: '#cold-brew',
    item_data: {
      name: 'Cold Brew Coffee',
      description: 'Smooth, cold-brewed coffee served over ice',
      category_id: '#drinks-category',
      variations: [
        {
          type: 'ITEM_VARIATION',
          id: '#cold-brew-grande',
          item_variation_data: {
            name: 'Grande',
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: 495,
              currency: 'USD'
            }
          }
        }
      ]
    }
  },
  // Pastries & Sweets
  {
    type: 'ITEM',
    id: '#blueberry-muffin',
    item_data: {
      name: 'Blueberry Muffin',
      description: 'Fresh baked muffin with blueberries',
      category_id: '#pastries-category',
      variations: [
        {
          type: 'ITEM_VARIATION',
          id: '#blueberry-muffin-regular',
          item_variation_data: {
            name: 'Regular',
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: 495, // $4.95
              currency: 'USD'
            }
          }
        }
      ]
    }
  },
  {
    type: 'ITEM',
    id: '#chocolate-chip-cookie',
    item_data: {
      name: 'Chocolate Chip Cookie',
      description: 'Freshly baked chocolate chip cookie',
      category_id: '#pastries-category',
      variations: [
        {
          type: 'ITEM_VARIATION',
          id: '#cookie-regular',
          item_variation_data: {
            name: 'Regular',
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: 495,
              currency: 'USD'
            }
          }
        }
      ]
    }
  },
  {
    type: 'ITEM',
    id: '#croissant',
    item_data: {
      name: 'Butter Croissant',
      description: 'Flaky, buttery croissant',
      category_id: '#pastries-category',
      variations: [
        {
          type: 'ITEM_VARIATION',
          id: '#croissant-regular',
          item_variation_data: {
            name: 'Regular',
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: 495,
              currency: 'USD'
            }
          }
        }
      ]
    }
  }
]

async function createCatalogBatch(objects) {
  try {
    console.log(`Creating batch with ${objects.length} objects...`)
    
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

async function seedCatalog() {
  console.log('🌱 Seeding Square Sandbox Catalog...')
  
  try {
    // Check if we have the right environment variables
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      throw new Error('SQUARE_ACCESS_TOKEN not found in environment')
    }

    // First, create categories
    console.log('📁 Creating categories...')
    const categoryResult = await createCatalogBatch(sampleCategories)
    console.log(`✅ Created ${sampleCategories.length} categories`)

    // Then, create items
    console.log('🍽️ Creating menu items...')
    const itemResult = await createCatalogBatch(sampleItems)
    console.log(`✅ Created ${sampleItems.length} menu items`)

    console.log('\n🎉 Catalog seeding complete!')
    console.log('📋 Created:')
    console.log(`   - ${sampleCategories.length} categories`)
    console.log(`   - ${sampleItems.length} menu items`)
    console.log('\n🔗 You can now test the dynamic menu on your website')
    
  } catch (error) {
    console.error('❌ Error seeding catalog:', error.message)
    process.exit(1)
  }
}

// Run the seeding script
if (require.main === module) {
  seedCatalog()
}

module.exports = { seedCatalog }