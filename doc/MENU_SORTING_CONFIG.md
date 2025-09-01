# Menu Item Sorting Configuration

This document explains how menu items are now automatically sorted within categories to group similar items together.

## How It Works

Items are now intelligently grouped and sorted using **smart pattern matching**:

1. **Items are grouped by type** (sammies together, burritos together, etc.)
2. **Within each group, items are sorted alphabetically**
3. **Groups are ordered by priority** (sammies before burritos, etc.)

## Current Item Groups

### Breakfast & Lunch Items
- **Sammies/Sandwiches** (Priority 10) - matches: "sammie", "sandwich"
- **Burritos** (Priority 20) - matches: "burrito"
- **Wraps** (Priority 30) - matches: "wrap"
- **Bagels** (Priority 40) - matches: "bagel"

### Bakery Items  
- **Muffins** (Priority 10) - matches: "muffin"
- **Cookies** (Priority 20) - matches: "cookie"
- **Pastries** (Priority 30) - matches: "croissant", "danish", "scone", "pastry"

### Drinks
- **Coffee** (Priority 10) - matches: "coffee", "americano", "espresso", "latte", "cappuccino", "macchiato"
- **Frappuccino** (Priority 20) - matches: "frappuccino", "frapp"
- **Tea** (Priority 30) - matches: "tea", "chai"
- **Refreshers** (Priority 40) - matches: "refresher", "lemonade"
- **Smoothies** (Priority 50) - matches: "smoothie"

### Snacks
- **Bars** (Priority 10) - matches: items ending with "bar"
- **Chips** (Priority 20) - matches: "chip", "crisp"

### Other Items
- **Other** (Priority 999) - any items that don't match the above patterns

## Example Results

**Before (Random Order):**
- Turkey Sammie
- Breakfast Burrito
- Ham Sammie  
- Veggie Burrito
- Chicken Sammie

**After (Smart Grouping):**
- Chicken Sammie
- Ham Sammie
- Turkey Sammie
- Breakfast Burrito  
- Veggie Burrito

## Configuration Location

The sorting rules are configured in:
```
src/lib/constants/menu.ts
```

Look for the `ITEM_SORTING` configuration object.

## Customizing the Sorting

### Adding New Item Groups
```typescript
ITEM_GROUPS: {
  // Add new group
  salads: { pattern: /salad/i, priority: 35 },
  
  // Existing groups...
}
```

### Modifying Group Priority
Change the `priority` number (lower = appears first):
```typescript
sammies: { pattern: /sammie|sandwich/i, priority: 5 }, // Now appears before burritos
```

### Changing Sort Patterns
Modify the regex pattern to match different names:
```typescript
burritos: { pattern: /burrito|wrap/i, priority: 20 }, // Now includes wraps
```

## Technical Details

- **Pattern matching is case-insensitive** (`/pattern/i`)
- **Sorting preserves existing category structure** - only affects item order within categories
- **Fallback menu items are also sorted** using the same rules
- **Items that don't match any pattern** fall into the "other" group with priority 999

## Benefits

1. **Improved UX** - Similar items are grouped together
2. **Consistent Ordering** - Menu appears professional and organized  
3. **Automatic** - Works without manual intervention when new items are added
4. **Configurable** - Easy to adjust grouping rules as menu evolves
5. **Smart Matching** - Handles variations in naming (sammie vs sandwich)

The sorting system automatically organizes your menu items so customers can easily find related items grouped together, making the menu browsing experience much more intuitive.