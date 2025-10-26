# Square Tax Configuration Setup

## Current Issue
The Square Catalog API for tax creation appears to return 404 "Resource not found" errors in the sandbox environment. This suggests that tax configuration may need to be done through the Square Dashboard rather than programmatically.

## Manual Tax Setup (Recommended)

### For Square Sandbox:
1. **Log into Square Sandbox Dashboard**
   - Go to: https://squareup.com/login
   - Use your Square developer account

2. **Navigate to Settings → Taxes**
   - Look for "Taxes" or "Tax Settings" in the main menu
   - Or check under "Settings" → "Business" → "Taxes"

3. **Create a Tax Rate**
   - Click "Add Tax" or "Create Tax Rate"
   - Name: "Sales Tax"
   - Rate: 8.25%
   - Make sure it's **enabled**

4. **Apply to Location**
   - Ensure the tax applies to your sandbox location
   - Save the configuration

### For Production:
1. **Configure Real Tax Rates**
   - Use your actual business location's tax rates
   - Consider state, county, and city taxes
   - Ensure compliance with local tax laws

2. **Enable Tax Calculation**
   - Make sure tax calculation is enabled for your location
   - Test with small transactions first

## Alternative API Approaches to Try

### Option 1: Location-based Tax Settings
Some Square accounts may support location-based tax configuration through different endpoints.

### Option 2: Square Dashboard Integration
Configure taxes manually through the dashboard, then use the application to validate they exist.

### Option 3: Contact Square Support
If taxes need to be configured programmatically, contact Square developer support for the correct API approach.

## Testing Your Tax Configuration

After setting up taxes manually, test with:

```bash
npm run debug-square  # Check environment
node scripts/test-square-api.js  # Verify API access
```

Then test payment processing - it should now succeed with proper tax calculation.

## Current Application Behavior

✅ **With Tax Configured**: Payments succeed with accurate tax calculation
🛑 **Without Tax Configured**: Payments blocked with clear error message

The application correctly enforces tax configuration requirements as requested.