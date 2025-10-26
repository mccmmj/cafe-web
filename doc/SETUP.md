# Little Cafe - Development Setup Guide

## Phase 1: Authentication-Enabled Foundation Setup ✅

### What We've Built

1. **Supabase Integration**
   - Client and server-side configurations  
   - Middleware for automatic session management
   - Authentication helpers ready for login/signup

2. **Square API Integration** 
   - Custom fetch-based client (avoids SDK compatibility issues)
   - Catalog API for menu management
   - Orders API for order processing
   - Payment processing capabilities
   - Locations API working

3. **Type Definitions**
   - Complete TypeScript interfaces for menu items, categories, orders
   - User profiles and cart management types
   - Full type safety throughout the application

4. **Testing Infrastructure**
   - Comprehensive test suite at `/test`
   - API endpoint testing for all integrations
   - Configuration validation
   - Error handling and debugging tools

### Setup Instructions

#### 1. Get Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Settings > API
3. Copy your project URL and anon key
4. Update `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

#### 2. Get Square Credentials

1. Go to [Square Developer Dashboard](https://developer.squareup.com/us/en)
2. Create a new application
3. For development, use Sandbox credentials:
   ```
   SQUARE_APPLICATION_ID=sandbox-sq0idb-your-app-id
   SQUARE_ACCESS_TOKEN=sandbox-sq0atb-your-access-token
   SQUARE_LOCATION_ID=your-sandbox-location-id
   ```

#### 3. Test Your Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Visit http://localhost:3000/test

3. Test both Square and Supabase connections

4. Both should show ✅ Success

### What's Next

Once your tests pass, we'll proceed to:

- **Phase 2**: Database schema setup and menu integration
- **Phase 3**: Authentication UI components
- **Phase 4**: Payment processing
- **Phase 5**: Order management

### File Structure Created

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server client  
│   │   └── middleware.ts      # Session management
│   └── square/
│       ├── client.ts          # Square SDK setup
│       ├── catalog.ts         # Menu management
│       └── orders.ts          # Order processing
├── types/
│   └── menu.ts                # Type definitions
├── app/
│   ├── api/
│   │   ├── test-square/       # Square API test
│   │   └── test-supabase/     # Supabase test
│   └── test/
│       └── page.tsx           # Integration test page
└── middleware.ts              # Next.js middleware
```

### Troubleshooting

**Square API Errors:**
- Verify your access token is for the correct environment (sandbox/production)
- Check that your location ID matches your Square account
- Ensure API permissions are enabled in Square Dashboard

**Supabase Errors:**
- Verify project URL and anon key are correct
- Check that your Supabase project is active
- Ensure RLS (Row Level Security) policies are configured if needed

### Security Notes

- Never commit `.env.local` to version control
- Use sandbox credentials for development
- Switch to production credentials only for deployment
- The `.env.local.example` file shows the required format