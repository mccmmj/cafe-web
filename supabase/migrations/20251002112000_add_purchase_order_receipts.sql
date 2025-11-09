-- Purchase order partial receiving support

BEGIN;

-- Ensure purchase_order_items has an updated_at for audit
ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'handle_updated_at_purchase_order_items'
  ) THEN
    CREATE TRIGGER handle_updated_at_purchase_order_items
      BEFORE UPDATE ON public.purchase_order_items
      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
  END IF;
END;
$$;

-- Create receipts table
CREATE TABLE IF NOT EXISTS public.purchase_order_receipts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  purchase_order_item_id uuid REFERENCES public.purchase_order_items(id) ON DELETE CASCADE NOT NULL,
  quantity_received integer NOT NULL CHECK (quantity_received > 0),
  weight numeric(10,3),
  weight_unit text,
  notes text,
  photo_path text,
  photo_url text,
  received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  received_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_receipts_order
  ON public.purchase_order_receipts(purchase_order_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_order_receipts_item
  ON public.purchase_order_receipts(purchase_order_item_id);

ALTER TABLE public.purchase_order_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages purchase order receipts"
  ON public.purchase_order_receipts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view purchase order receipts"
  ON public.purchase_order_receipts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert purchase order receipts"
  ON public.purchase_order_receipts
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- If needed in the future we can allow updates/deletes with additional workflows.

-- Receipt logging function
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

  PERFORM public.increment_inventory_stock(item_record.inventory_item_id, p_quantity);

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
  SELECT
    item_record.inventory_item_id,
    'purchase',
    p_quantity,
    GREATEST(0, inv.current_stock - p_quantity),
    inv.current_stock,
    new_receipt.id::text,
    COALESCE(p_notes, 'Receipt for purchase order ' || item_record.order_number),
    p_received_by
  FROM public.inventory_items inv
  WHERE inv.id = item_record.inventory_item_id;

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
