-- Make purchase order receipts informational only (no stock mutation)
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
  remaining_count integer;
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

  -- Keep PO item receipt bookkeeping but do NOT mutate inventory stock here.
  UPDATE public.purchase_order_items
    SET quantity_received = quantity_received + p_quantity,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_purchase_order_item_id;

  SELECT COUNT(*)
  INTO remaining_count
  FROM public.purchase_order_items poi
  WHERE poi.purchase_order_id = p_purchase_order_id
    AND poi.quantity_received < poi.quantity_ordered;

  order_completed := remaining_count = 0;

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
