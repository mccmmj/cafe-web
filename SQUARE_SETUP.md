# Square Sandbox Setup Guide

This guide helps you populate your Square sandbox with sample cafe menu data for testing the dynamic menu functionality.

## Prerequisites

1. Square sandbox account with access tokens configured in `.env.local`
2. Environment variables set up:
   ```
   SQUARE_ACCESS_TOKEN=your_sandbox_access_token
   SQUARE_APPLICATION_ID=your_sandbox_application_id
   SQUARE_LOCATION_ID=your_sandbox_location_id
   SQUARE_ENVIRONMENT=sandbox
   ```

## Quick Setup

### Option 1: Populate Square Sandbox (Recommended)

Run the catalog seeding script to add sample menu items to your Square sandbox:

```bash
npm run seed-square
```

This will create:
- **3 Categories**: Breakfast, Coffee & Drinks, Pastries & Sweets
- **7 Menu Items** with various pricing and variations:
  - Breakfast Burrito (Bacon/Sausage variations)
  - Breakfast Sandwich  
  - Café Latte (Tall/Grande/Venti sizes)
  - Americano (Tall/Grande sizes)
  - Cold Brew Coffee
  - Blueberry Muffin
  - Chocolate Chip Cookie
  - Butter Croissant

### Option 2: Use Fallback Menu (Automatic)

If your Square sandbox is empty, the API will automatically return a fallback menu with the same sample items. You'll see a message indicating sample data is being used.

## Testing the Dynamic Menu

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/#menu`

3. You should see the dynamic menu component with:
   - Real-time data from Square (if seeded) or fallback data
   - Add to cart functionality
   - Shopping cart counter
   - Loading states and error handling

## Manual Square Dashboard Setup

Alternatively, you can manually add items through the Square Dashboard:

1. Go to [Square Sandbox Dashboard](https://squareupsandbox.com/dashboard/)
2. Navigate to **Items & Orders** > **Items**
3. Create categories and items matching the sample data structure

## Troubleshooting

### "Failed to fetch menu from Square"
- Check your Square API credentials in `.env.local`
- Verify you're using sandbox endpoints
- Run `npm run seed-square` to populate data

### Empty Menu Display
- Confirm Square sandbox has been populated
- Check browser console for API errors
- The fallback menu should display automatically if Square data is unavailable

### API Permission Errors
- Ensure your Square access token has `ITEMS_READ` permissions
- Verify you're using the correct sandbox application ID and location ID

## Next Steps

Once the menu is working:
1. **Shopping Cart Enhancement** - Full cart management with item details
2. **Square Payments Integration** - Complete checkout flow
3. **Order Management** - Sync orders between Square and local database

## Files Created

- `scripts/seed-square-catalog.js` - Catalog seeding script
- `src/app/api/menu/route.ts` - Dynamic menu API with fallback
- `src/components/DynamicMenu.tsx` - React component for menu display