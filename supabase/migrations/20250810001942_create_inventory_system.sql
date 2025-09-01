-- Inventory Management System Schema
-- Creates comprehensive inventory tracking system with suppliers, stock movements, and alerts

-- 1. Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  contact_person text,
  email text,
  phone text,
  address text,
  payment_terms text,
  notes text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create inventory_items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid default gen_random_uuid() primary key,
  square_item_id text not null unique,
  item_name text not null,
  current_stock integer not null default 0 check (current_stock >= 0),
  minimum_threshold integer not null default 5 check (minimum_threshold >= 0),
  reorder_point integer not null default 10 check (reorder_point >= minimum_threshold),
  unit_cost numeric(10,2) default 0 check (unit_cost >= 0),
  unit_type text not null default 'each' check (unit_type in ('each', 'lb', 'oz', 'gallon', 'liter', 'ml')),
  is_ingredient boolean default false,
  supplier_id uuid references public.suppliers(id) on delete set null,
  location text default 'main',
  notes text,
  last_restocked_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create stock_movements table
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid default gen_random_uuid() primary key,
  inventory_item_id uuid references public.inventory_items(id) on delete cascade not null,
  movement_type text not null check (movement_type in ('purchase', 'sale', 'adjustment', 'waste', 'transfer')),
  quantity_change integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  unit_cost numeric(10,2),
  reference_id text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid default gen_random_uuid() primary key,
  supplier_id uuid references public.suppliers(id) on delete set null not null,
  order_number text unique,
  status text not null default 'draft' check (status in ('draft', 'sent', 'confirmed', 'received', 'cancelled')),
  order_date date not null default current_date,
  expected_delivery_date date,
  actual_delivery_date date,
  total_amount numeric(10,2) default 0,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create purchase_order_items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid default gen_random_uuid() primary key,
  purchase_order_id uuid references public.purchase_orders(id) on delete cascade not null,
  inventory_item_id uuid references public.inventory_items(id) on delete cascade not null,
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer default 0 check (quantity_received >= 0),
  unit_cost numeric(10,2) not null check (unit_cost >= 0),
  total_cost numeric(10,2) generated always as (quantity_ordered * unit_cost) stored,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Create low_stock_alerts table
CREATE TABLE IF NOT EXISTS public.low_stock_alerts (
  id uuid default gen_random_uuid() primary key,
  inventory_item_id uuid references public.inventory_items(id) on delete cascade not null,
  alert_level text not null check (alert_level in ('low', 'critical', 'out_of_stock')),
  stock_level integer not null,
  threshold_level integer not null,
  is_acknowledged boolean default false,
  acknowledged_by uuid references auth.users(id) on delete set null,
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Create recipe_ingredients table for tracking ingredient usage
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id uuid default gen_random_uuid() primary key,
  finished_item_id uuid references public.inventory_items(id) on delete cascade not null,
  ingredient_item_id uuid references public.inventory_items(id) on delete cascade not null,
  quantity_used numeric(10,4) not null check (quantity_used > 0),
  unit_type text not null default 'each',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(finished_item_id, ingredient_item_id)
);

-- 8. Add updated_at triggers
CREATE TRIGGER handle_updated_at_suppliers BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_inventory_items BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_purchase_orders BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 9. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_square_id ON public.inventory_items(square_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock_level ON public.inventory_items(current_stock);
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier ON public.inventory_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON public.stock_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements(created_at desc);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_item ON public.low_stock_alerts(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_level ON public.low_stock_alerts(alert_level);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_finished ON public.recipe_ingredients(finished_item_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON public.recipe_ingredients(ingredient_item_id);

-- 10. Enable Row Level Security
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- 11. Create basic RLS policies 
-- Note: Admin-specific policies will be added after role column is created
-- For now, allow authenticated users to manage their data

CREATE POLICY "Authenticated users can manage inventory items" ON public.inventory_items 
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage suppliers" ON public.suppliers 
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view stock movements" ON public.stock_movements 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert stock movements" ON public.stock_movements 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage purchase orders" ON public.purchase_orders 
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage purchase order items" ON public.purchase_order_items 
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage low stock alerts" ON public.low_stock_alerts 
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage recipe ingredients" ON public.recipe_ingredients 
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 12. Insert initial suppliers
INSERT INTO public.suppliers (name, contact_person, email, phone, payment_terms) VALUES 
  ('Local Coffee Roasters', 'John Smith', 'orders@localroasters.com', '(303) 555-0101', 'Net 15'),
  ('Mile High Dairy', 'Sarah Johnson', 'sarah@milehighdairy.com', '(303) 555-0102', 'Net 30'),
  ('Denver Bakery Supply', 'Mike Chen', 'mike@denverbakery.com', '(303) 555-0103', 'Net 30'),
  ('Fresh Produce Co', 'Lisa Martinez', 'lisa@freshproduce.com', '(303) 555-0104', 'COD'),
  ('Paper & Packaging Plus', 'David Wilson', 'david@packagingplus.com', '(303) 555-0105', 'Net 30')
ON CONFLICT (name) DO NOTHING;

-- Add table comments for documentation
COMMENT ON TABLE public.inventory_items IS 'Tracks stock levels and details for all cafe inventory items';
COMMENT ON TABLE public.suppliers IS 'Vendor information and payment terms';
COMMENT ON TABLE public.stock_movements IS 'Audit trail for all inventory quantity changes';
COMMENT ON TABLE public.purchase_orders IS 'Purchase orders sent to suppliers';
COMMENT ON TABLE public.low_stock_alerts IS 'Automated alerts when stock falls below thresholds';
COMMENT ON TABLE public.recipe_ingredients IS 'Ingredient usage tracking for finished products';