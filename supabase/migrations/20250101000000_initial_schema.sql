-- Create profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create orders table
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  square_order_id text,
  total_amount integer not null, -- Amount in cents
  tax_amount integer default 0,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'processing', 'completed', 'failed', 'refunded')),
  customer_email text,
  customer_phone text,
  special_instructions text,
  pickup_time timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create order_items table
create table public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  square_item_id text not null,
  item_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price integer not null, -- Price in cents
  total_price integer not null, -- Total for this line item in cents
  variations jsonb default '{}', -- Store selected variations
  modifiers jsonb default '{}', -- Store selected modifiers
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create user_favorites table
create table public.user_favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  square_item_id text not null,
  item_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, square_item_id)
);

-- Create user_addresses table (for delivery/contact info)
create table public.user_addresses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null default 'Home', -- 'Home', 'Work', etc.
  street_address text not null,
  city text not null,
  state text not null,
  zip_code text not null,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create function to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to automatically create profile
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger handle_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.orders
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.user_addresses
  for each row execute procedure public.handle_updated_at();

-- Create indexes for better performance
create index idx_orders_user_id on public.orders(user_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_created_at on public.orders(created_at desc);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_user_favorites_user_id on public.user_favorites(user_id);
create index idx_user_addresses_user_id on public.user_addresses(user_id);