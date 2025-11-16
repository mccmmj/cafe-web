-- Supplier-specific email templates for purchase orders

BEGIN;

CREATE TABLE IF NOT EXISTS public.supplier_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  template_type text NOT NULL DEFAULT 'purchase_order',
  subject_template text NOT NULL,
  body_template text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.supplier_email_templates
  ADD CONSTRAINT supplier_email_templates_unique_supplier_type
  UNIQUE (supplier_id, template_type);

CREATE INDEX IF NOT EXISTS idx_supplier_email_templates_supplier
  ON public.supplier_email_templates(supplier_id);

ALTER TABLE public.supplier_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages supplier email templates"
  ON public.supplier_email_templates
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view supplier email templates"
  ON public.supplier_email_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage supplier email templates"
  ON public.supplier_email_templates
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

COMMIT;
