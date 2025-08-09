/**
 * WPS Starbucks Compliant Square Sandbox Catalog Seeding Script
 * Based on WPS Mobile Ordering Guidelines
 * Run with: node scripts/seed-wps-starbucks-catalog.js
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

// WPS Starbucks Compliant Categories
const wpsCategories = [
  // CORE STARBUCKS CATEGORIES (exact names from WPS guidelines)
  {
    type: 'CATEGORY',
    id: '#starbucks-espresso-coffee',
    category_data: {
      name: 'ESPRESSO, COFFEE & MORE',
      ordinal: 10
    }
  },
  {
    type: 'CATEGORY', 
    id: '#starbucks-frappuccino',
    category_data: {
      name: 'FRAPPUCCINO® BLENDED BEVERAGES',
      ordinal: 20
    }
  },
  {
    type: 'CATEGORY',
    id: '#starbucks-frapp-coffee',
    category_data: {
      name: 'COFFEE',
      ordinal: 21,
      parent_category: '#starbucks-frappuccino'
    }
  },
  {
    type: 'CATEGORY', 
    id: '#starbucks-frapp-creme',
    category_data: {
      name: 'CREME',
      ordinal: 22,
      parent_category: '#starbucks-frappuccino'
    }
  },
  {
    type: 'CATEGORY',
    id: '#starbucks-teavana',
    category_data: {
      name: 'TEAVANA® HANDCRAFTED TEA',
      ordinal: 30
    }
  },
  {
    type: 'CATEGORY',
    id: '#starbucks-refreshers',
    category_data: {
      name: 'STARBUCKS REFRESHERS® ICED BEVERAGES',
      ordinal: 40
    }
  },
  {
    type: 'CATEGORY',
    id: '#seasonal-starbucks',
    category_data: {
      name: 'Seasonal',
      ordinal: 50
    }
  },
  
  // CAFE HOUSE CATEGORIES
  {
    type: 'CATEGORY',
    id: '#breakfast-lunch',
    category_data: {
      name: 'Breakfast & Lunch',
      ordinal: 100
    }
  },
  {
    type: 'CATEGORY',
    id: '#pastries-sweets',
    category_data: {
      name: 'Pastries & Sweets',
      ordinal: 110
    }
  },
  {
    type: 'CATEGORY',
    id: '#snacks',
    category_data: {
      name: 'Snacks',
      ordinal: 120
    }
  }
]

// WPS Starbucks Compliant Menu Items
const wpsItems = [
  // ESPRESSO, COFFEE & MORE
  {
    type: 'ITEM',
    id: '#pike-place-roast',
    item_data: {
      name: 'Pike Place® Roast',
      description: 'A smooth, well-rounded blend of Latin American coffees with subtle flavors of cocoa and toasted nuts.',
      category_id: '#starbucks-espresso-coffee',
      variations: [
        {
          type: 'ITEM_VARIATION',
          id: '#pike-place-tall',
          item_variation_data: {
            name: 'Tall',
            pricing_type: 'FIXED_PRICING',
            price_money: { amount: 265, currency: 'USD' }
          }
        },
        {
          type: 'ITEM_VARIATION', 
          id: '#pike-place-grande',
          item_variation_data: {
            name: 'Grande',
            pricing_type: 'FIXED_PRICING',
            price_money: { amount: 295, currency: 'USD' }
          }
        },
        {
          type: 'ITEM_VARIATION',
          id: '#pike-place-venti',
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
    id: '#starbucks-blonde-roast',
    item_data: {
      name: 'Starbucks® Blonde Roast',
      description: 'A lighter roasted coffee with a mellow flavor, soft acidity and subtle citrus notes.',
      category_id: '#starbucks-espresso-coffee',
      variations: [
        {
          type: 'ITEM_VARIATION',
          id: '#blonde-roast-tall',
          item_variation_data: {
            name: 'Tall',
            pricing_type: 'FIXED_PRICING', 
            price_money: { amount: 265, currency: 'USD' }
          }
        },
        {
          type: 'ITEM_VARIATION',
          id: '#blonde-roast-grande', 
          item_variation_data: {
            name: 'Grande',
            pricing_type: 'FIXED_PRICING',
            price_money: { amount: 295, currency: 'USD' }
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
      category_id: '#starbucks-espresso-coffee',
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
      category_id: '#starbucks-espresso-coffee',
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
      category_id: '#starbucks-frapp-coffee',
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
      category_id: '#starbucks-frapp-coffee',
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
      category_id: '#starbucks-frapp-creme',
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
      category_id: '#starbucks-teavana',
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
      category_id: '#starbucks-teavana',
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
      category_id: '#starbucks-refreshers',
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
      category_id: '#starbucks-refreshers',
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

  // SEASONAL ITEMS
  {
    type: 'ITEM',
    id: '#pumpkin-spice-latte',
    item_data: {
      name: 'Pumpkin Spice Latte',
      description: 'Espresso and steamed milk with pumpkin, cinnamon, nutmeg and clove, topped with whipped cream and pumpkin pie spice.',
      category_id: '#seasonal-starbucks',
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

  // BREAKFAST & LUNCH (House Items)
  {
    type: 'ITEM',
    id: '#breakfast-burrito',
    item_data: {
      name: 'Breakfast Burrito',
      description: 'Scrambled eggs, cheese, and your choice of protein wrapped in a warm tortilla',
      category_id: '#breakfast-lunch',
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
      category_id: '#breakfast-lunch',
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
      category_id: '#breakfast-lunch',
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

  // PASTRIES & SWEETS (House Items)
  {
    type: 'ITEM',
    id: '#blueberry-muffin',
    item_data: {
      name: 'Blueberry Muffin',
      description: 'Fresh baked muffin with Maine blueberries',
      category_id: '#pastries-sweets',
      variations: [
        {
          type: 'ITEM_VARIATION',
          id: '#blueberry-muffin-regular',
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
      category_id: '#pastries-sweets',
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
      category_id: '#pastries-sweets',
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

  // SNACKS (House Items)
  {
    type: 'ITEM',
    id: '#mixed-nuts',
    item_data: {
      name: 'Mixed Nuts',
      description: 'Premium mix of roasted almonds, cashews, and peanuts',
      category_id: '#snacks',
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
      category_id: '#snacks',
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
  }
]

async function createCatalogBatch(objects) {
  try {
    console.log(`Creating batch with ${objects.length} objects...`)
    
    const response = await fetch(`${SQUARE_BASE_URL}/v2/catalog/batch-upsert`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        idempotency_key: `wps-catalog-seed-${Date.now()}-${Math.random()}`,
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

async function seedWpsStarbucksCatalog() {
  console.log('🌱 Seeding WPS Starbucks Compliant Square Sandbox Catalog...')
  
  try {
    // Check if we have the right environment variables
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      throw new Error('SQUARE_ACCESS_TOKEN not found in environment')
    }

    console.log('🔑 Using Square Sandbox Environment')
    console.log(`📍 Square Base URL: ${SQUARE_BASE_URL}`)

    // First, create categories
    console.log('📁 Creating WPS Starbucks compliant categories...')
    const categoryResult = await createCatalogBatch(wpsCategories)
    console.log(`✅ Created ${wpsCategories.length} categories`)

    // Wait a moment for categories to be available
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Then, create items
    console.log('🍽️ Creating WPS compliant menu items...')
    const itemResult = await createCatalogBatch(wpsItems)
    console.log(`✅ Created ${wpsItems.length} menu items`)

    console.log('\n🎉 WPS Starbucks Catalog seeding complete!')
    console.log('📋 Created:')
    console.log(`   - ${wpsCategories.length} categories (including Starbucks hierarchical structure)`)
    console.log(`   - ${wpsItems.length} menu items (WPS compliant naming & descriptions)`)
    console.log('\n📊 Category Breakdown:')
    console.log('   ☕ ESPRESSO, COFFEE & MORE (Starbucks)')
    console.log('   🥤 FRAPPUCCINO® BLENDED BEVERAGES → COFFEE/CREME (Starbucks)')
    console.log('   🫖 TEAVANA® HANDCRAFTED TEA (Starbucks)')
    console.log('   🧊 STARBUCKS REFRESHERS® ICED BEVERAGES (Starbucks)')
    console.log('   🎃 Seasonal (Starbucks)')
    console.log('   🥪 Breakfast & Lunch (House)')
    console.log('   🧁 Pastries & Sweets (House)')
    console.log('   🥜 Snacks (House)')
    console.log('\n🔗 Your menu should now show WPS-compliant categories and payment processing should work')
    console.log('🏪 All Starbucks items use exact naming from WPS Mobile Ordering Guidelines')
    
  } catch (error) {
    console.error('❌ Error seeding WPS catalog:', error.message)
    process.exit(1)
  }
}

// Run the seeding script
if (require.main === module) {
  seedWpsStarbucksCatalog()
}

module.exports = { seedWpsStarbucksCatalog }