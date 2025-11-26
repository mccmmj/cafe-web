-- Add exclusion tracking to purchase order items
alter table purchase_order_items
  add column if not exists is_excluded boolean not null default false;

alter table purchase_order_items
  add column if not exists exclusion_reason text;

alter table purchase_order_items
  add column if not exists excluded_at timestamptz;

alter table purchase_order_items
  add column if not exists excluded_by uuid references auth.users (id);

alter table purchase_order_items
  add column if not exists exclusion_phase text check (exclusion_phase in ('pre_send','post_send','receiving'));

create index if not exists purchase_order_items_is_excluded_idx on purchase_order_items (is_excluded);
