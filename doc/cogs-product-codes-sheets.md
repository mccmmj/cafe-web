# COGS Product Codes (Google Sheets)

Products come from Square (synced into `cogs_products`). A `product_code` is a stable, human-friendly identifier used by recipe imports and overrides.

## Template CSV

Start with `data/cogs-product-code-mapping-template.csv`, upload it into Google Sheets, then edit:

- Update `Product Code` where needed
- Delete rows for products that are pre-packaged or will never have recipes

Notes:
- `Product Code` must be unique and should be stable over time.
- If Square has duplicate product names (e.g. multiple “Pressed Juice”), the template includes a short suffix to keep codes unique.

## CSV format

Required columns (header text is case-insensitive):

- `Square Item ID`
- `Product Code`

Other columns are allowed and ignored.

## Import

- Dry run: `npm run import-cogs-product-codes -- --dry-run --csv-path path/to/product-codes.csv`
- Apply: `npm run import-cogs-product-codes -- --apply --csv-path path/to/product-codes.csv`

You can also import from a published Sheets CSV URL:

- `npm run import-cogs-product-codes -- --dry-run --csv-url "https://.../export?format=csv&gid=..."`

