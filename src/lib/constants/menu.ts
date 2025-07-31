// Menu-related constants

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