// Menu-related constants
import type { MenuCategory, MenuItem } from '@/types/menu'

// Menu Category Types
export const MENU_CATEGORIES = {
  BREAKFAST: 'breakfast',
  PASTRIES: 'pastries', 
  COFFEE: 'coffee',
  TEA: 'tea',
  COLD_DRINKS: 'cold-drinks',
  SANDWICHES: 'sandwiches',
  SNACKS: 'snacks',
  DESSERTS: 'desserts'
} as const

// Item Availability Status
export const ITEM_STATUS = {
  AVAILABLE: 'available',
  OUT_OF_STOCK: 'out_of_stock',
  SEASONAL: 'seasonal',
  DISCONTINUED: 'discontinued'
} as const

// Dietary Restrictions
export const DIETARY_TAGS = {
  VEGETARIAN: 'vegetarian',
  VEGAN: 'vegan',
  GLUTEN_FREE: 'gluten_free',
  DAIRY_FREE: 'dairy_free',
  NUT_FREE: 'nut_free',
  SUGAR_FREE: 'sugar_free',
  KETO: 'keto',
  ORGANIC: 'organic'
} as const

// Size Variations
export const ITEM_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  EXTRA_LARGE: 'extra_large'
} as const

// Temperature Options
export const TEMPERATURE_OPTIONS = {
  HOT: 'hot',
  ICED: 'iced',
  BLENDED: 'blended',
  ROOM_TEMP: 'room_temp'
} as const

// Milk Options
export const MILK_OPTIONS = {
  WHOLE: 'whole_milk',
  TWO_PERCENT: '2_percent',
  SKIM: 'skim_milk',
  ALMOND: 'almond_milk',
  SOY: 'soy_milk',
  OAT: 'oat_milk',
  COCONUT: 'coconut_milk'
} as const

// Default Menu Display Settings
export const MENU_DISPLAY = {
  ITEMS_PER_PAGE: 12,
  CATEGORIES_PER_ROW: 3,
  SEARCH_DEBOUNCE_MS: 300,
  AUTO_EXPAND_CATEGORIES: true
} as const

// Price Formatting
export const PRICE_FORMAT = {
  CURRENCY: 'USD',
  LOCALE: 'en-US',
  DECIMAL_PLACES: 2
} as const

// Brand Configuration
export const BRAND_SETTINGS = {
  // Starbucks category configuration
  STARBUCKS_CATEGORIES: [
    // Official WPS Starbucks Categories - Based on Mobile Ordering Guidelines
    // PRIMARY STARBUCKS CATEGORIES (exact names from guidelines)
    'ESPRESSO, COFFEE & MORE',
    'TEAVANA® HANDCRAFTED TEA', 
    'STARBUCKS REFRESHERS® ICED BEVERAGES',
    'FRAPPUCCINO® BLENDED BEVERAGES',
    
    // SUBCATEGORIES (for hierarchical categories)
    'COFFEE', // Frappuccino subcategory
    'CREME',  // Frappuccino subcategory
    
    // SEASONAL CATEGORIES (when authorized)
    'Seasonal',
    'SEASONAL FAVORITES',
    'HOLIDAY BEVERAGES',
    'LIMITED TIME OFFERS',
    
    // LEGACY/ALTERNATE NAMING (for backward compatibility)
    'Espresso',
    'Coffee',
    'Tea', 
    'Frappuccino',
    'Refreshers',
    'Cold Brew',
    'Iced Coffee'
  ],
  
  // Brand display settings
  STARBUCKS_DISPLAY: {
    SHOW_LOGO: false, // Set to true when you have official logo permission
    SHOW_TEXT_LABEL: true,
    LABEL_TEXT: 'Starbucks',
    LABEL_COLOR: 'text-green-700', // Starbucks green
    ICON_TYPE: 'coffee', // 'coffee' | 'none' | 'custom'
    POSITION: 'header' // 'header' | 'corner' | 'subtitle'
  }
} as const

