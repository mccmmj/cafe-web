# Inventory Management Improvements Plan

Prepared: 2025-11-23  
Context: Source prompt `prompts/inv_mgmt_updates.md`

## Quick Wins (Bug Fixes)
- **Quantity input reset**: In Add Items modal, hold numeric fields as strings to allow clear-and-retype; validate/parse on submit.
- **Prepackaged saves as ingredient**: Align `item_type` and `is_ingredient` mapping in create API + form defaults; add regression test.
- **Invoice unlink bug**: Ensure unlink endpoint clears file pointer + DB reference so re-uploads are accepted; add UI refresh state guard.
- **PO table responsiveness**: Collapse action buttons into kebab menu on small screens and hide non-critical columns to remove horizontal scroll.
- **Generated-column insert errors**: Prevent inserts into generated `purchase_order_items.total_cost`; use server-side calculation only.

## Feature Tickets
- **Unit cost calculator**: Add mini calculator in Add Item and PO line (pack price ÷ pack_size → unit_cost); reuse in Restock; display pack & unit values.
- **Pack-size awareness**: DONE. `pack_size` on inventory + PO items; PO lines normalize to unit quantities; receipts informational only; invoice confirm updates stock, routing packs to base item (pack_size=1) when square_item_id matches, no pack multiplier on invoice qty.
- **Prefilled reorder quantity**: In PO “Add Item”, default quantity to `reorder_point - current_stock` (min 1) or stored `reorder_quantity`.
- **Quick Add collapsible**: Allow expanding/collapsing Quick Add in PO modal; remember last state per session.
- **Out-of-stock exclusion after approval**: Post-approval pre-send step to mark items excluded; omit from payload, log note, keep audit trail.
- **Duplicate purchase order**: “Duplicate” action loads prior PO (items, costs, supplier) into draft with new order number; allow edits before send.
- **Delete/Archive inventory items**: Soft delete with `deleted_at`; UI Archive/Restore; filter out by default.
- **Unit cost history**: New history table; allow editing costs during restock and PO line edit; show cost change timeline per item; invoice confirm writes cost history when it updates unit_cost (no stock regression).
- **Invoice re-upload resilience**: After unlink, permit new upload; add explicit “Replace invoice” flow.
- **Email delivery feedback**: Capture RESEND status/ID; show delivered/bounced/pending on PO list/detail. Add optional Supabase SMTP sender toggle + health check.

## Phase 2 – Invoice resilience & partial coverage
- Allow multiple invoices per PO to support split deliveries; PO can be partially confirmed until all items are covered.
- Upload: if an invoice with the same supplier + invoice_number exists and is not confirmed, replace/update the existing row instead of failing; only block when status is confirmed.
- Unlink: removing a match should revert the invoice to `uploaded` when it has no remaining matches so it can be reused.
- PO detail: list multiple invoices with statuses; allow unlink per invoice; show coverage (received vs ordered) and keep PO in partial state until fully covered.
- Confirmation: confirming an invoice updates stock/coverage; PO transitions to fully received only when coverage is complete (or manually overridden).

## Backend/Data Tasks
- Schema: add `inventory_item_cost_history`, `inventory_items.deleted_at`, `inventory_items.pack_size` (done), composite unique (square_item_id, pack_size) (done), `purchase_order_items.excluded`, `purchase_order_items.ordered_pack_qty` (done), `purchase_order_items.pack_size` (done), `po_email_logs` with provider/status.
- API: inventory POST/PATCH handles pack_size & soft delete; PO endpoints support duplicate-from-id, pack quantities, item exclusion, cost updates; invoice unlink clears references; email send logs provider responses.
- Stock math: Receipts are info-only (no stock mutation); invoice confirmation is the source of truth, uses invoice qty as units, routes pack items to base square item where available; no double counting.

## UI/UX Tasks
- Modals: calculator widget; clearer item-type toggle; archive control; pack/each selector; cost edit during receipt; cost history drawer.
- PO Modal: collapsible quick add, prefilled qty, exclude toggle, duplicate action, email status badges.
- Responsive PO table: kebab menu actions; condensed columns on narrow viewports.

### Unit cost calculator & history – implementation plan
1) DB: `inventory_item_cost_history` table with previous/new unit_cost, pack_size, source, source_ref, changed_by, changed_at; indexes on item+date.  
2) API: inventory PUT/patch logs cost changes; invoice confirm derives unit cost (pack price ÷ pack_size) when different, updates item, and writes history; no stock side effects.  
3) UI: add inline cost calculator to Add Item + PO line editor (pack vs unit toggle, auto-fill per-unit); show recent cost history (last 5) in inventory detail drawer and PO line tooltip; allow revert.  
4) Validation: enforce unit_cost ≥ 0; block save if missing pack_size when using pack calculator.  
5) Tests: API unit tests for cost history logging; UI tests for calculator math and revert; regression to ensure stock untouched when cost updates.
6) Endpoints: GET `/api/admin/inventory/cost-history` (recent entries), POST `/api/admin/inventory/revert-cost` (sets unit_cost and logs history).

## Testing
- Add Jest tests for quantity clearing, prepackaged save, duplicate PO, invoice unlink/re-upload, pack-size math, cost history logging, out-of-stock exclusion, email handler with mocked providers.
- Run `npm run lint` and targeted API integration checks after changes.

## Rollout Notes
- No ticketing system—treat each bullet as a work item; prioritize Quick Wins → Pack-size & Cost features → Email feedback.
- Update ENV templates if adding SMTP config; document migration steps for new tables/columns.
