# Category Layout & Ordering Configuration

This document explains the new category layout system that eliminates white space and provides logical business ordering.

## What Changed

### Layout Improvements
- **Before**: Fixed 3-column grid with excessive white space in cards with fewer items
- **After**: Dynamic masonry layout that eliminates white space and better utilizes vertical space

### Category Ordering Improvements  
- **Before**: Random Square API ordering (creation order)
- **After**: Business logic priority ordering (breakfast → coffee → beverages → snacks)

## Masonry Layout Benefits

### Space Efficiency
- **Eliminates white space** between cards of different heights
- **Better vertical space utilization** - no more short cards with empty space
- **Dynamic column count** - adapts to screen size automatically
- **Responsive design** - works on all device sizes

### Visual Improvements
- **More professional appearance** - no awkward gaps
- **Better content density** - more menu visible at once
- **Natural reading flow** - categories flow logically down the page

## Category Priority System

Categories are now ordered by business logic rather than arbitrary Square API order:

### Priority Order (Lower numbers = Higher priority)

1. **Food Categories** (10-25)
   - Breakfast & Lunch: 10
   - Food: 15  
   - Breakfast: 20
   - Lunch: 25

2. **Core Coffee** (30-40)
   - Coffee: 30
   - Espresso: 35
   - Hot Coffee: 40

3. **Starbucks Beverages** (50-80)
   - Frappuccino: 50
   - Tea: 55
   - Hot Tea: 60
   - Iced Tea: 65
   - Refreshers: 70
   - Smoothies: 75
   - Cold Beverages: 80

4. **Seasonal/Special** (90-95)
   - Seasonal: 90
   - Limited Time: 95

5. **Bakery & Snacks** (100-115)
   - Pastries: 100
   - Bakery: 105
   - Snacks: 110
   - Food & Snacks: 115

6. **Catch-All** (900-999)
   - Other Items: 900
   - Uncategorized: 999

## Smart Category Matching

The system uses intelligent name matching for categories not in the exact priority list:

```typescript
// Partial matching examples:
- "Fresh Pastries" → matches "pastry" → priority 100
- "Iced Coffee Drinks" → matches "coffee" → priority 30  
- "Morning Breakfast" → matches "breakfast" → priority 20
```

## Configuration Location

All settings are in:
```
src/lib/constants/menu.ts
```

Look for:
- `CATEGORY_PRIORITY` - exact category name priorities
- `getCategoryPriority()` - smart matching logic
- `sortMenuCategories()` - sorting implementation

## Masonry Layout Settings

In `MenuContainer.tsx`:
```typescript
<MasonryGrid 
  minColumnWidth={350}  // Minimum width per column
  gap={32}              // Space between cards
  className="w-full"
>
```

### Customizable Properties:
- **minColumnWidth**: Minimum column width (default: 350px)
- **gap**: Space between cards (default: 32px)  
- **Responsive breakpoints**: Automatically calculated

## Example Results

### Before (Fixed Grid):
```
[Breakfast       ] [Pastries] [Coffee          ]
[- Item 1        ] [- Item 1] [- Item 1        ]
[- Item 2        ] [- Item 2] [- Item 2        ]
[- Item 3        ] [        ] [- Item 3        ]
[- Item 4        ] [        ] [- Item 4        ]
[               ] [        ] [- Item 5        ]
[               ] [        ] [                ]
```

### After (Masonry + Business Priority):
```
[Breakfast       ] [Coffee          ] [Pastries]
[- Item 1        ] [- Item 1        ] [- Item 1]
[- Item 2        ] [- Item 2        ] [- Item 2]
[- Item 3        ] [- Item 3        ] [Frappuccino]
[- Item 4        ] [- Item 4        ] [- Item 1]
[Tea             ] [- Item 5        ] [- Item 2]
[- Item 1        ] [Refreshers      ] [- Item 3]
[- Item 2        ] [- Item 1        ]
```

## Benefits

1. **Better Space Utilization** - No wasted white space
2. **Professional Appearance** - Clean, organized layout
3. **Logical Flow** - Categories ordered by business priority
4. **Mobile Friendly** - Responsive column count
5. **Fast Performance** - Efficient layout calculations
6. **Easy Customization** - Simple configuration changes

The new system provides a much more professional and space-efficient menu browsing experience while maintaining the logical business flow customers expect.