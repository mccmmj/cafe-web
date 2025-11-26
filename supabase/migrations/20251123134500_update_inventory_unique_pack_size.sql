-- Drop existing unique constraint on square_item_id
alter table inventory_items
  drop constraint if exists inventory_items_square_item_id_key;

-- Ensure pack_size is not null with default 1
alter table inventory_items
  alter column pack_size set default 1,
  alter column pack_size set not null;

-- Add composite uniqueness on (square_item_id, pack_size) while allowing null square_item_id
create unique index if not exists inventory_items_square_pack_unique
  on inventory_items (square_item_id, pack_size)
  where square_item_id is not null;
