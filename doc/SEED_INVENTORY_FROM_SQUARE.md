# Seeding Inventory from Square Catalog

This guide walks through exporting your Square catalog, converting it into the inventory YAML format, and importing it into the app’s `inventory_items` table.

## Prerequisites

- `.env.local` configured with Square sandbox/production credentials (`SQUARE_ACCESS_TOKEN`, `SQUARE_ENVIRONMENT`, `SQUARE_LOCATION_ID`).
- Supabase service key in `.env.local` (`SUPABASE_SECRET_KEY`) so bulk uploads can write to the database.
- Node.js 18+ and all repo dependencies installed (`npm install`).

## Step 1 — Export Square Catalog

```
node scripts/export-square-catalog.js \
  --out data/square-catalog-export.json
```

Flags:
- `--include-archived` to keep archived catalog objects (defaults to skipping them).
- `--out` to change the snapshot path (defaults to `data/square-catalog-export.json`).

> Tip: You can commit the JSON snapshot in a branch if you want to diff catalog changes over time.

## Step 2 — Convert Catalog to Inventory YAML

```
node scripts/catalog-to-inventory-yaml.js \
  --in data/square-catalog-export.json \
  --out data/inventory-from-square.yaml \
  --patterns config/catalog-patterns.json
```

Options:
- `--defaults defaults.json` (optional) where you can define global values like supplier mappings or default stock levels.
    ```json
    {
      "defaultSupplier": "Premium Coffee Roasters",
      "supplierByCategory": {
        "pastries": "Denver Bakery Supply Co",
        "bottled beverages": "Mountain Fresh Produce"
      },
      "unitByCategory": {
        "pastries": "each",
        "bottled beverages": "each"
      },
      "defaultCurrentStock": 0,
      "defaultMinimumThreshold": 5,
      "defaultReorderPoint": 10,
      "defaultLocation": "Main",
      "defaultItemType": "prepackaged"
    }
    ```
- `--patterns config/catalog-patterns.json` supplies arrays of identifiers instead of long command-line regex:

    ```json
    {
      "prepared": ["latte", "americano", "refresher"],
      "ingredients": ["beans", "syrup", "milk"]
    }
    ```

- You can still pass `--prepared` or `--ingredients` flags if you prefer raw regexes; they augment/override the pattern file.

The script emits a YAML file compatible with `scripts/bulk-upload-inventory.js`.

## Step 3 — Bulk Upload Inventory

```
node scripts/bulk-upload-inventory.js data/inventory-from-square.yaml
```

Helpful flags:
- `--replace` — clears existing `inventory_items` before inserting the new list.
- `--admin-email=<you@example.com>` — override the default admin email for authorization checks.

Before running with `--replace`, it’s good practice to dry-run:

```
node scripts/bulk-upload-inventory.js data/inventory-from-square.yaml --help
```
## Optional — Merge Instead of Replace

If you want to preserve existing stock levels, unit costs, and classifications, use the merge helper:

```
node scripts/merge-inventory-from-catalog.js \
  --catalog data/square-catalog-export.json \
  --defaults data/inventory-defaults.json \
  --patterns config/catalog-patterns.json \
  --out data/inventory-merged.yaml
node scripts/bulk-upload-inventory.js data/inventory-merged.yaml
```

This script keeps live values for any inventory row that shares a Square variation ID and only fills defaults for brand-new items. It also reports inventory rows without Square matches so you can reconcile them manually.

## Step 4 — Classify Auto/Manual Items

After loading new inventory rows, run the classifier to align `item_type` and `auto_decrement` flags:

```
node scripts/classify-inventory-items.js --all
node scripts/classify-inventory-items.js --apply
```

Use `--all` to preview changes; `--apply` persists them. Adjust any outliers manually (e.g., prepared drinks should remain `auto_decrement = false` so ingredient deductions stay manual).

## Step 5 — Verify in Admin UI

1. Visit `/admin/inventory` and confirm the items display correctly.
2. Run “Sync Square Sales” to test the manual/auto decrement pipeline.
3. For prepared items, check `view_pending_manual_inventory_deductions` to confirm manual adjustments are listed.

```sql
select *
from view_pending_manual_inventory_deductions
order by last_transaction_at desc;
```

## Automation Ideas

- Schedule the catalog export + YAML conversion in CI so you always have an up-to-date snapshot for review.
- Store overrides (supplier, unit type, classification) in a simple JSON file and feed it to the converter for consistent defaults.
- Extend `catalog-to-inventory-yaml.js` to merge with existing inventory rows so pricing/stock info doesn’t get overwritten in production.
