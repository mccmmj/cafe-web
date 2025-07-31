-- Add proper foreign key relationship between orders and profiles
-- This will allow Supabase to automatically handle joins

-- First, let's check if the user_id column exists in orders table
-- If it doesn't exist, we need to add it
DO $$ 
BEGIN
    -- Check if user_id column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'user_id'
    ) THEN
        -- Add user_id column if it doesn't exist
        ALTER TABLE orders ADD COLUMN user_id UUID;
        
        -- Add comment
        COMMENT ON COLUMN orders.user_id IS 'Foreign key to profiles table (auth.users)';
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    -- Check if foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'orders'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'user_id'
    ) THEN
        -- Add foreign key constraint
        ALTER TABLE orders 
        ADD CONSTRAINT fk_orders_user_id 
        FOREIGN KEY (user_id) REFERENCES profiles(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Create index on user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Update any existing orders that might have user emails in customer_email
-- to link them to the proper user_id (optional - only if you want to link existing orders)
-- Uncomment the following if you want to link existing orders:

/*
UPDATE orders 
SET user_id = profiles.id
FROM profiles 
WHERE orders.customer_email = profiles.email 
AND orders.user_id IS NULL;
*/

-- Verify the relationship was created
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'orders' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id';