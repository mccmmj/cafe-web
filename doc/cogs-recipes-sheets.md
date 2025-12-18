# COGS Recipes (Google Sheets)

Products remain sourced from Square and stored in `cogs_products`. Recipes can be imported from a master Google Sheet as CSV.

## 1) Prereqs

1. Sync products from Square in the admin UI (`/admin/cogs` → `Catalog` → “Sync from Square”).
2. Assign a stable `product_code` for each product in the same Catalog table (example: `LATTE_12OZ`).
3. Ensure inventory items exist in `inventory_items` and that ingredient names in the sheet match `inventory_items.item_name` exactly.

## 2) Sheet format (single tab: `Recipes`)

One row = one ingredient line.

Required columns (exact header text is case-insensitive):

- `Product Code` (e.g., `LATTE_12OZ`)
- `Effective From` (YYYY-MM-DD)
- `Yield Qty` (number, > 0)
- `Yield Unit` (e.g., `each`)
- `Ingredient Name` (must match `inventory_items.item_name` exactly)
- `Ingredient Qty` (number, > 0)
- `Ingredient Unit` (e.g., `oz`, `ml`, `each`)
- `Loss %` (0–100)
- `Recipe Notes` (optional)

## 3) Publish as CSV

The importer expects a CSV URL. The simplest approach is to publish the sheet and use the “CSV export” URL.

## 4) Run importer

Set `COGS_RECIPES_SHEET_CSV_URL` in `.env.local` (recommended) or pass `--csv-url`.

- Dry run: `npm run import-cogs-recipes -- --dry-run`
- Apply: `npm run import-cogs-recipes -- --apply`
- Local file: `npm run import-cogs-recipes -- --dry-run --csv-path path/to/recipes.csv`

Behavior:
- Recipe headers are keyed by (`product_code`, `effective_from` at UTC midnight).
- For each header, existing ingredient lines are deleted and re-inserted to match the sheet.
