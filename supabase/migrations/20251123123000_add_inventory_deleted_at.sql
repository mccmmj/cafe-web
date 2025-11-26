alter table inventory_items
  add column if not exists deleted_at timestamptz;

create index if not exists inventory_items_deleted_at_idx on inventory_items (deleted_at);
