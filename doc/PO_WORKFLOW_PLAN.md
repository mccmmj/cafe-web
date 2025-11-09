# Purchase Order Workflow Plan

## Phase 1: Status Lifecycle & Approvals
- Finalize canonical statuses and transition matrix (`draft → pending approval → approved → sent → received/cancelled`, plus `confirmed` alias).
- Persist history via `purchase_order_status_history` (timestamp, actor, note) with RLS policies and indexes.
- Extend admin API helpers (`canonicalStatus`, `canTransition`, `insertStatusHistory`) to block invalid transitions and audit all state changes.
- Surface workflow controls in the admin UI (submit, approve, cancel, mark sent/received) and render chronological status history in the PO modal.

## Phase 2: Supplier Issuance
- Capture send metadata on `purchase_orders` (`sent_at`, `sent_by`, `sent_via`, `sent_notes`) and hydrate UI with profile details.
- Generate supplier-ready PDFs on demand using `pdf-lib` (`GET /api/admin/purchase-orders/:id/pdf`).
- Email suppliers through Resend (`POST /api/admin/purchase-orders/:id/send`) with attached PDF, optional CC/message, and automatic status update to `sent`.
- Manage supplier confirmations/change requests through Supabase storage (`purchase-order-attachments` bucket) and corresponding REST endpoints.

## Phase 3: Receiving & Partial Deliveries
- Persist partial receipts in `purchase_order_receipts` (line-level quantity, optional weight, notes, photo path/url, actor, timestamps).
- Implement `log_purchase_order_receipt` RPC: validates remaining qty, writes receipt, increments inventory, records stock movement (`quantity_change`, `previous_stock`, `new_stock`), and auto-closes the PO when fully reconciled.
- Create REST interface `/api/admin/purchase-orders/:id/receipts` (list + create) with optional photo upload via `purchase-order-receipts` bucket policies.
- Update admin UI: highlight partially received POs, add receipt history dashboard, per-line “Log Receipt” modal, and rewire “Mark Received” to post granular receipts before updating status.
- Keep inventory adjustments idempotent by only applying deltas and ensuring deletes/rollbacks can reverse stock movement entries (future enhancement).

## Phase 4: Invoice Ingestion & Storage
- Solidify the `invoices` domain (file metadata, parse status, confidence, parsed line items) and wire it to purchase orders via `order_invoice_matches` with variance tracking.
- Harden upload pipeline: admin-only `invoices` storage bucket policies, duplicate detection, and supplier-driven foldering.
- Integrate AI workflow hooks (`/parse`, `/match-orders`, `/confirm`) so uploaded invoices can be parsed, reviewed, and matched back to open POs; capture errors/flags for follow-up.
- Enhance invoice management UI with upload modal, detail views, parsing state, and PO linkage surfaced alongside attachments.

## Phase 5: Automation & Notifications
- Optional Slack/email notifications for approvals, received POs, and exceptions.
- Scheduled jobs/cron for overdue POs and unapproved drafts.

## Phase 6: Reporting & Supplier Metrics
Phase 6 turns the operational data we’ve built into decision support. Skip Phase 5 for now and focus on actionable supplier intelligence.

### 6.1 Metrics Definition & Data Inventory
- Finalize KPIs and their sources:
  - `Spend by Supplier`, `Open PO Balance`, `Aging` → `purchase_orders.total_amount`, `status`, `order_date`, `expected_delivery_date`.
  - `Cycle Time` (draft→approved→sent→received) → `purchase_order_status_history`, plus workflow columns (`approved_at`, `sent_at`, `received_at`, `confirmed_at`).
  - `Fulfillment Accuracy` / `Partial Receipts` → `purchase_order_receipts.quantity_received`, `purchase_order_items.quantity_ordered`.
  - `Price / Quantity Variance` → `order_invoice_matches.amount_variance`, `quantity_variance`.
  - `Invoice Throughput` / `Exception Rate` → `invoices.status`, `order_invoice_matches.status`.
- Gap check migrations: ensure `purchase_orders` has `approved_at`, `sent_by`, `received_at`, `confirmed_at`; confirm `purchase_order_receipts` captures `received_by`, `notes`, `photo_path`.
- Document formulas + edge cases (e.g., cancelled orders excluded from SLAs) inside this plan for visibility.

### 6.2 Analytics Layer (SQL Views / RPC)
- Create parameterized Supabase SQL:
  - `po_supplier_metrics_v`: aggregates spend, outstanding balance, avg cycle time, on-time %, variance counts grouped by supplier + time window.
  - `po_workflow_timings_v`: flattens `purchase_order_status_history` into phase durations for charting.
  - `po_exception_summary_v`: tallies invoices/receipts with variances or missing confirmations.
- Expose each via RPC (`rpc_po_supplier_metrics(start_date, end_date, supplier_ids[])`) so the Next.js API can paginate/filter without shipping SQL to the client.
- Add unit tests (psql snapshots or Vitest hitting Supabase test schema) to lock expected aggregates.

### 6.3 Admin API Endpoints
- Build `/api/admin/purchase-orders/metrics`:
  - Query params: `range`, `supplierId`, `status`, `limit`.
  - Returns KPI cards + chart datasets (monthly series, leaderboard arrays).
  - Cache layer (in-memory or edge) with 5‑minute TTL to keep UI snappy.
- Add `/api/admin/suppliers/[id]/scorecard` for drilldowns, reusing analytics RPC.
- Enforce auth + role checks; surface `x-cache` headers for observability.

### 6.4 UI / Dashboard Surfaces
- New page `src/app/admin/(protected)/purchase-orders/insights/page.tsx`:
  - KPI cards (spend, open POs, on-time %, exception rate).
  - Charts: trend line for spend, stacked bar for status aging, heatmap for supplier performance.
  - Tables: “Top Suppliers by Spend”, “At-Risk Suppliers” (low on-time %, high variance), “Oldest Outstanding POs”.
- Reuse shared charts (Victory/Recharts) and create hooks in `src/hooks/usePurchaseOrderMetrics.ts`.
- Ensure responsive layout + dark mode alignment.

### 6.5 Supplier Scorecards & PO Detail Integration
- Extend supplier sidebar/modal to show metrics snapshot (on-time %, avg variance, last receipt date, outstanding balance).
- In PO modal, show linked invoice/receipt counts and variance flags pulled from analytics view.
- Add deep links from cards/tables back to PO list filtered appropriately.

### 6.6 QA, Monitoring & Docs
- Seed realistic data (existing `seed-square`, manual receipts, invoice imports) and validate dashboards match SQL.
- Add logging/metrics for API latency + cache hits.
- Document the workflow in `README.md` + internal runbook (how metrics are calculated, how to add new KPIs).
- Plan future enhancements (Phase 6.1) for exporting CSVs or scheduling email summaries once dashboards prove useful.
