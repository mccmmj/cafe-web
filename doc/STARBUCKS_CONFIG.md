# Starbucks Branding Configuration

This file explains how to configure Starbucks branding for menu categories.

## Configuration Location

The Starbucks branding settings are located in:
```
src/lib/constants/menu.ts
```

## How to Configure Categories

1. **Find your actual category names** by visiting your menu page and noting the exact category names displayed.

2. **Update the STARBUCKS_CATEGORIES array** in `src/lib/constants/menu.ts`:

```typescript
STARBUCKS_CATEGORIES: [
  'Coffee & Espresso',      // Replace with your actual category names
  'Frappuccinos',
  'Cold Brew & Iced Coffee',
  'Hot Teas',
  'Iced Teas & Lemonades',
  'Refreshers',
  'Pastries & Bakery'
]
```

3. **Customize the display settings** in the same file:

```typescript
STARBUCKS_DISPLAY: {
  SHOW_LOGO: false,           // Set to true when you have logo permission
  SHOW_TEXT_LABEL: true,      // Show "Starbucks" text
  LABEL_TEXT: 'Starbucks',    // Customize the text
  LABEL_COLOR: 'text-green-700', // Customize the color
  ICON_TYPE: 'coffee',        // 'coffee' | 'none' | 'custom'
  POSITION: 'header'          // 'header' | 'corner' | 'subtitle'
}
```

## Visual Appearance

When configured, categories in the STARBUCKS_CATEGORIES list will display:
- A coffee cup icon (if ICON_TYPE is 'coffee')
- "Starbucks" text in green
- Styled as a badge next to the category name

## Example Categories to Configure

Based on typical Starbucks offerings, you might have categories like:
- "Drinks" or "Beverages"
- "Coffee"
- "Tea" 
- "Pastries"
- "Food" or "Snacks"
- Any other categories that contain only Starbucks items

## Testing

After updating the configuration:
1. Save the file
2. Refresh your browser
3. Categories in your list should now show the Starbucks branding

## Logo Usage

Currently set to use text-based branding for legal safety. To use the actual Starbucks logo:
1. Obtain official permission from Starbucks
2. Add the logo file to `/public/images/starbucks-logo.svg`
3. Set `SHOW_LOGO: true` in the configuration