-- Add role column to profiles table for admin access control (if it doesn't exist)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'staff'));
  END IF;
END $$;

-- Create index for role-based queries (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Update existing users to have customer role by default
UPDATE public.profiles SET role = 'customer' WHERE role IS NULL;