-- Add approved_at / confirmed_at timestamps to purchase_orders and backfill from history

BEGIN;

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

WITH status_agg AS (
  SELECT
    purchase_order_id,
    MAX(changed_at) FILTER (WHERE new_status = 'approved') AS approved_at,
    MAX(changed_at) FILTER (WHERE new_status = 'confirmed') AS confirmed_at
  FROM public.purchase_order_status_history
  GROUP BY purchase_order_id
)
UPDATE public.purchase_orders po
SET
  approved_at = COALESCE(po.approved_at, status_agg.approved_at),
  confirmed_at = COALESCE(po.confirmed_at, status_agg.confirmed_at)
FROM status_agg
WHERE status_agg.purchase_order_id = po.id;

-- Helpful index for analytics (status/date filters)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status_order_date
  ON public.purchase_orders(status, order_date DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_received_at
  ON public.purchase_orders(received_at DESC NULLS LAST);

COMMIT;
