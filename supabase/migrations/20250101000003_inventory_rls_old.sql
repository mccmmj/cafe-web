-- Row Level Security for Inventory Management Tables
-- Only admin users can access inventory data

-- Enable RLS on all inventory tables
alter table public.inventory_items enable row level security;
alter table public.suppliers enable row level security;
alter table public.stock_movements enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.low_stock_alerts enable row level security;
alter table public.recipe_ingredients enable row level security;

-- Admin-only policies for inventory_items
create policy "Admin can view all inventory items" on public.inventory_items
  for select using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

create policy "Admin can insert inventory items" on public.inventory_items
  for insert with check (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

create policy "Admin can update inventory items" on public.inventory_items
  for update using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

create policy "Admin can delete inventory items" on public.inventory_items
  for delete using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

-- Admin-only policies for suppliers
create policy "Admin can view all suppliers" on public.suppliers
  for select using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

create policy "Admin can manage suppliers" on public.suppliers
  for all using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

-- Admin-only policies for stock_movements (read-only for audit trail)
create policy "Admin can view stock movements" on public.stock_movements
  for select using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

create policy "Admin can insert stock movements" on public.stock_movements
  for insert with check (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

-- Admin-only policies for purchase_orders
create policy "Admin can manage purchase orders" on public.purchase_orders
  for all using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

-- Admin-only policies for purchase_order_items
create policy "Admin can manage purchase order items" on public.purchase_order_items
  for all using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

-- Admin-only policies for low_stock_alerts
create policy "Admin can manage low stock alerts" on public.low_stock_alerts
  for all using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

-- Admin-only policies for recipe_ingredients
create policy "Admin can manage recipe ingredients" on public.recipe_ingredients
  for all using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );