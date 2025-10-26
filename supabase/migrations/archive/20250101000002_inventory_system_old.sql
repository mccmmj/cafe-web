-- Inventory Management System Schema
-- Integrates with existing Square catalog items and order system

-- Inventory Items Table - Links to Square catalog items
create table public.inventory_items (
  id uuid default gen_random_uuid() primary key,
  square_item_id text not null unique, -- Links to Square catalog item
  item_name text not null,
  current_stock integer not null default 0 check (current_stock >= 0),
  minimum_threshold integer not null default 5 check (minimum_threshold >= 0),
  reorder_point integer not null default 10 check (reorder_point >= minimum_threshold),
  unit_cost numeric(10,2) default 0 check (unit_cost >= 0), -- Cost per unit in dollars
  unit_type text not null default 'each' check (unit_type in ('each', 'lb', 'oz', 'gallon', 'liter', 'ml')),
  is_ingredient boolean default false, -- True for ingredients, false for finished products
  supplier_id uuid references public.suppliers(id) on delete set null,
  location text default 'main', -- Storage location
  notes text,
  last_restocked_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Suppliers Table
create table public.suppliers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  contact_person text,
  email text,
  phone text,
  address text,
  payment_terms text, -- e.g., "Net 30", "COD"
  notes text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Stock Movements Table - Track all inventory changes
create table public.stock_movements (
  id uuid default gen_random_uuid() primary key,
  inventory_item_id uuid references public.inventory_items(id) on delete cascade not null,
  movement_type text not null check (movement_type in ('purchase', 'sale', 'adjustment', 'waste', 'transfer')),
  quantity_change integer not null, -- Positive for additions, negative for reductions
  previous_stock integer not null,
  new_stock integer not null,
  unit_cost numeric(10,2), -- Cost per unit for this movement
  reference_id text, -- Order ID, purchase order ID, etc.
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Purchase Orders Table
create table public.purchase_orders (
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

-- Purchase Order Items Table
create table public.purchase_order_items (
  id uuid default gen_random_uuid() primary key,
  purchase_order_id uuid references public.purchase_orders(id) on delete cascade not null,
  inventory_item_id uuid references public.inventory_items(id) on delete cascade not null,
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer default 0 check (quantity_received >= 0),
  unit_cost numeric(10,2) not null check (unit_cost >= 0),
  total_cost numeric(10,2) generated always as (quantity_ordered * unit_cost) stored,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Low Stock Alerts Table - Track alert history and notifications
create table public.low_stock_alerts (
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

-- Recipe/Ingredient Usage Table - Track what ingredients go into finished products
create table public.recipe_ingredients (
  id uuid default gen_random_uuid() primary key,
  finished_item_id uuid references public.inventory_items(id) on delete cascade not null,
  ingredient_item_id uuid references public.inventory_items(id) on delete cascade not null,
  quantity_used numeric(10,4) not null check (quantity_used > 0), -- Amount of ingredient used per finished item
  unit_type text not null default 'each',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(finished_item_id, ingredient_item_id)
);

-- Add updated_at triggers for all new tables
create trigger handle_updated_at before update on public.inventory_items
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.suppliers
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.purchase_orders
  for each row execute procedure public.handle_updated_at();

-- Create indexes for performance
create index idx_inventory_items_square_id on public.inventory_items(square_item_id);
create index idx_inventory_items_stock_level on public.inventory_items(current_stock);
create index idx_inventory_items_supplier on public.inventory_items(supplier_id);
create index idx_stock_movements_item on public.stock_movements(inventory_item_id);
create index idx_stock_movements_type on public.stock_movements(movement_type);
create index idx_stock_movements_created on public.stock_movements(created_at desc);
create index idx_purchase_orders_supplier on public.purchase_orders(supplier_id);
create index idx_purchase_orders_status on public.purchase_orders(status);
create index idx_purchase_order_items_po on public.purchase_order_items(purchase_order_id);
create index idx_low_stock_alerts_item on public.low_stock_alerts(inventory_item_id);
create index idx_low_stock_alerts_level on public.low_stock_alerts(alert_level);
create index idx_recipe_ingredients_finished on public.recipe_ingredients(finished_item_id);
create index idx_recipe_ingredients_ingredient on public.recipe_ingredients(ingredient_item_id);

-- Insert initial suppliers (can be customized later)
insert into public.suppliers (name, contact_person, email, phone, payment_terms) values 
  ('Local Coffee Roasters', 'John Smith', 'orders@localroasters.com', '(303) 555-0101', 'Net 15'),
  ('Mile High Dairy', 'Sarah Johnson', 'sarah@milehighdairy.com', '(303) 555-0102', 'Net 30'),
  ('Denver Bakery Supply', 'Mike Chen', 'mike@denverbakery.com', '(303) 555-0103', 'Net 30'),
  ('Fresh Produce Co', 'Lisa Martinez', 'lisa@freshproduce.com', '(303) 555-0104', 'COD'),
  ('Paper & Packaging Plus', 'David Wilson', 'david@packagingplus.com', '(303) 555-0105', 'Net 30');