# Inventory Sales Sync Plan

This document outlines the data model, backend endpoints, and UI hooks required to support the "Sync Square Sales" workflow on `/admin/inventory`.

## Data Model Additions

Create the following Supabase tables:

### `inventory_sales_sync_runs`
- `id` UUID PK default `gen_random_uuid()`
- `started_at` timestamptz not null default `now()`
- `finished_at` timestamptz
- `status` text check in (`pending`, `success`, `error`)
- `square_cursor` text -- opaque cursor returned by Square Orders API
- `orders_processed` integer default 0
- `auto_decrements` integer default 0 -- count of inventory reductions applied automatically
- `manual_pending` integer default 0 -- count of prepared item lines queued for manual attention
- `error_message` text
- `created_by` UUID references `profiles(id)` nullable

### `sales_transactions`
- `id` UUID PK default `gen_random_uuid()`
- `square_order_id` text unique not null
- `location_id` text not null
- `order_number` text
- `tender_total_money` numeric(12,2)
- `tender_currency` text(3)
- `tender_type` text
- `customer_name` text
- `ordered_at` timestamptz not null -- Square order created_at
- `synced_at` timestamptz not null default `now()`
- `sync_run_id` UUID references `inventory_sales_sync_runs(id)` on delete set null
- `raw_payload` jsonb not null
- index on `ordered_at`, `location_id`

### `sales_transaction_items`
- `id` UUID PK default `gen_random_uuid()`
- `transaction_id` UUID references `sales_transactions(id)` on delete cascade
- `inventory_item_id` UUID references `inventory_items(id)` -- nullable if not mapped
- `square_catalog_object_id` text not null
- `name` text not null
- `quantity` numeric(12,3) not null -- Square quantities are strings, store as numeric
- `impact_type` text check in (`auto`, `manual`, `ignored`)
- `impact_reason` text -- description like "prepared drink requires manual ingredient deduction"
- `unit` text
- `metadata` jsonb
- index on `transaction_id`

### Supporting View

`view_pending_manual_inventory_deductions` returning:
- `inventory_item_id`, `inventory_name`, `total_quantity`, `last_transaction_at`, `last_sync_run_id`
- Use to power UI badge and manual adjustment list.

## Backend Endpoints

### `POST /api/admin/inventory/sales-sync`
1. Validate admin session/email.
2. Read last successful `inventory_sales_sync_runs.square_cursor`.
3. Call Square Orders API (`/v2/orders/search`) filtered by `location_id` and `created_at` > cursor.
4. For each order:
   - Upsert into `sales_transactions`.
   - Normalize line items:
     - Map Square catalog variation -> `inventory_items.square_item_id`.
     - Flag `impact_type`:
       - `auto` for pre-packaged or pre-prepared items (future field `inventory_items.auto_decrement = true` or mapping table).
       - `manual` for prepared drinks -> accumulate in manual view.
       - `ignored` for unknown items.
   - For `auto` lines subtract quantity from `inventory_items.current_stock` and insert `stock_movements` row with type `sale`.
5. Aggregate results, update sync run row.
6. Return payload `{ success, ordersProcessed, autoDecrements, manualPending, nextCursor, runId }`.

### `GET /api/admin/inventory/sales-sync/status`
Return:
- `lastRun` (timestamp, status, metrics).
- `pendingManual` count from view.
- `recentErrors` (last 3 failed runs).
- `nextCursor`.

### `GET /api/admin/inventory/sales-sync/manual`
Optional helper to list outstanding manual deductions grouped by item and recipe.

## UI Touchpoints

### Header Controls
- Add `Sync Square Sales` button in `InventoryManagement` header.
- Show last sync time chip and manual count badge (from status endpoint).
- Button triggers React Query mutation to POST endpoint; disable while in flight and show success/failure toast.

### Sidebar/Tab
- New "Sales Activity" tab containing:
  - Recent sync runs (status timeline).
  - Table of pending manual adjustments with "Mark resolved" or "open restock modal" actions.

### Data Refresh
- On successful sync, invalidate `['admin-inventory']`, `['admin-stock-alerts']`, and new `['sales-sync-status']` queries.

## Follow-up Enhancements
- Define recipe metadata for prepared drinks to auto-suggest ingredient deductions.
- Allow scheduling background sync via cron or Supabase Edge Function.
- Extend manual adjustments to support bulk deduction by prepared drink count.
