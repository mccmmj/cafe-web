-- Add supplier name to PO metrics view/RPC for dashboards

BEGIN;

DROP VIEW IF EXISTS public.po_supplier_metrics_v;

CREATE VIEW public.po_supplier_metrics_v AS
WITH order_base AS (
  SELECT
    po.id,
    po.supplier_id,
    s.name AS supplier_name,
    po.status,
    po.order_date,
    po.expected_delivery_date,
    po.total_amount,
    po.approved_at,
    po.sent_at,
    po.received_at,
    po.confirmed_at,
    COALESCE(
      po.approved_at,
      (
        SELECT MAX(ch.changed_at)
        FROM public.purchase_order_status_history ch
        WHERE ch.purchase_order_id = po.id
          AND ch.new_status = 'approved'
      )
    ) AS approved_ts,
    COALESCE(
      po.sent_at,
      (
        SELECT MAX(ch.changed_at)
        FROM public.purchase_order_status_history ch
        WHERE ch.purchase_order_id = po.id
          AND ch.new_status = 'sent'
      )
    ) AS sent_ts,
    COALESCE(
      po.received_at,
      (
        SELECT MAX(ch.changed_at)
        FROM public.purchase_order_status_history ch
        WHERE ch.purchase_order_id = po.id
          AND ch.new_status = 'received'
      )
    ) AS received_ts
  FROM public.purchase_orders po
  LEFT JOIN public.suppliers s ON s.id = po.supplier_id
), item_quantities AS (
  SELECT
    purchase_order_id,
    SUM(quantity_ordered) AS quantity_ordered,
    SUM(quantity_received) AS quantity_received
  FROM public.purchase_order_items
  GROUP BY purchase_order_id
), invoice_stats AS (
  SELECT
    purchase_order_id,
    COUNT(*) AS total_matches,
    COUNT(*) FILTER (WHERE oim.status IN ('pending', 'reviewing', 'rejected')) AS exception_matches,
    COUNT(*) FILTER (
      WHERE abs(COALESCE(oim.amount_variance, 0)) > 1
         OR abs(COALESCE(oim.quantity_variance, 0)) > 0.01
    ) AS variance_matches,
    COUNT(*) FILTER (WHERE oim.status = 'confirmed') AS confirmed_matches,
    AVG(
      EXTRACT(EPOCH FROM (inv.confirmed_at - inv.created_at)) / 86400.0
    ) FILTER (WHERE inv.confirmed_at IS NOT NULL) AS avg_invoice_throughput_days
  FROM public.order_invoice_matches oim
  LEFT JOIN public.invoices inv ON inv.id = oim.invoice_id
  GROUP BY purchase_order_id
)
SELECT
  ob.supplier_id,
  ob.supplier_name,
  date_trunc('month', ob.order_date)::date AS period_month,
  COUNT(*) AS total_pos,
  SUM(ob.total_amount) AS total_spend,
  SUM(ob.total_amount) FILTER (
    WHERE ob.status IN ('draft','pending_approval','approved','sent')
  ) AS open_balance,
  AVG(EXTRACT(EPOCH FROM (approved_ts - ob.order_date)) / 86400.0) AS avg_approval_days,
  AVG(EXTRACT(EPOCH FROM (sent_ts - approved_ts)) / 86400.0) AS avg_issue_days,
  AVG(EXTRACT(EPOCH FROM (received_ts - sent_ts)) / 86400.0) AS avg_receipt_days,
  SUM(
    CASE
      WHEN ob.expected_delivery_date IS NOT NULL
       AND received_ts IS NOT NULL
       AND received_ts <= ob.expected_delivery_date THEN 1
      ELSE 0
    END
  ) AS on_time_receipts,
  SUM(CASE WHEN received_ts IS NOT NULL THEN 1 ELSE 0 END) AS total_receipts,
  SUM(COALESCE(item_quantities.quantity_received, 0)) AS quantity_received,
  SUM(COALESCE(item_quantities.quantity_ordered, 0)) AS quantity_ordered,
  SUM(invoice_stats.total_matches) AS invoice_match_count,
  SUM(invoice_stats.exception_matches) AS invoice_exception_count,
  SUM(invoice_stats.variance_matches) AS variance_match_count,
  AVG(invoice_stats.avg_invoice_throughput_days) AS avg_invoice_throughput_days
FROM order_base ob
LEFT JOIN item_quantities ON item_quantities.purchase_order_id = ob.id
LEFT JOIN invoice_stats ON invoice_stats.purchase_order_id = ob.id
GROUP BY ob.supplier_id, ob.supplier_name, date_trunc('month', ob.order_date)::date;

DROP FUNCTION IF EXISTS public.rpc_po_supplier_metrics(
  timestamptz,
  timestamptz,
  uuid[]
);

CREATE FUNCTION public.rpc_po_supplier_metrics(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_supplier_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  supplier_id uuid,
  supplier_name text,
  period_month date,
  total_pos bigint,
  total_spend numeric,
  open_balance numeric,
  avg_approval_days numeric,
  avg_issue_days numeric,
  avg_receipt_days numeric,
  on_time_ratio numeric,
  fulfillment_ratio numeric,
  invoice_exception_rate numeric,
  variance_rate numeric,
  avg_invoice_throughput_days numeric,
  invoice_match_count bigint,
  invoice_exception_count bigint,
  variance_match_count bigint
) AS $$
  SELECT
    supplier_id,
    supplier_name,
    period_month,
    total_pos,
    total_spend,
    open_balance,
    avg_approval_days,
    avg_issue_days,
    avg_receipt_days,
    CASE
      WHEN total_receipts > 0 THEN on_time_receipts::numeric / total_receipts::numeric
      ELSE NULL
    END AS on_time_ratio,
    CASE
      WHEN quantity_ordered > 0 THEN quantity_received::numeric / quantity_ordered::numeric
      ELSE NULL
    END AS fulfillment_ratio,
    CASE
      WHEN invoice_match_count > 0 THEN invoice_exception_count::numeric / invoice_match_count::numeric
      ELSE NULL
    END AS invoice_exception_rate,
    CASE
      WHEN invoice_match_count > 0 THEN variance_match_count::numeric / invoice_match_count::numeric
      ELSE NULL
    END AS variance_rate,
    avg_invoice_throughput_days,
    invoice_match_count,
    invoice_exception_count,
    variance_match_count
  FROM public.po_supplier_metrics_v
  WHERE (p_start_date IS NULL OR period_month >= date_trunc('month', p_start_date)::date)
    AND (p_end_date IS NULL OR period_month <= date_trunc('month', p_end_date)::date)
    AND (
      p_supplier_ids IS NULL
      OR supplier_id = ANY(p_supplier_ids)
    );
$$ LANGUAGE sql STABLE;

COMMIT;
