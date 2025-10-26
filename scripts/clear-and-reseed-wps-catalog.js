/**
 * Clear Square Sandbox Catalog and Reseed with WPS Starbucks Compliant Items
 * Run with: node scripts/clear-and-reseed-wps-catalog.js
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
        idempotency_key: `wps-catalog-clear-reseed-${Date.now()}-${Math.random()}`,
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

async function clearAndReseedWpsCatalog() {
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
    console.log('🌱 Creating WPS Starbucks compliant catalog...')

    // Create WPS-compliant categories
    const categoryData = [
      // STARBUCKS CATEGORIES (exact WPS naming)
      { name: 'ESPRESSO, COFFEE & MORE', description: 'Premium Starbucks coffee beverages', ordinal: 10, isStarbucks: true },
      { name: 'FRAPPUCCINO® BLENDED BEVERAGES', description: 'Blended coffee and crème beverages', ordinal: 20, isStarbucks: true },
      { name: 'COFFEE', description: 'Coffee Frappuccino beverages', ordinal: 21, isStarbucks: true, parentName: 'FRAPPUCCINO® BLENDED BEVERAGES' },
      { name: 'CREME', description: 'Crème Frappuccino beverages', ordinal: 22, isStarbucks: true, parentName: 'FRAPPUCCINO® BLENDED BEVERAGES' },
      { name: 'TEAVANA® HANDCRAFTED TEA', description: 'Premium handcrafted tea beverages', ordinal: 30, isStarbucks: true },
      { name: 'STARBUCKS REFRESHERS® ICED BEVERAGES', description: 'Refreshing fruit-flavored beverages', ordinal: 40, isStarbucks: true },
      { name: 'Seasonal', description: 'Limited-time Starbucks seasonal offerings', ordinal: 50, isStarbucks: true },
      
      // HOUSE CATEGORIES
      { name: 'Breakfast & Lunch', description: 'Fresh breakfast and lunch items', ordinal: 100, isStarbucks: false },
      { name: 'Pastries & Sweets', description: 'Fresh baked goods and treats', ordinal: 110, isStarbucks: false },
      { name: 'Snacks', description: 'Quick bites and snacks', ordinal: 120, isStarbucks: false }
    ]

    const categories = categoryData.map((cat, index) => ({
      type: 'CATEGORY',
      id: `#wps-category-${index}`,
      category_data: {
        name: cat.name,
        description: cat.description,
        ordinal: cat.ordinal
      }
    }))

    console.log('📁 Creating WPS-compliant categories...')
    const categoryResult = await createCatalogBatch(categories)
    
    // Extract the actual category IDs returned by Square
    const categoryIdMap = {}
    categoryResult.objects.forEach((obj) => {
      if (obj.type === 'CATEGORY') {
        const categoryName = obj.category_data.name
        categoryIdMap[categoryName] = obj.id
      }
    })

    console.log('🗂️ Category ID mapping:', categoryIdMap)

    // Wait for categories to be fully created
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Now create WPS-compliant items with the actual category IDs
    const wpsItems = [
      // ESPRESSO, COFFEE & MORE (Starbucks)
      {
        type: 'ITEM',
        id: '#pike-place-roast',
        item_data: {
          name: 'Pike Place® Roast',
          description: 'A smooth, well-rounded blend of Latin American coffees with subtle flavors of cocoa and toasted nuts.',
          categories: [{ id: categoryIdMap['ESPRESSO, COFFEE & MORE'], ordinal: 0 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#pike-tall',
              item_variation_data: {
                name: 'Tall',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 265, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION', 
              id: '#pike-grande',
              item_variation_data: {
                name: 'Grande',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 295, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#pike-venti',
              item_variation_data: {
                name: 'Venti',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 325, currency: 'USD' }
              }
            }
          ]
        }
      },
      {
        type: 'ITEM',
        id: '#caffe-americano',
        item_data: {
          name: 'Caffè Americano',
          description: 'Rich, full-bodied espresso with hot water.',
          categories: [{ id: categoryIdMap['ESPRESSO, COFFEE & MORE'], ordinal: 1 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#americano-tall',
              item_variation_data: {
                name: 'Tall',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 295, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#americano-grande',
              item_variation_data: {
                name: 'Grande', 
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 345, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#americano-venti',
              item_variation_data: {
                name: 'Venti',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 395, currency: 'USD' }
              }
            }
          ]
        }
      },
      {
        type: 'ITEM',
        id: '#caffe-latte',
        item_data: {
          name: 'Caffè Latte',
          description: 'Rich, full-bodied espresso in steamed milk, lightly topped with foam.',
          categories: [{ id: categoryIdMap['ESPRESSO, COFFEE & MORE'], ordinal: 2 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#latte-tall',
              item_variation_data: {
                name: 'Tall',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 495, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#latte-grande',
              item_variation_data: {
                name: 'Grande',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 565, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#latte-venti',
              item_variation_data: {
                name: 'Venti',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 625, currency: 'USD' }
              }
            }
          ]
        }
      },

      // FRAPPUCCINO® BLENDED BEVERAGES - COFFEE
      {
        type: 'ITEM',
        id: '#caramel-frappuccino',
        item_data: {
          name: 'Caramel Frappuccino®',
          description: 'Buttery caramel syrup blended with coffee, milk and ice, then topped with whipped cream and caramel drizzle.',
          categories: [{ id: categoryIdMap['COFFEE'], ordinal: 0 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#caramel-frapp-tall',
              item_variation_data: {
                name: 'Tall',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 545, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#caramel-frapp-grande',
              item_variation_data: {
                name: 'Grande',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 625, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#caramel-frapp-venti',
              item_variation_data: {
                name: 'Venti',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 695, currency: 'USD' }
              }
            }
          ]
        }
      },
      {
        type: 'ITEM',
        id: '#mocha-frappuccino',
        item_data: {
          name: 'Mocha Frappuccino®',
          description: 'Rich, chocolatey goodness blended with coffee, milk and ice, topped with whipped cream and chocolate drizzle.',
          categories: [{ id: categoryIdMap['COFFEE'], ordinal: 1 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#mocha-frapp-tall',
              item_variation_data: {
                name: 'Tall',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 545, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#mocha-frapp-grande',
              item_variation_data: {
                name: 'Grande',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 625, currency: 'USD' }
              }
            }
          ]
        }
      },

      // FRAPPUCCINO® BLENDED BEVERAGES - CREME
      {
        type: 'ITEM',
        id: '#vanilla-bean-frappuccino',
        item_data: {
          name: 'Vanilla Bean Crème Frappuccino®',
          description: 'Rich vanilla bean flavor blended with milk and ice, topped with whipped cream.',
          categories: [{ id: categoryIdMap['CREME'], ordinal: 0 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#vanilla-bean-tall',
              item_variation_data: {
                name: 'Tall',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 495, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#vanilla-bean-grande',
              item_variation_data: {
                name: 'Grande',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 565, currency: 'USD' }
              }
            }
          ]
        }
      },

      // TEAVANA® HANDCRAFTED TEA
      {
        type: 'ITEM',
        id: '#green-tea-latte',
        item_data: {
          name: 'Matcha Tea Latte',
          description: 'Sweetened matcha green tea blended with steamed milk.',
          categories: [{ id: categoryIdMap['TEAVANA® HANDCRAFTED TEA'], ordinal: 0 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#matcha-latte-tall',
              item_variation_data: {
                name: 'Tall',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 495, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#matcha-latte-grande',
              item_variation_data: {
                name: 'Grande',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 565, currency: 'USD' }
              }
            }
          ]
        }
      },
      {
        type: 'ITEM',
        id: '#chai-tea-latte',
        item_data: {
          name: 'Chai Tea Latte',
          description: 'Black tea infused with cinnamon, clove and other warming spices, combined with steamed milk.',
          categories: [{ id: categoryIdMap['TEAVANA® HANDCRAFTED TEA'], ordinal: 1 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#chai-latte-tall',
              item_variation_data: {
                name: 'Tall',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 445, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#chai-latte-grande',
              item_variation_data: {
                name: 'Grande',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 515, currency: 'USD' }
              }
            }
          ]
        }
      },

      // STARBUCKS REFRESHERS® ICED BEVERAGES
      {
        type: 'ITEM',
        id: '#mango-dragonfruit-refresher',
        item_data: {
          name: 'Mango Dragonfruit Refresher',
          description: 'A tropical blend of juicy mango and dragonfruit flavors.',
          categories: [{ id: categoryIdMap['STARBUCKS REFRESHERS® ICED BEVERAGES'], ordinal: 0 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#mango-refresher-tall',
              item_variation_data: {
                name: 'Tall',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 445, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#mango-refresher-grande',
              item_variation_data: {
                name: 'Grande',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 515, currency: 'USD' }
              }
            }
          ]
        }
      },
      {
        type: 'ITEM',
        id: '#strawberry-acai-refresher',
        item_data: {
          name: 'Strawberry Açaí Refresher',
          description: 'Sweet strawberry flavors accented by passion fruit and açaí notes.',
          categories: [{ id: categoryIdMap['STARBUCKS REFRESHERS® ICED BEVERAGES'], ordinal: 1 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#strawberry-refresher-tall',
              item_variation_data: {
                name: 'Tall',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 445, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#strawberry-refresher-grande',
              item_variation_data: {
                name: 'Grande',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 515, currency: 'USD' }
              }
            }
          ]
        }
      },

      // SEASONAL (Starbucks)
      {
        type: 'ITEM',
        id: '#pumpkin-spice-latte',
        item_data: {
          name: 'Pumpkin Spice Latte',
          description: 'Espresso and steamed milk with pumpkin, cinnamon, nutmeg and clove, topped with whipped cream and pumpkin pie spice.',
          categories: [{ id: categoryIdMap['Seasonal'], ordinal: 0 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#psl-tall',
              item_variation_data: {
                name: 'Tall',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 545, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#psl-grande',
              item_variation_data: {
                name: 'Grande',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 615, currency: 'USD' }
              }
            }
          ]
        }
      },

      // BREAKFAST & LUNCH (House)
      {
        type: 'ITEM',
        id: '#breakfast-burrito',
        item_data: {
          name: 'Breakfast Burrito',
          description: 'Scrambled eggs, cheese, and your choice of protein wrapped in a warm tortilla',
          categories: [{ id: categoryIdMap['Breakfast & Lunch'], ordinal: 0 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#burrito-bacon',
              item_variation_data: {
                name: 'Bacon',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 895, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#burrito-sausage',
              item_variation_data: {
                name: 'Sausage',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 895, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#burrito-veggie',
              item_variation_data: {
                name: 'Vegetarian',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 795, currency: 'USD' }
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
          description: 'Artisan sandwich with egg and cheese on toasted English muffin',
          categories: [{ id: categoryIdMap['Breakfast & Lunch'], ordinal: 1 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#sandwich-regular',
              item_variation_data: {
                name: 'Regular',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 695, currency: 'USD' }
              }
            },
            {
              type: 'ITEM_VARIATION',
              id: '#sandwich-deluxe',
              item_variation_data: {
                name: 'Deluxe',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 795, currency: 'USD' }
              }
            }
          ]
        }
      },
      {
        type: 'ITEM',
        id: '#turkey-avocado-wrap',
        item_data: {
          name: 'Turkey & Avocado Wrap',
          description: 'Sliced turkey, fresh avocado, lettuce and tomato in a spinach tortilla',
          categories: [{ id: categoryIdMap['Breakfast & Lunch'], ordinal: 2 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#turkey-wrap-regular',
              item_variation_data: {
                name: 'Regular',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 995, currency: 'USD' }
              }
            }
          ]
        }
      },

      // PASTRIES & SWEETS (House)
      {
        type: 'ITEM',
        id: '#blueberry-muffin',
        item_data: {
          name: 'Blueberry Muffin',
          description: 'Fresh baked muffin with Maine blueberries',
          categories: [{ id: categoryIdMap['Pastries & Sweets'], ordinal: 0 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#muffin-regular',
              item_variation_data: {
                name: 'Regular',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 395, currency: 'USD' }
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
          description: 'Classic chocolate chip cookie baked fresh daily',
          categories: [{ id: categoryIdMap['Pastries & Sweets'], ordinal: 1 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#cookie-regular',
              item_variation_data: {
                name: 'Regular',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 295, currency: 'USD' }
              }
            }
          ]
        }
      },
      {
        type: 'ITEM',
        id: '#butter-croissant',
        item_data: {
          name: 'Butter Croissant',
          description: 'Flaky, buttery croissant made with European-style butter',
          categories: [{ id: categoryIdMap['Pastries & Sweets'], ordinal: 2 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#croissant-regular',
              item_variation_data: {
                name: 'Regular',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 345, currency: 'USD' }
              }
            }
          ]
        }
      },

      // SNACKS (House)
      {
        type: 'ITEM',
        id: '#mixed-nuts',
        item_data: {
          name: 'Mixed Nuts',
          description: 'Premium mix of roasted almonds, cashews, and peanuts',
          categories: [{ id: categoryIdMap['Snacks'], ordinal: 0 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#nuts-regular',
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
        id: '#protein-bar',
        item_data: {
          name: 'Protein Bar',
          description: 'High-protein energy bar with chocolate and peanut butter',
          categories: [{ id: categoryIdMap['Snacks'], ordinal: 1 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#protein-bar-regular',
              item_variation_data: {
                name: 'Regular',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 395, currency: 'USD' }
              }
            }
          ]
        }
      },
      {
        type: 'ITEM',
        id: '#granola-bar',
        item_data: {
          name: 'Granola Bar',
          description: 'Wholesome granola bar with oats, honey, and dried fruit',
          categories: [{ id: categoryIdMap['Snacks'], ordinal: 2 }],
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#granola-bar-regular',
              item_variation_data: {
                name: 'Regular',
                pricing_type: 'FIXED_PRICING',
                price_money: { amount: 345, currency: 'USD' }
              }
            }
          ]
        }
      }
    ]

    console.log('🍽️ Creating WPS-compliant menu items...')
    
    // Debug: Show what category IDs are being assigned to items
    wpsItems.forEach(item => {
      const categoryId = item.item_data.categories?.[0]?.id
      const categoryName = Object.keys(categoryIdMap).find(name => categoryIdMap[name] === categoryId)
      console.log(`📄 Item "${item.item_data.name}" → Category "${categoryName}" (${categoryId})`)
    })
    
    const itemResult = await createCatalogBatch(wpsItems)

    console.log('\n🎉 WPS Starbucks Catalog seeding complete!')
    console.log('📋 Created:')
    console.log(`   - ${Object.keys(categoryIdMap).length} categories`)
    console.log(`   - ${wpsItems.length} menu items`)
    
    console.log('\n📊 WPS-Compliant Category Structure:')
    console.log('   ☕ ESPRESSO, COFFEE & MORE (Starbucks)')
    console.log('   🥤 FRAPPUCCINO® BLENDED BEVERAGES (Starbucks)')
    console.log('      └── COFFEE (Starbucks subcategory)')
    console.log('      └── CREME (Starbucks subcategory)')
    console.log('   🫖 TEAVANA® HANDCRAFTED TEA (Starbucks)')
    console.log('   🧊 STARBUCKS REFRESHERS® ICED BEVERAGES (Starbucks)')
    console.log('   🎃 Seasonal (Starbucks)')
    console.log('   🥪 Breakfast & Lunch (House)')
    console.log('   🧁 Pastries & Sweets (House)')
    console.log('   🥜 Snacks (House)')
    
    console.log('\n✅ Menu should now display WPS-compliant Starbucks categories')
    console.log('✅ Payment processing should work with proper category/item structure')
    console.log('✅ All Starbucks items use exact naming from WPS guidelines')
    console.log('\n🔗 Test your application at http://localhost:3002')
    
  } catch (error) {
    console.error('❌ Error during WPS catalog clear and reseed:', error.message)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  clearAndReseedWpsCatalog()
}

module.exports = { clearAndReseedWpsCatalog }