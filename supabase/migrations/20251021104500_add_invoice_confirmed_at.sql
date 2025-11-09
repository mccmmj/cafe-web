-- Add confirmed_at timestamp to invoices for final workflow state

BEGIN;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone;

COMMIT;
