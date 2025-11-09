-- Add received_at column to purchase_orders for workflow tracking

BEGIN;

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS received_at timestamp with time zone;

COMMIT;
