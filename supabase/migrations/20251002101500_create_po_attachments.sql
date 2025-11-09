-- Purchase order attachments for supplier confirmations and change requests

BEGIN;

CREATE TABLE IF NOT EXISTS public.purchase_order_attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  storage_path text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  uploaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_attachments_order
  ON public.purchase_order_attachments(purchase_order_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_order_attachments_uploader
  ON public.purchase_order_attachments(uploaded_by);

ALTER TABLE public.purchase_order_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages purchase order attachments"
  ON public.purchase_order_attachments
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view purchase order attachments"
  ON public.purchase_order_attachments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert purchase order attachments"
  ON public.purchase_order_attachments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update purchase order attachments"
  ON public.purchase_order_attachments
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete purchase order attachments"
  ON public.purchase_order_attachments
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

COMMIT;
