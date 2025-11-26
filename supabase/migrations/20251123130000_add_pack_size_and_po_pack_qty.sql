-- Add pack_size to inventory items
alter table inventory_items
  add column if not exists pack_size numeric default 1;

-- Add ordered_pack_qty to purchase order items
alter table purchase_order_items
  add column if not exists ordered_pack_qty numeric;

create index if not exists purchase_order_items_ordered_pack_qty_idx on purchase_order_items (ordered_pack_qty);
