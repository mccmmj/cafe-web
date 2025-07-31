// Enhanced Menu types
export interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  categoryId: string
  imageUrl?: string
  variations?: MenuItemVariation[]
  isAvailable: boolean
  stockLevel?: number
  modifiers?: MenuModifier[]
  allergens?: string[]
  nutritionInfo?: NutritionInfo
  dietaryTags?: DietaryTag[]
  preparationTime?: number // in minutes
  popularity?: number // 1-5 rating
  isSpecial?: boolean
  seasonalAvailability?: string[]
  ingredients?: string[]
  customizationOptions?: CustomizationOption[]
  squareItemId?: string // Square catalog item ID
  createdAt?: string
  updatedAt?: string
}

export interface MenuItemVariation {
  id: string
  name: string
  priceDifference: number
  available?: boolean
  description?: string
  nutritionInfo?: Partial<NutritionInfo>
  squareVariationId?: string
}

export interface MenuModifier {
  id: string
  name: string
  price: number
  type: 'selection' | 'quantity'
  options?: ModifierOption[]
  required?: boolean
  maxSelections?: number
}

export interface ModifierOption {
  id: string
  name: string
  price: number
  available?: boolean
  isDefault?: boolean
}

export interface NutritionInfo {
  calories?: number
  protein?: number // grams
  carbs?: number // grams
  fat?: number // grams
  fiber?: number // grams
  sugar?: number // grams
  sodium?: number // milligrams
  servingSize?: string
  servingSizeUnit?: 'oz' | 'ml' | 'g' | 'piece'
}

export interface DietaryTag {
  id: string
  name: string
  icon?: string
  color?: string
}

export interface CustomizationOption {
  id: string
  name: string
  type: 'single' | 'multiple'
  required?: boolean
  maxSelections?: number
  options: CustomizationChoice[]
}

export interface CustomizationChoice {
  id: string
  name: string
  price: number
  available?: boolean
  isDefault?: boolean
}

export interface MenuCategory {
  id: string
  name: string
  description?: string
  items: MenuItem[]
  sortOrder?: number
  isActive?: boolean
  displayHours?: {
    start: string // "08:00"
    end: string   // "14:00"
  }
  squareCategoryId?: string
  createdAt?: string
  updatedAt?: string
}

// CartItem is defined in cart.ts to avoid conflicts

// Order interface is defined in orders.ts to avoid conflicts

export interface UserProfile {
  id: string
  email: string
  fullName?: string
  phone?: string
  createdAt: Date
  updatedAt: Date
  preferences?: MenuUserPreferences
}

export interface MenuUserPreferences {
  favoriteItems: string[]
  dietaryRestrictions: string[]
  defaultPaymentMethod?: string
  notifications: {
    orderUpdates: boolean
    promotions: boolean
  }
}

// Menu management types
export interface MenuSearch {
  query: string
  categories?: string[]
  priceRange?: {
    min: number
    max: number
  }
  dietaryTags?: string[]
  availability?: boolean
  sortBy?: 'name' | 'price' | 'popularity' | 'prep_time'
  sortOrder?: 'asc' | 'desc'
}

export interface MenuFilters {
  categories: string[]
  priceRange: {
    min: number
    max: number
  }
  dietaryTags: string[]
  allergens: string[]
  availability: boolean | 'all'
  preparationTime?: number // max prep time in minutes
}

export interface MenuDisplaySettings {
  layout: 'grid' | 'list' | 'compact'
  itemsPerPage: number
  showImages: boolean
  showNutrition: boolean
  showPreparationTime: boolean
  groupByCategory: boolean
}