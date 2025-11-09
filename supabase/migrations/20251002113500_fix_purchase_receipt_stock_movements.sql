-- Fix stock movement logging for purchase order receipts

BEGIN;

CREATE OR REPLACE FUNCTION public.log_purchase_order_receipt(
  p_purchase_order_id uuid,
  p_purchase_order_item_id uuid,
  p_quantity integer,
  p_received_by uuid,
  p_notes text DEFAULT NULL,
  p_weight numeric DEFAULT NULL,
  p_weight_unit text DEFAULT NULL,
  p_photo_path text DEFAULT NULL,
  p_photo_url text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  item_record RECORD;
  new_receipt public.purchase_order_receipts%ROWTYPE;
  remaining integer;
  previous_status text;
  canonical_previous text;
  canonical_new text;
  order_completed boolean := false;
  previous_stock integer;
  new_stock integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  SELECT 
    poi.*,
    po.status AS order_status,
    po.order_number
  INTO item_record
  FROM public.purchase_order_items poi
  JOIN public.purchase_orders po ON po.id = poi.purchase_order_id
  WHERE poi.id = p_purchase_order_item_id
    AND poi.purchase_order_id = p_purchase_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order item % not found for order %', p_purchase_order_item_id, p_purchase_order_id;
  END IF;

  remaining := item_record.quantity_ordered - item_record.quantity_received;

  IF remaining <= 0 THEN
    RAISE EXCEPTION 'Purchase order item already fully received';
  END IF;

  IF p_quantity > remaining THEN
    RAISE EXCEPTION 'Receipt quantity (%) exceeds remaining quantity (%)', p_quantity, remaining;
  END IF;

  INSERT INTO public.purchase_order_receipts (
    purchase_order_id,
    purchase_order_item_id,
    quantity_received,
    weight,
    weight_unit,
    notes,
    photo_path,
    photo_url,
    received_by
  )
  VALUES (
    p_purchase_order_id,
    p_purchase_order_item_id,
    p_quantity,
    p_weight,
    p_weight_unit,
    p_notes,
    p_photo_path,
    p_photo_url,
    p_received_by
  )
  RETURNING * INTO new_receipt;

  UPDATE public.purchase_order_items
    SET quantity_received = quantity_received + p_quantity,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_purchase_order_item_id;

  SELECT current_stock - p_quantity
  INTO previous_stock
  FROM public.inventory_items
  WHERE id = item_record.inventory_item_id;

  IF previous_stock IS NULL THEN
    RAISE EXCEPTION 'Inventory item % not found while logging receipt', item_record.inventory_item_id;
  END IF;

  PERFORM public.increment_inventory_stock(item_record.inventory_item_id, p_quantity);

  SELECT current_stock
  INTO new_stock
  FROM public.inventory_items
  WHERE id = item_record.inventory_item_id;

  INSERT INTO public.stock_movements (
    inventory_item_id,
    movement_type,
    quantity_change,
    previous_stock,
    new_stock,
    reference_id,
    notes,
    created_by
  )
  VALUES (
    item_record.inventory_item_id,
    'purchase',
    p_quantity,
    previous_stock,
    new_stock,
    new_receipt.id::text,
    COALESCE(p_notes, 'Receipt for purchase order ' || item_record.order_number),
    p_received_by
  );

  SELECT COUNT(*)
  INTO remaining
  FROM public.purchase_order_items poi
  WHERE poi.purchase_order_id = p_purchase_order_id
    AND poi.quantity_received < poi.quantity_ordered;

  IF remaining = 0 THEN
    order_completed := true;
  END IF;

  previous_status := item_record.order_status;
  IF previous_status = 'confirmed' THEN
    canonical_previous := 'approved';
  ELSE
    canonical_previous := previous_status;
  END IF;

  IF order_completed THEN
    UPDATE public.purchase_orders
      SET status = 'received',
          actual_delivery_date = COALESCE(actual_delivery_date, timezone('utc'::text, now())),
          updated_at = timezone('utc'::text, now())
      WHERE id = p_purchase_order_id;

    canonical_new := 'received';

    IF canonical_previous IS DISTINCT FROM canonical_new THEN
      INSERT INTO public.purchase_order_status_history (
        purchase_order_id,
        previous_status,
        new_status,
        changed_by,
        note
      ) VALUES (
        p_purchase_order_id,
        canonical_previous,
        canonical_new,
        p_received_by,
        'Automatically marked as received after completing item receipts'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'receipt', to_jsonb(new_receipt),
    'order_completed', order_completed
  );
END;
$$;

COMMIT;
