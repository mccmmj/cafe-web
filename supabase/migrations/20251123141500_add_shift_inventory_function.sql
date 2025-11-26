-- Atomic shift between two inventory items
create or replace function public.shift_inventory_between_items(
  p_from_item_id uuid,
  p_to_item_id uuid,
  p_quantity numeric
) returns void
language plpgsql
as $$
begin
  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  -- Decrement source
  update inventory_items
  set current_stock = current_stock - p_quantity
  where id = p_from_item_id;

  -- Increment target
  update inventory_items
  set current_stock = current_stock + p_quantity
  where id = p_to_item_id;
end;
$$;

comment on function public.shift_inventory_between_items is 'Moves quantity between two inventory_items atomically';
