-- Track unit cost changes over time
begin;

create table if not exists public.inventory_item_cost_history (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  previous_unit_cost numeric,
  new_unit_cost numeric not null,
  pack_size numeric default 1,
  source text not null,
  source_ref uuid,
  notes text,
  changed_by uuid,
  changed_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists inventory_item_cost_history_item_idx
  on public.inventory_item_cost_history (inventory_item_id, changed_at desc);

alter table public.inventory_item_cost_history enable row level security;

-- Simple policies for authenticated users (admin area) to read/insert history
drop policy if exists "inventory_cost_history_read" on public.inventory_item_cost_history;
drop policy if exists "inventory_cost_history_insert" on public.inventory_item_cost_history;

create policy "inventory_cost_history_read"
  on public.inventory_item_cost_history
  for select
  using (true);

create policy "inventory_cost_history_insert"
  on public.inventory_item_cost_history
  for insert
  with check (true);

commit;
