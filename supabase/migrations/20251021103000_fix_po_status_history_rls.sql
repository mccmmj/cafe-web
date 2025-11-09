-- Allow admin users to insert purchase order status history entries

BEGIN;

-- Ensure authenticated admins can log workflow transitions
DROP POLICY IF EXISTS "Admins can insert purchase order history" ON public.purchase_order_status_history;
CREATE POLICY "Admins can insert purchase order history"
  ON public.purchase_order_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

COMMIT;