// Item Sorting Configuration
export const ITEM_SORTING = {
  // Define item groups by name patterns (case-insensitive regex)
  ITEM_GROUPS: {
    // Breakfast & Lunch items
    sammies: { pattern: /sammie|sandwich/i, priority: 10 },
    burritos: { pattern: /burrito/i, priority: 20 },
    wraps: { pattern: /wrap/i, priority: 30 },
    bagels: { pattern: /bagel/i, priority: 40 },
    
    // Bakery items
    muffins: { pattern: /muffin/i, priority: 10 },
    cookies: { pattern: /cookie/i, priority: 20 },
    pastries: { pattern: /croissant|danish|scone|pastry/i, priority: 30 },
    
    // Drinks
    coffee: { pattern: /coffee|americano|espresso|latte|cappuccino|macchiato/i, priority: 10 },
    frappuccino: { pattern: /frappuccino|frapp/i, priority: 20 },
    tea: { pattern: /tea|chai/i, priority: 30 },
    refreshers: { pattern: /refresher|lemonade/i, priority: 40 },
    smoothies: { pattern: /smoothie/i, priority: 50 },
    
    // Snacks
    bars: { pattern: /bar$/i, priority: 10 }, // Items ending with "bar"
    chips: { pattern: /chip|crisp/i, priority: 20 },
    
    // Default priority for unmatched items
    other: { pattern: /.*/i, priority: 999 }
  },
  
  // Sorting options
  SORT_BY: 'group_then_name', // 'name' | 'price' | 'group_then_name' | 'group_then_price'
  SORT_ORDER: 'asc' // 'asc' | 'desc'
} as const

// Helper function to check if a category should show Starbucks branding
export const isStarbucksCategory = (categoryName: string): boolean => {
  return BRAND_SETTINGS.STARBUCKS_CATEGORIES.includes(
    categoryName as typeof BRAND_SETTINGS.STARBUCKS_CATEGORIES[number]
  )
}

// Helper function to get item group and priority
export const getItemGroup = (itemName: string): { group: string; priority: number } => {
  const groups = ITEM_SORTING.ITEM_GROUPS
  
  for (const [groupName, groupConfig] of Object.entries(groups)) {
    if (groupConfig.pattern.test(itemName)) {
      return { group: groupName, priority: groupConfig.priority }
    }
  }
  
  return { group: 'other', priority: groups.other.priority }
}

// Category Ordering Configuration
export const CATEGORY_PRIORITY = {
  // Define business logic priorities for categories (lower numbers = higher priority)
  'Breakfast & Lunch': 10,
  'Food': 15,
  'Breakfast': 20,
  'Lunch': 25,
  
  // Coffee & Espresso (core offerings)
  'Coffee': 30,
  'Espresso': 35,
  'Hot Coffee': 40,
  
  // Starbucks beverages 
  'Frappuccino': 50,
  'Tea': 55,
  'Hot Tea': 60,
  'Iced Tea': 65,
  'Refreshers': 70,
  'Smoothies': 75,
  'Cold Beverages': 80,
  
  // Seasonal/Special
  'Seasonal': 90,
  'Limited Time': 95,
  
  // Bakery & Snacks
  'Pastries': 100,
  'Bakery': 105,
  'Snacks': 110,
  'Food & Snacks': 115,
  
  // Catch-all categories
  'Other Items': 900,
  'Uncategorized': 999
} as const

// Helper function to get category priority
export const getCategoryPriority = (categoryName: string): number => {
  // Try exact match first
  if (categoryName in CATEGORY_PRIORITY) {
    return CATEGORY_PRIORITY[categoryName as keyof typeof CATEGORY_PRIORITY]
  }
  
  // Try partial matching for categories we might not have exact names for
  const lowerName = categoryName.toLowerCase()
  
  if (lowerName.includes('breakfast')) return 20
  if (lowerName.includes('lunch')) return 25
  if (lowerName.includes('coffee')) return 30
  if (lowerName.includes('espresso')) return 35
  if (lowerName.includes('frappuccino') || lowerName.includes('frapp')) return 50
  if (lowerName.includes('tea')) return 55
  if (lowerName.includes('refresher')) return 70
  if (lowerName.includes('smoothie')) return 75
  if (lowerName.includes('seasonal')) return 90
  if (lowerName.includes('pastry') || lowerName.includes('bakery')) return 100
  if (lowerName.includes('snack')) return 110
  
  // Default priority for unknown categories
  return 500
}

// Helper function to sort menu categories
export const sortMenuCategories = (categories: MenuCategory[]): MenuCategory[] => {
  return [...categories].sort((a, b) => {
    const aPriority = getCategoryPriority(a.name)
    const bPriority = getCategoryPriority(b.name)
    
    // First sort by business priority
    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }
    
    // If same priority, sort by Square's ordinal (if available)
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return a.sortOrder - b.sortOrder
    }
    
    // Finally, sort alphabetically
    return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  })
}

// Helper function to sort menu items
export const sortMenuItems = (items: MenuItem[]): MenuItem[] => {
  return [...items].sort((a, b) => {
    const aGroup = getItemGroup(a.name)
    const bGroup = getItemGroup(b.name)
    
    // First sort by group priority
    if (aGroup.priority !== bGroup.priority) {
      return aGroup.priority - bGroup.priority
    }
    
    // Within same group, sort alphabetically by name
    return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  })
}
