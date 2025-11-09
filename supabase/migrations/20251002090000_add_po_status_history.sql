-- Add purchase order status history and extended workflow statuses

BEGIN;

-- Update status constraint to allow new workflow states
ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_status_check
  CHECK (
    status IN (
      'draft',
      'pending_approval',
      'approved',
      'sent',
      'received',
      'cancelled',
      'confirmed'
    )
  );

-- Status history table
CREATE TABLE IF NOT EXISTS public.purchase_order_status_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  changed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT purchase_order_status_history_status_check
    CHECK (
      new_status IN (
        'draft',
        'pending_approval',
        'approved',
        'sent',
        'received',
        'cancelled',
        'confirmed'
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_po_status_history_order
  ON public.purchase_order_status_history(purchase_order_id, changed_at DESC);

-- Enable RLS and allow service role to manage history
ALTER TABLE public.purchase_order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages purchase order history"
  ON public.purchase_order_status_history
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read purchase order history"
  ON public.purchase_order_status_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

COMMIT;
