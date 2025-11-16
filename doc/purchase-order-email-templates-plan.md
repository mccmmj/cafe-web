## Goal

Support supplier-specific email templates for purchase orders, allowing admins to define reusable defaults for subjects and body content that can include per-order variables. Templates must be persisted, editable from the admin UI, and automatically applied when emailing a purchase order while still allowing per-email overrides.

## Proposed Enhancements

1. **Database & Types**
   - Create `supplier_email_templates` table (id, supplier_id FK, template_type, subject_template, body_template, created_by, updated_at).
   - Seed initial row per supplier if desired; add unique constraint on `(supplier_id, template_type)`.
   - Update Supabase type definitions/TypeScript interfaces if the project mirrors tables.

2. **API Surface**
   - Add CRUD routes under `/api/admin/suppliers/[supplierId]/email-templates` with admin auth guards.
   - Extend `/api/admin/purchase-orders/[orderId]/send` to read a supplier’s `purchase_order` template before falling back to defaults.
   - Store rendered subject/body used for the send (e.g., `sent_subject`, `sent_body` columns or reuse `sent_notes`) for audit trails.

3. **Template Rendering Utility**
   - Build a renderer that replaces whitelisted tokens (e.g., `{{order_number}}`, `{{expected_delivery_date}}`, `{{total_amount}}`, `{{supplier_name}}`) with safe HTML/string values.
   - Support newline → `<br />` conversion and basic sanitization to avoid arbitrary HTML injection.
   - Reuse renderer when previewing in UI and when composing the final email HTML.

4. **Admin UI**
   - In supplier management, add a “Email Template” editor modal/form that fetches/saves via the new APIs (react-query integration).
   - Provide guidance on available tokens and preview capability.
   - Update `PurchaseOrdersManagement` send modal to preload the supplier template (subject/message) and allow overrides per email.

5. **Testing & Validation**
   - Add API tests (if applicable) ensuring CRUD operations enforce auth and validation.
   - Write frontend tests or manual QA steps covering template editing, previewing, and application during email send.
   - Verify a purchase order email reflects template placeholders and logs the rendered content.
