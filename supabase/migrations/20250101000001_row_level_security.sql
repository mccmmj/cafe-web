-- Enable Row Level Security on all tables
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.user_favorites enable row level security;
alter table public.user_addresses enable row level security;

-- Profiles policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Orders policies
create policy "Users can view own orders" on public.orders
  for select using (auth.uid() = user_id);

create policy "Users can create orders" on public.orders
  for insert with check (auth.uid() = user_id);

create policy "Users can update own pending orders" on public.orders
  for update using (auth.uid() = user_id and status = 'pending');

-- Allow anonymous users to create orders (for guest checkout)
create policy "Anonymous users can create orders" on public.orders
  for insert with check (user_id is null);

-- Order items policies
create policy "Users can view own order items" on public.order_items
  for select using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and (orders.user_id = auth.uid() or orders.user_id is null)
    )
  );

create policy "Users can create order items" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and (orders.user_id = auth.uid() or orders.user_id is null)
    )
  );

-- User favorites policies
create policy "Users can view own favorites" on public.user_favorites
  for select using (auth.uid() = user_id);

create policy "Users can manage own favorites" on public.user_favorites
  for all using (auth.uid() = user_id);

-- User addresses policies
create policy "Users can view own addresses" on public.user_addresses
  for select using (auth.uid() = user_id);

create policy "Users can manage own addresses" on public.user_addresses
  for all using (auth.uid() = user_id);

-- Admin policies (for cafe staff to view orders)
-- Note: You'll need to add admin role management later
create policy "Staff can view all orders" on public.orders
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.email like '%@littlecafe.com' -- Adjust this to your staff email domain
    )
  );

create policy "Staff can update order status" on public.orders
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.email like '%@littlecafe.com'
    )
  );