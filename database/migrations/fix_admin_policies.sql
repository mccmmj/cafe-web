-- Fix infinite recursion in admin policies
-- This fixes the circular reference in the RLS policies

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Drop admin policies on orders table if they exist
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;

-- Recreate policies without circular references
-- Basic user policies (no circular reference)
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admin policies using a simpler approach
-- Instead of checking role in subquery, we'll use a function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current user has admin role
  -- This avoids the circular reference by using a direct query
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policies using the function
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (is_admin());

-- Admin policies for orders
CREATE POLICY "Admins can view all orders" ON orders
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all orders" ON orders
    FOR UPDATE USING (is_admin());

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;