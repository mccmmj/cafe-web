# Database Setup Guide

## Phase 2: Database Schema and Authentication Setup

### Step 1: Run Database Migrations

You need to run the SQL migrations in your Supabase dashboard to set up the database schema.

#### 1. Access Supabase Dashboard

1. Go to [supabase.com](https://supabase.com)
2. Sign in to your project
3. Navigate to **SQL Editor** in the left sidebar

#### 2. Run Migration 1: Initial Schema

Copy and paste the contents of `supabase/migrations/001_initial_schema.sql` into the SQL Editor and execute it.

This creates:
- `profiles` table (user profiles)
- `orders` table (order records)
- `order_items` table (individual items in orders)
- `user_favorites` table (user's favorite menu items)
- `user_addresses` table (user addresses for delivery)
- Automatic triggers for profile creation and timestamp updates
- Performance indexes

#### 3. Run Migration 2: Row Level Security

Copy and paste the contents of `supabase/migrations/002_row_level_security.sql` into the SQL Editor and execute it.

This sets up:
- Row Level Security (RLS) on all tables
- Policies ensuring users can only access their own data
- Admin policies for cafe staff (emails ending in `@littlecafe.com`)
- Guest checkout support for anonymous orders

### Step 2: Verify Database Setup

1. Start your development server: `npm run dev`
2. Visit: `http://localhost:3000/test`
3. Click "Test Database Schema"
4. Should show ✅ Success with all tables: OK

### Step 3: Test Authentication Flow

1. On your website, click "Sign Up" in the navigation
2. Create a test account with your email
3. Check your email for the confirmation link
4. Sign in with your new account
5. Visit your profile page
6. Test sign out functionality

### Database Tables Overview

#### `profiles`
- Extends Supabase auth.users
- Stores: full_name, phone, email
- Auto-created when user signs up

#### `orders`
- Main order records
- Links to users (or null for guest orders)
- Tracks: total_amount, status, payment_status
- Includes: square_order_id for Square integration

#### `order_items`
- Individual items within orders
- Stores: item details, quantities, prices
- JSON fields for variations and modifiers

#### `user_favorites`
- User's saved favorite menu items
- Links Square item IDs to users

#### `user_addresses`
- Multiple addresses per user
- For delivery and contact information

### Security Features

#### Row Level Security (RLS)
- Users can only access their own data
- Guest orders are protected but accessible for completion
- Admin access for cafe staff emails

#### Authentication
- Email/password signup with email verification
- Secure session management via Supabase
- Automatic profile creation on signup

### Troubleshooting

#### Migration Errors
- Ensure you're running migrations in order
- Check for typos in SQL
- Verify your Supabase project is active

#### Authentication Issues
- Check environment variables are correct
- Verify email confirmation in Supabase settings
- Test with different browsers to rule out cache issues

#### Database Connection Errors
- Verify Supabase URL and anon key
- Check service role key if using server functions
- Ensure RLS policies are properly set up

### Next Steps

Once database setup is complete, you're ready for:
- **Phase 3**: Dynamic menu integration with Square
- **Phase 4**: Shopping cart and checkout flow
- **Phase 5**: Order management and payment processing

### Admin Configuration

To give cafe staff admin access:
1. Update the email domain in the RLS policies
2. Change `@littlecafe.com` to your actual staff email domain
3. Staff with matching emails will be able to view/manage all orders

Example:
```sql
-- Update this line in 002_row_level_security.sql
and profiles.email like '%@yourdomain.com'
```