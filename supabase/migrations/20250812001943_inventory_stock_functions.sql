-- Create function to update inventory stock levels
CREATE OR REPLACE FUNCTION update_inventory_stock(
  item_id UUID,
  quantity_change INTEGER,
  operation_type TEXT DEFAULT 'manual',
  notes TEXT DEFAULT ''
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the inventory item stock
  UPDATE inventory_items 
  SET 
    current_stock = current_stock + quantity_change,
    last_restocked_at = CASE 
      WHEN quantity_change > 0 THEN NOW() 
      ELSE last_restocked_at 
    END,
    updated_at = NOW()
  WHERE id = item_id;
  
  -- Insert inventory movement record if the table exists
  INSERT INTO inventory_movements (
    inventory_item_id,
    movement_type,
    quantity,
    notes,
    created_at
  ) VALUES (
    item_id,
    CASE 
      WHEN quantity_change > 0 THEN 'stock_in'
      ELSE 'stock_out'
    END,
    ABS(quantity_change),
    COALESCE(notes, operation_type),
    NOW()
  );
  
EXCEPTION
  -- If inventory_movements table doesn't exist, just update the stock
  WHEN undefined_table THEN
    UPDATE inventory_items 
    SET 
      current_stock = current_stock + quantity_change,
      last_restocked_at = CASE 
        WHEN quantity_change > 0 THEN NOW() 
        ELSE last_restocked_at 
      END,
      updated_at = NOW()
    WHERE id = item_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_inventory_stock(UUID, INTEGER, TEXT, TEXT) TO authenticated;

-- Create a simpler stock update function for basic operations
CREATE OR REPLACE FUNCTION update_stock_simple(
  item_id UUID,
  new_stock INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE inventory_items 
  SET 
    current_stock = new_stock,
    updated_at = NOW()
  WHERE id = item_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_stock_simple(UUID, INTEGER) TO authenticated;