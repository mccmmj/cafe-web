-- Create site settings table for global configuration
CREATE TABLE IF NOT EXISTS public.site_settings (
  id integer PRIMARY KEY DEFAULT 1,
  -- Flag to expose the customer-facing app (when false show maintenance screen)
  is_customer_app_live boolean NOT NULL DEFAULT true,
  -- Optional content for the maintenance page
  maintenance_title text DEFAULT 'We''re brewing something new!',
  maintenance_message text DEFAULT 'Our digital cafe is currently under construction. Check back soon for a fresh experience.',
  maintenance_cta_label text DEFAULT 'Visit our Contact Page',
  maintenance_cta_href text DEFAULT '/contact',
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure updated_at is refreshed
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed default row if empty
INSERT INTO public.site_settings (
  id,
  is_customer_app_live,
  maintenance_title,
  maintenance_message,
  maintenance_cta_label,
  maintenance_cta_href
)
SELECT
  1,
  true,
  'We''re brewing something new!',
  'Our digital cafe is currently under construction. Check back soon for a fresh experience.',
  'Visit our Contact Page',
  '/contact'
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings);

-- Enable Row Level Security
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow read access to site settings"
ON public.site_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert site settings"
ON public.site_settings
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update site settings"
ON public.site_settings
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- Grant service role full access for server-side operations
GRANT ALL ON public.site_settings TO service_role;
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.site_settings TO authenticated;
