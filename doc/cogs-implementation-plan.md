# COGS Reporting (Admin) Implementation Plan

This plan adds a new `/admin/cogs` feature set centered around Cost of Goods Sold (COGS), supporting both:

- **Periodic COGS** (bookkeeping standard): `Beginning Inventory + Purchases − Ending Inventory = COGS`
- **Theoretical COGS** (ops/variance): sales-driven ingredient consumption from recipes/BOM, including modifier add-ons

## Goals

- Provide accurate, auditable COGS reporting for typical cafe bookkeeping needs.
- Support multiple reporting periods: weekly, monthly, annual, and custom ranges.
- Export reports for bookkeeping (CSV + journal entry templates) and for operations (variance and ingredient usage).
- Provide reconciliation workflows to raise data quality (mapping, recipes, costs, units) over time.

## Key assumptions and decisions

- **Sellables are Square `ITEM_VARIATION` IDs** (recommended, matches Orders line items).
- **Products are Square `ITEM` IDs** (parents of variations).
- Recipes are **shared at the product level** with **per-variation overrides**.
- Square modifiers/add-ons are handled in theoretical COGS as **recipe add-ons** (modifier option recipes).
- No special handling required for:
  - Free/comped add-ons (still costed like any ingredient consumption).
  - Non-ingredient modifiers (simply have no recipe lines and cost $0).
- Inventory valuation method: start with **Weighted Average Cost (WAC)**, design to allow FIFO later.
- Cost source priority: purchase invoice line cost → last received cost → `inventory_items.unit_cost` fallback.

## Scope

### Admin UI (Next.js App Router)

- Add `/admin/cogs` (and subroutes):
  - `/admin/cogs/reports`
  - `/admin/cogs/reconciliation`
  - `/admin/cogs/products` (Square ITEMs)
  - `/admin/cogs/sellables` (Square ITEM_VARIATIONs)
  - `/admin/cogs/recipes` (base + overrides)
  - `/admin/cogs/modifiers` (modifier option add-ons)
  - `/admin/cogs/purchases`
  - `/admin/cogs/counts`
  - `/admin/cogs/period-close`

### Reports and analytics

- Period selection:
  - weekly, monthly, annual
  - custom date range
  - compare to prior period / prior year
- Summary KPIs:
  - net sales
  - periodic COGS $ and COGS %
  - theoretical COGS $ and COGS %
  - gross margin $ and %
  - variance $ and %
- Drilldowns:
  - by category (coffee/food/retail)
  - by product and sellable (variation)
  - by ingredient
  - by modifier option add-ons (cost impact)
- Coverage metrics (report credibility):
  - % sales lines mapped to sellables
  - % sales lines with resolved recipes (including modifiers)
  - % ingredient consumption with valid costs

### Bookkeeping exports

- Export bundles per period:
  - periodic COGS summary (begin inv, purchases, end inv, COGS)
  - inventory valuation detail (qty, unit cost, extended value per item)
  - purchases detail (invoices + lines)
  - theoretical COGS detail (sellable → ingredient rollup)
  - variance attribution (by ingredient, sellable, category, modifiers)
- Journal entry templates:
  - debit COGS, credit Inventory (optionally configurable account mappings later)
- Include audit metadata in exports:
  - valuation method, cost basis, period boundaries, computed timestamps, report version/hash

## Data model (Supabase)

### Catalog mapping

- `products`
  - `id`
  - `square_item_id` (unique, Square ITEM id)
  - `name`
  - `category_id` (optional)
  - `is_active`
  - timestamps
- `sellables`
  - `id`
  - `square_variation_id` (unique, Square ITEM_VARIATION id)
  - `product_id` (FK `products.id`)
  - `name`
  - variant attributes (optional: size, temperature, etc.)
  - `is_active`
  - timestamps
- `sellable_aliases` (optional but recommended)
  - track historical/merged Square variation ids mapping to the current `sellable_id`
  - include validity windows for audit

### Recipes (base + overrides)

- Product base recipes (versioned, effective-dated):
  - `product_recipes(id, product_id, version, effective_from, effective_to, yield_qty, yield_unit, notes, created_by, approved_by, timestamps)`
  - `product_recipe_lines(id, recipe_id, inventory_item_id, qty, unit, loss_pct, timestamps)`
- Sellable overrides as diffs (versioned, effective-dated):
  - `sellable_recipe_overrides(id, sellable_id, version, effective_from, effective_to, notes, approved_by, timestamps)`
  - `sellable_recipe_override_ops(id, override_id, op_type, target_inventory_item_id, new_inventory_item_id, qty, unit, multiplier, loss_pct, timestamps)`
  - `op_type`:
    - `add`, `remove`, `replace`, `multiplier`

### Modifiers (add-ons)

- `modifier_sets`
  - `id`
  - `square_modifier_list_id` (unique)
  - `name`
- `modifier_options`
  - `id`
  - `modifier_set_id` (FK)
  - `square_modifier_id` (unique)
  - `name`
- `modifier_option_recipes` (versioned, effective-dated)
  - `id`, `modifier_option_id`, `version`, `effective_from`, `effective_to`, `approved_by`, timestamps
