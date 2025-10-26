-- Create function to increment inventory stock
CREATE OR REPLACE FUNCTION increment_inventory_stock(
  item_id uuid,
  quantity integer
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE inventory_items 
  SET 
    current_stock = current_stock + quantity,
    last_restocked_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = item_id;
END;
$$;

-- Create function to decrement inventory stock
CREATE OR REPLACE FUNCTION decrement_inventory_stock(
  item_id uuid,
  quantity integer
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE inventory_items 
  SET 
    current_stock = GREATEST(0, current_stock - quantity),
    updated_at = timezone('utc'::text, now())
  WHERE id = item_id;
END;
$$;