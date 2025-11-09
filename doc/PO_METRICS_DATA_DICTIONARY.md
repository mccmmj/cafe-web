# Purchase Order Metrics – Data Dictionary (Phase 6.1)

This document captures the KPI definitions, source tables, and data-quality gaps for Phase 6 of the PO Workflow Plan. It should serve as the contract between backend analytics, API responses, and the admin UI.

## 1. Core Metrics & Formulas

| Metric | Description / Business Question | Source Tables & Columns | Calculation / Notes |
| --- | --- | --- | --- |
| **Spend by Supplier** | How much have we purchased per supplier in a time window? | `purchase_orders.total_amount`, `purchase_orders.order_date`, `suppliers.id` | Sum `total_amount` grouped by supplier for POs with `status IN ('pending_approval','approved','sent','received','confirmed')` and `order_date` within range. Exclude `status='cancelled'`. |
| **Open PO Balance** | Outstanding commitments not yet received/confirmed. | `purchase_orders.status`, `purchase_orders.total_amount` | Sum `total_amount` for POs where `status IN ('draft','pending_approval','approved','sent')`. |
| **PO Aging Buckets** | How long POs have been open vs expected delivery. | `purchase_orders.order_date`, `purchase_orders.expected_delivery_date`, `status` | Bucket `(NOW() - COALESCE(expected_delivery_date, order_date))` for open statuses. |
| **Cycle Time (Draft→Approved→Sent→Received)** | Workflow efficiency. | `purchase_order_status_history.changed_at`, `purchase_orders.approved_at`, `sent_at`, `received_at`, `confirmed_at` | Use status history and dedicated timestamp columns to compute durations per phase: `pending_approval - draft`, `approved - pending`, etc. |
| **On-Time Delivery %** | Share of POs received on/before expected date. | `purchase_orders.expected_delivery_date`, `purchase_orders.received_at` (new), `purchase_orders.status` | Ratio of `received_at <= expected_delivery_date` among POs with `status='received'`. |
| **Fulfillment Accuracy** | How closely delivered quantities match orders. | `purchase_order_items.quantity_ordered`, `purchase_order_items.quantity_received`, `purchase_order_receipts.quantity_received` | `(Σ quantity_received / Σ quantity_ordered)` per supplier or PO. Flag partials using receipts table. |
| **Price / Quantity Variance Rate** | How often invoices deviate from PO totals. | `order_invoice_matches.amount_variance`, `quantity_variance`, `status` | % of matches with `ABS(amount_variance) > threshold OR ABS(quantity_variance) > threshold` against total confirmed matches. |
| **Invoice Exception Rate** | Invoices that required manual review or were rejected. | `order_invoice_matches.status`, `invoices.status`, `invoices.confirmed_at` | `(count status IN ('pending','reviewing','rejected')) / total invoice matches in period.` |
| **Invoice Throughput Time** | Time from invoice upload to confirmation. | `invoices.created_at`, `invoices.confirmed_at` | `confirmed_at - created_at` for completed imports. |
| **Supplier Scorecard Snapshot** | Combined KPIs per supplier (spend, open balance, on-time %, variance). | Aggregations from above across supplier dimension. | Feeds supplier sidebar and dashboards. |

## 2. Supporting Entities

- **purchase_orders**: Requires workflow timestamps to avoid re-deriving from history: `approved_at`, `sent_at` (exists), `received_at` (migration 20251021105000), `confirmed_at` (missing). `sent_by` already present.
- **purchase_order_status_history**: Primary audit table for phase transitions; used to recompute durations when explicit timestamps missing.
- **purchase_order_items** & **purchase_order_receipts**: Provide ordered vs received quantities. Receipts table already tracks `received_by`, `notes`, `photo_path`, `photo_url`.
- **order_invoice_matches**: Stores match confidence, amount/quantity variance, and review status.
- **invoices**: Houses `created_at`, `status`, and `confirmed_at` (migration 20251021104500) for throughput calculations.

## 3. Data Gaps & Required Migrations

1. **`purchase_orders.approved_at`** – Needed to anchor draft→approval phase. Add nullable `timestamptz` column populated whenever status enters `approved`.
2. **`purchase_orders.confirmed_at`** – Timestamp for final reconciliation (status `confirmed`). Distinct from `invoices.confirmed_at`.
3. **Backfill strategy** – Once columns exist, run a one-time SQL migration to populate them from `purchase_order_status_history` where possible (latest `changed_at` per status).
4. **Indexes for analytics** – Add composite indexes to support date-range grouping: e.g., `CREATE INDEX idx_po_status_date ON purchase_orders(status, order_date DESC);` and `idx_po_status_received_at` once timestamps exist.
5. **Optional denormalized supplier_id indexes** – Ensure `purchase_order_receipts` and `order_invoice_matches` have indexes referencing supplier where joins are heavy (may require materialized view or view-level caching in later phases).

## 4. Edge Cases & Filters

- **Cancelled POs**: Exclude from spend/aging KPIs but retain in exception summaries when cancellations occur after approval.
- **Draft Orders without totals**: Some drafts may have `total_amount = 0` until items added; guard calculations to avoid skew (coalesce to 0).
- **Partial Receipts**: When `purchase_order_items.quantity_received < quantity_ordered`, classify as “partial” and include in accuracy metric with remaining quantity.
- **Invoice-less POs**: Scorecards should differentiate between items received without invoices vs invoices pending.
- **Timezone Consistency**: Treat all timestamps as UTC (current DB default) before computing durations.

## 5. Next Steps

1. Add the missing workflow columns (`approved_at`, `confirmed_at`) via Supabase migrations + backfill script.
2. Define SQL views/RPCs (`po_supplier_metrics_v`, `po_workflow_timings_v`, `po_exception_summary_v`) referencing the formulas above.
3. Implement caching/filters in the Phase 6 analytics API based on this dictionary.
4. Keep this file updated as new KPIs emerge to avoid divergence between backend and UI expectations.
