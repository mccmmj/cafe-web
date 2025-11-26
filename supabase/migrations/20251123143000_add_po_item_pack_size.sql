alter table purchase_order_items
  add column if not exists pack_size numeric;

create index if not exists purchase_order_items_pack_size_idx on purchase_order_items (pack_size);
