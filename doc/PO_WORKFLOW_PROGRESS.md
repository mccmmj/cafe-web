**PO Workflow Progress**

- **Phase 1 – Status Lifecycle & Approvals**
  - Status machine finalized and enforced via `canonicalStatus`, `canTransition`, and API guards (`src/app/api/admin/purchase-orders/status-utils.ts:18`, `src/app/api/admin/purchase-orders/[orderId]/route.ts:188`).
  - Status history table/migration deployed with RLS/policies; API writes on every state change (`supabase/migrations/20251002090000_add_po_status_history.sql:1`, `src/app/api/admin/purchase-orders/[orderId]/route.ts:293`).
  - Admin UI exposes “Submit for approval”, “Approve”, “Mark sent/received”, “Cancel” actions with role checks (`src/components/admin/PurchaseOrdersManagement.tsx:606`).
  - View modal renders full timeline/history and canonical status badges (`src/components/admin/PurchaseOrderViewModal.tsx:459`).

- **Phase 2 – Supplier Issuance**
  - Send metadata stored (`sent_at`, `sent_by`, `sent_notes`, `sent_via`) and surfaced in list/detail views (`src/app/api/admin/purchase-orders/[orderId]/route.ts:214`, `src/components/admin/PurchaseOrderViewModal.tsx:313`).
  - Supplier-ready PDF generator and authenticated API route wired for download (`src/lib/purchase-orders/pdf.ts:1`, `src/app/api/admin/purchase-orders/[orderId]/pdf/route.ts:1`).
  - Resend-backed email endpoint attaches the PDF, records send state, and updates history (`src/app/api/admin/purchase-orders/[orderId]/send/route.ts:1`).
  - Inventory UI now supports email workflow modal, manual mark-sent dialog, and PDF download triggers (`src/components/admin/PurchaseOrdersManagement.tsx:196`).
  - Attachments schema, APIs, and UI allow uploading/removing supplier confirmations with metadata (`supabase/migrations/20251002101500_create_po_attachments.sql:1`, `src/app/api/admin/purchase-orders/[orderId]/attachments/route.ts:1`, `src/components/admin/PurchaseOrderViewModal.tsx:493`).

_No outstanding issues for Phases 1–2; next steps move into receiving and partial deliveries._
