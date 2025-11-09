# Square Sales Simulator Setup Guide

Use this guide to configure and run the Square Sandbox sales simulator that seeds realistic transactions for the inventory sync workflow.

## Overview

The simulator calls the Square Orders and Payments APIs to create synthetic sales that mirror typical cafe traffic. Each run:

- Picks a scenario mix (morning rush, lunch, weekend, etc.).
- Generates a configurable number of orders with random quantities.
- Creates the corresponding Square payment so the order appears as a settled sale.
- Stores the last order metadata in `.cache/square-simulator.json` for reference.

## Prerequisites

1. Node.js 18 or later installed locally.
2. Access to a Square Sandbox account with the following environment variables configured in `.env.local`:

   ```bash
   SQUARE_ENVIRONMENT=sandbox
   SQUARE_ACCESS_TOKEN=your-sandbox-access-token
   SQUARE_APPLICATION_ID=your-sandbox-app-id
   SQUARE_LOCATION_ID=your-sandbox-location-id
   SQUARE_ITEM_LATTE_TALL_ID=variation-id
   SQUARE_ITEM_LATTE_GRANDE_ID=variation-id
   SQUARE_ITEM_BREAKFAST_BURRITO_BACON_ID=variation-id
   SQUARE_ITEM_GRANOLA_PACK_ID=variation-id
   ```

3. Square catalog seeded with the fixture data (run `npm run seed-square` beforehand if needed).
4. Optional: `npm install` completed to ensure the Square SDK is available.

## Step 1: Collect Catalog Variation IDs

The simulator needs the Square Catalog variation IDs it should sell. You can find them via any of the methods below:

- Copy them from the output of `npm run seed-square` (the seeding script prints the created IDs).
- Call the Square Catalog API with `node scripts/test-square-api.js --list-variations` to print each item and variation ID.
- Look them up in the Square Sandbox Dashboard under Items > Item Details > Variation ID.

Add the IDs to `.env.local` using the environment variables listed in the prerequisites.

## Step 2: Verify Environment Configuration

Run the existing debug script to confirm required credentials are loaded:

```bash
npm run debug-square
```

Ensure all Square variables show as present. If any are missing, update `.env.local` and re-run the command.

## Step 3: Dry Run the Simulator

Use dry run mode to preview the orders that would be generated without contacting Square:

```bash
npm run simulate:square -- --dry-run --scenario morningRush --orders 5
```

The summary lists the planned scenario, number of orders, and item counts. Adjust the `--scenario` and `--orders` flags as needed. Available scenarios are defined in `scripts/config/square-simulator-config.js`.

## Step 4: Create Sandbox Transactions

Once satisfied with the mix, remove `--dry-run` to post real orders to the sandbox:

```bash
npm run simulate:square -- --scenario lunchWave --orders 12
```

The script will:

- Create the specified number of orders.
- Create matching cash payments so the orders are marked paid.
- Update `.cache/square-simulator.json` with the last order ID, payment ID, timestamp, and selected scenario.

To start fresh, add `--reset-cache`. This clears the local cache file before the run.

## Customizing Item Mixes

Edit `scripts/config/square-simulator-config.js` to tailor the simulation:

- Add more `items` entries with the correct variation IDs and inventory impact settings.
- Adjust `defaultQuantityRange` to reflect typical order sizes.
- Update or add `scenarios` to change the item distribution probabilities.

Each item includes an `inventoryImpact` field (`auto` vs `manual`) that downstream sync logic can use to decide whether inventory should be decremented automatically.

## Troubleshooting

- **Error: Simulator configuration incomplete**  
  One or more required environment variables are missing. Double-check the variation IDs in `.env.local`.

- **Square API returned 400 or 404**  
  The catalog variation ID likely does not exist in the sandbox. Confirm the catalog was seeded and the env vars match current IDs.

- **Orders created but no payments**  
  The script uses cash payments (`sourceId: CASH`). Sandbox projects must have the Payments API enabled. Verify permissions in the Square Developer Dashboard.

- **Unexpected scenario output**  
  Open `.cache/square-simulator.json` to confirm the last run metadata. Use `--reset-cache` if you need to rerun the same scenario from scratch.

## Next Steps

- Integrate the simulator with future automated tests so sales sync logic can be exercised end-to-end.
- Extend the configuration to include additional menu items or daypart scenarios as new offerings are added to the catalog.
- Pair simulator runs with the upcoming sales sync command to validate inventory decrements across both prepackaged and prepared items.
