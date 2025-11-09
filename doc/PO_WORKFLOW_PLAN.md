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
- Dashboards for spend by supplier, outstanding POs, processing time, exception rate.
- Supplier scorecards (on-time delivery %, price variance, backorder frequency).