- `modifier_option_recipe_lines`
  - `id`, `recipe_id`, `inventory_item_id`, `qty`, `unit`, `loss_pct`, timestamps

### Purchasing and costs

- `purchase_invoices` and `purchase_invoice_lines`
  - support invoice status, received date, freight, credits/returns, and locking after period close
- Costing helpers:
  - compute WAC per `inventory_item_id` from received invoice lines
  - store “as-of” WAC snapshots per period and/or computed valuation snapshots

### Inventory counts and movements

- Continue using `stock_movements` as the audit journal for changes to on-hand quantity.
- Add/standardize movement reason codes:
  - purchase receipt, waste/spoilage, comp/staff meal, adjustment, transfer
- Inventory counts:
  - `inventory_counts` (header: period, location, status, created_by, approved_by)
  - `inventory_count_lines` (item, counted qty, system qty, variance qty, notes)

### Period close and snapshots

- `cogs_periods`
  - `id`, `period_type`, `start_at`, `end_at`, `status` (open/closed), `closed_by`, `closed_at`, notes
- `inventory_valuations`
  - `period_id`, `inventory_item_id`, `qty_on_hand`, `unit_cost`, `value`, `method`, computed timestamps
- `cogs_reports`
  - store computed outputs for repeatability:
    - periodic cogs totals
    - theoretical cogs totals
    - variance totals
    - coverage metrics
    - report version/hash
- Audit log (recommended):
  - append-only events for recipe changes, cost updates, and period close/reopen actions

## Sales ingestion requirements (Square → theoretical COGS)

- Ensure `sales_transaction_items` retains, per line:
  - Square variation id (catalog object id) used on the order line
  - quantities
  - modifiers/add-ons from Square (modifier ids and quantities) stored in `metadata`
- If not already stored, extend the sales sync to persist the modifier array in `metadata` (later implementation step).

## Computation services

### Periodic COGS

- For each period:
  - compute (or load) beginning and ending inventory valuation snapshots
  - compute net purchases for the period (received invoices, net credits/returns)
  - compute periodic COGS: `begin + purchases − end`
- Provide breakdowns:
  - by category, supplier, location, inventory item

### Theoretical COGS

- For each sale line item in period:
  1) resolve sellable by Square variation id (with alias fallback)
  2) resolve product base recipe active at sale timestamp
  3) apply sellable override ops (remove/replace, add, multiplier)
  4) apply modifier option recipes for each modifier on the line (additive)
  5) convert units and apply loss/yield
  6) apply ingredient costs (WAC as-of period)
- Produce outputs:
  - ingredient usage and cost
  - attributions (base vs override vs modifier)
  - theoretical COGS totals and breakdowns

### Variance

- Variance: `periodic COGS − theoretical COGS`
- Attribution categories:
  - missing recipe coverage (base/override/modifier)
  - unmapped sellables/modifiers
  - missing costs / unit conversion gaps
  - waste/comp/adjustments (from stock movements)
  - count variances (cycle counts)

## Reconciliation workflows (admin)

- Unmapped sellables: sales variation ids not present in `sellables`.
- Unmapped modifiers: modifier ids in sales not present in `modifier_options`.
- Missing base recipe for product.
- Missing override where a variation differs materially (size differences, add shots, etc.).
- Missing costs for ingredients in a period.
- Unit conversion issues and negative inventory warnings.

## Security, permissions, and audit

- Role-based access:
  - report viewing
  - recipe editing
  - purchasing entry/approval
  - inventory count posting
  - period close/reopen
- Period close controls:
  - lock periods; changes affecting closed periods require explicit reopen with audit trail.

## Performance and reliability

- Use precomputed snapshots for:
  - inventory valuations per period
  - stored report results per period
- Consider materialized views or cached aggregates for common drilldowns.
- Implement data quality checks and alerts to prevent misleading reports.

## Rollout phases

### Phase 1: Periodic COGS (bookkeeping foundation)

- Period definitions and period close.
- Purchases (invoices/receiving) + inventory counts.
- Inventory valuation snapshots and periodic COGS computation.
- CSV exports + journal entry templates.

### Phase 2: Theoretical COGS without modifiers (core recipes)

- Products/sellables mapping management.
- Product base recipes + sellable override diffs.
- Theoretical COGS computation and coverage metrics.
- Variance reporting basics.

### Phase 3: Theoretical COGS with modifiers (add-ons)

- Persist modifiers in sales sync payloads.
- Modifier set/option mapping + modifier option recipes.
- Modifier cost impact reporting and reconciliation.

### Phase 4: Advanced variance + integrations

- Waste/comp workflows and enhanced variance attribution.
- Alerts/anomaly detection (margin swings, missing costs, unmapped spikes).
- Optional accounting integrations (QuickBooks/Xero) and optional FIFO.

## Testing and acceptance criteria

- Unit tests:
  - unit conversion correctness
  - recipe resolution (base + override + modifiers)
  - WAC calculation logic
  - period close repeatability
- End-to-end scenarios:
  - purchase receipt → sales → count → close period → exports
  - modifiers present on sales lines contribute ingredient costs
- Acceptance:
  - periodic COGS ties to valuation snapshots and purchases for the period
  - theoretical COGS coverage metrics are visible and accurate
  - closed period reports are reproducible (same inputs → same outputs)

