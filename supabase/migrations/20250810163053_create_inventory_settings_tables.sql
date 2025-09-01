-- Create inventory settings table
CREATE TABLE IF NOT EXISTS public.inventory_settings (
  id uuid default gen_random_uuid() primary key,
  global_low_stock_threshold integer not null default 10 check (global_low_stock_threshold >= 0),
  global_critical_stock_threshold integer not null default 5 check (global_critical_stock_threshold >= 0),
  default_reorder_point_multiplier numeric(4,2) not null default 2.0 check (default_reorder_point_multiplier >= 1.0),
  auto_create_alerts boolean default true,
  alert_email_notifications boolean default false,
  alert_email text,
  default_unit_type text not null default 'each',
  default_location text not null default 'main',
  currency text not null default 'USD' check (currency in ('USD', 'EUR', 'GBP', 'CAD')),
  enable_barcode_scanning boolean default false,
  enable_expiry_tracking boolean default false,
  require_purchase_orders boolean default false,
  auto_update_costs boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create inventory locations table
CREATE TABLE IF NOT EXISTS public.inventory_locations (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create inventory unit types table
CREATE TABLE IF NOT EXISTS public.inventory_unit_types (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  symbol text not null unique,
  category text not null default 'Count' check (category in ('Weight', 'Volume', 'Count', 'Length')),
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_settings_updated_at
  BEFORE UPDATE ON inventory_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_locations_updated_at
  BEFORE UPDATE ON inventory_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_unit_types_updated_at
  BEFORE UPDATE ON inventory_unit_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default locations
INSERT INTO public.inventory_locations (name, description) VALUES
  ('main', 'Main storage area'),
  ('walk-in-cooler', 'Walk-in refrigerated storage'),
  ('freezer', 'Frozen storage area'),
  ('dry-storage', 'Dry goods storage'),
  ('prep-area', 'Kitchen prep area')
ON CONFLICT (name) DO NOTHING;

-- Insert default unit types
INSERT INTO public.inventory_unit_types (name, symbol, category) VALUES
  ('Each', 'each', 'Count'),
  ('Pounds', 'lb', 'Weight'),
  ('Ounces', 'oz', 'Weight'),
  ('Gallons', 'gal', 'Volume'),
  ('Liters', 'L', 'Volume'),
  ('Milliliters', 'ml', 'Volume'),
  ('Kilograms', 'kg', 'Weight'),
  ('Grams', 'g', 'Weight')
ON CONFLICT (symbol) DO NOTHING;

-- Enable RLS
ALTER TABLE public.inventory_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_unit_types ENABLE ROW LEVEL SECURITY;

-- Create temporary RLS policies (will upgrade to admin-only later)
CREATE POLICY "Allow authenticated access to inventory_settings" ON public.inventory_settings
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated access to inventory_locations" ON public.inventory_locations
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated access to inventory_unit_types" ON public.inventory_unit_types
  FOR ALL USING (auth.uid() IS NOT NULL);