# Inventory Management System - Bulk Upload Guide

This document explains how to use the bulk inventory upload system to efficiently populate your inventory database with items and suppliers.

## Overview

The inventory management system provides two primary bulk upload capabilities:
1. **Suppliers Bulk Upload** - Upload supplier information from YAML files
2. **Inventory Items Bulk Upload** - Upload inventory items with automatic supplier linking

## Prerequisites

- Admin access to the system (role = 'admin' in profiles table)
- Node.js installed for running CLI tools
- Access to production database via service role key

## Suppliers Management

### YAML Format for Suppliers

Create a YAML file following this structure:

```yaml
suppliers:
  - name: "Premium Coffee Roasters"
    contact_person: "Sarah Johnson"
    email: "sarah@premiumcoffee.com"
    phone: "(303) 555-0100"
    address: "1234 Roaster Ave, Denver CO 80202"
    payment_terms: "Net 30"
    notes: "Premium single-origin coffee beans"
    is_active: true
```

### Uploading Suppliers

```bash
# Upload suppliers (merge with existing)
node scripts/bulk-upload-suppliers.js suppliers.yaml

# Replace all existing suppliers
node scripts/bulk-upload-suppliers.js suppliers.yaml --replace

# Specify admin email
node scripts/bulk-upload-suppliers.js suppliers.yaml --admin-email=admin@example.com
```

## Inventory Items Management

### YAML Format for Inventory Items

Create a YAML file with this structure:

```yaml
inventory_items:
  - square_item_id: "COFFEE_BEANS_PIKE_PLACE"
    item_name: "Pike Place Roast Coffee Beans"
    current_stock: 50
    minimum_threshold: 10
    reorder_point: 15
    unit_cost: 8.50
    unit_type: "lb"
    supplier_name: "Premium Coffee Roasters"  # Must match existing supplier
    location: "Coffee Storage"
    notes: "Premium coffee beans for Pike Place Roast"
    is_ingredient: true
```

#### Field Descriptions

**Required Fields:**
- `square_item_id` - Unique identifier matching Square catalog
- `item_name` - Display name for the inventory item
- `unit_type` - Must be one of: 'each', 'lb', 'oz', 'gallon', 'liter', 'ml'

**Optional Fields:**
- `current_stock` - Current quantity in stock (default: 0)
- `minimum_threshold` - Low stock alert threshold (default: 5)
- `reorder_point` - Reorder alert threshold (default: 10)
- `unit_cost` - Cost per unit in USD (default: 0)
- `supplier_name` - Must match existing supplier name exactly
- `location` - Storage location (default: 'main')
- `notes` - Additional notes about the item
- `is_ingredient` - true for raw ingredients, false for finished products (default: true)
- `last_restocked_at` - ISO date string for last restock

#### Validation Rules

1. `square_item_id` must be unique across all inventory items
2. `reorder_point` must be >= `minimum_threshold`
3. All numeric fields must be non-negative
4. `supplier_name` must exactly match an existing supplier in the database
5. `unit_type` must be one of the allowed values

### Uploading Inventory Items

```bash
# Upload inventory items (merge with existing)
node scripts/bulk-upload-inventory.js inventory-items.yaml

# Replace all existing inventory items
node scripts/bulk-upload-inventory.js inventory-items.yaml --replace

# Specify admin email
node scripts/bulk-upload-inventory.js inventory-items.yaml --admin-email=admin@example.com
```

## Example Workflow

1. **Set up suppliers first:**
   ```bash
   node scripts/bulk-upload-suppliers.js suppliers-example.yaml
   ```

2. **Upload inventory items:**
   ```bash
   node scripts/bulk-upload-inventory.js inventory-items-example.yaml
   ```

3. **Verify in admin dashboard:**
   Visit `/admin/inventory` to view uploaded data

## File Examples

### Complete Supplier Example
See `suppliers-example.yaml` for a complete supplier setup with 5 different supplier types.

### Complete Inventory Example  
See `inventory-items-example.yaml` for 25+ inventory items covering:
- Coffee & espresso ingredients
- Syrups & flavorings
- Dairy products
- Food ingredients
- Baked goods (finished products)
- Bottled beverages
- Snacks
- Packaging & supplies

## API Endpoints

### Suppliers API
- **Endpoint:** `POST /api/admin/suppliers/bulk-upload`
- **Body:** `{ adminEmail: string, suppliers: SupplierInput[], replace?: boolean }`

### Inventory API
- **Endpoint:** `POST /api/admin/inventory/bulk-upload`  
- **Body:** `{ adminEmail: string, items: InventoryItemInput[], replace?: boolean }`

## Troubleshooting

### Common Issues

1. **"Access denied: User is not an admin"**
   - Ensure your email has `role = 'admin'` in the profiles table
   - Use the correct admin email with `--admin-email` flag

2. **"Supplier [name] not found in database"**
   - Upload suppliers first before inventory items
   - Ensure supplier names match exactly (case-sensitive)

3. **"square_item_id already exists"**
   - Use `--replace` flag to clear existing items
   - Or ensure your YAML doesn't have duplicate IDs

4. **"Missing required environment variables"**
   - Verify `.env.local` has correct Supabase credentials
   - Ensure `SUPABASE_SECRET_KEY` is set (not just the publishable key)

### Environment Variables Required

```bash
# In .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key
ADMIN_EMAIL=your-admin@email.com  # Optional, can use --admin-email flag
```

### Getting Help

1. **View CLI help:**
   ```bash
   node scripts/bulk-upload-suppliers.js --help
   node scripts/bulk-upload-inventory.js --help
   ```

2. **API documentation:**
   ```bash
   curl GET /api/admin/suppliers/bulk-upload
   curl GET /api/admin/inventory/bulk-upload
   ```

## Features

### Automatic Stock Movements
When inventory items are uploaded with `current_stock > 0`, the system automatically creates stock movement records with:
- Movement type: 'purchase'
- Reference ID: 'BULK_UPLOAD'
- Notes: 'Initial inventory bulk upload'

### Data Integrity
- Foreign key constraints ensure supplier references are valid
- Unique constraints prevent duplicate Square IDs
- Check constraints validate numeric ranges and enum values

### Admin Security
- All operations require admin role verification
- Service role key authentication bypasses RLS for bulk operations
- Comprehensive audit trail through stock movements

### Performance
- Batch inserts for efficient database operations
- Indexed fields for fast lookups (square_item_id, supplier_id, stock levels)
- Minimal API calls through direct database access

## Square Catalog Synchronization

### Overview
Phase 2 adds Square catalog synchronization to automatically discover and import menu items from your Square account into the inventory system.

### CLI Tool for Square Sync

```bash
# Preview what would be synchronized (dry run)
node scripts/sync-square-catalog.js --dry-run

# Synchronize Square catalog items
node scripts/sync-square-catalog.js

# Specify admin email
node scripts/sync-square-catalog.js --admin-email=admin@example.com
```

### API Endpoint for Square Sync

- **Endpoint:** `POST /api/admin/inventory/sync-square`
- **Body:** `{ adminEmail: string, dryRun?: boolean }`

### Intelligent Features

**Smart Supplier Mapping:**
- Coffee/espresso items → Premium Coffee Roasters
- Dairy products → Local Dairy Cooperative  
- Baked goods → Denver Bakery Supply Co
- Fresh produce → Mountain Fresh Produce
- Packaging → Eco-Friendly Packaging

**Intelligent Inventory Defaults:**
- Coffee beans: 25 lbs stock, Coffee Storage location
- Dairy: Refrigerator location, gallon units for milk
- Baked goods: Display Case location, marked as finished products
- Packaging: Storage Room location, high stock quantities

**Processing Logic:**
- Skips items already in inventory (by square_item_id)
- Creates automatic stock movements for initial inventory
- Preserves existing inventory data during sync
- Provides detailed sync statistics and mapping

### Example Sync Output

```
🔄 Square Catalog Synchronization Tool
📦 Fetching Square catalog...
✅ Retrieved 45 catalog objects
📊 Processing Square catalog items...
Found 32 items in 5 categories
✨ New item: Breakfast Burrito → Dry Storage (Denver Bakery Supply Co)
✨ New item: Café Latte → Beverage Station (Premium Coffee Roasters)
⏩ Skipping existing item: Blueberry Muffin

🎉 Square catalog synchronization completed!
📋 Sync Summary:
   📦 Total Square Items: 32
   🆕 New Items Found: 28
   ✅ Existing Items Skipped: 4
   📁 Categories Available: 5
   💾 Items Inserted: 28
   📊 Stock Movements Created: 23
```

## Phase 3: Hybrid Enrichment Process

### Overview
Phase 3 combines Square catalog sync with YAML-based business data enrichment for comprehensive inventory management.

### Hybrid Workflow

**Two-Phase Process:**
1. **Structure Discovery**: Square sync establishes item catalog and basic structure
2. **Business Enrichment**: YAML overlay adds accurate costs, suppliers, locations, thresholds

### Enrichment Tools

**Standalone Enrichment:**
```bash
# Preview enrichment changes
node scripts/enrich-inventory.js inventory-enrichment-example.yaml --dry-run

# Apply enrichment to existing items
node scripts/enrich-inventory.js my-enrichments.yaml
```

**Complete Hybrid Sync:**
```bash
# Full two-phase sync with preview
node scripts/hybrid-sync.js --dry-run

# Full sync with custom enrichment file
node scripts/hybrid-sync.js --enrichment-file=my-enrichments.yaml

# Skip Square sync, only enrich
node scripts/hybrid-sync.js --skip-square-sync
```

**Periodic Sync (Scheduled):**
```bash
# Smart periodic sync with freshness checks
node scripts/periodic-sync.js --dry-run

# Weekly full sync
node scripts/periodic-sync.js --mode=hybrid

# Daily enrichment only
node scripts/periodic-sync.js --mode=enrich
```

### Conflict Resolution

**Default Strategy**: YAML data wins for business fields, Square wins for item metadata

**Field Management:**
- **Square-managed**: item_name, description, category_id
- **YAML-managed**: unit_cost, supplier_id, stock levels, thresholds, location, notes

**Smart Features:**
- Data freshness checks (daily enrichment, weekly Square sync)
- Automatic cost estimation for zero-cost items
- Intelligent threshold calculations based on turnover
- Location suggestions based on item types

### Example Enrichment YAML

```yaml
inventory_enrichments:
  - square_item_id: "COFFEE_BEANS_PIKE_PLACE"
    unit_cost: 8.50
    supplier_name: "Premium Coffee Roasters"
    current_stock: 35
    location: "Coffee Storage"
    notes: "Premium single-origin beans, roasted weekly"
    custom_fields:
      expiration_tracking: true
      delivery_schedule: "Tuesdays"
```

### API Endpoints

- **Enrichment**: `POST /api/admin/inventory/enrich`
- **Hybrid Sync**: `POST /api/admin/inventory/hybrid-sync`

## Complete Workflow Guide

### Initial Setup
1. **Upload suppliers**: `node scripts/bulk-upload-suppliers.js suppliers.yaml`
2. **Sync Square catalog**: `node scripts/sync-square-catalog.js`
3. **Enrich with business data**: `node scripts/enrich-inventory.js enrichments.yaml`

### Ongoing Management
1. **Daily enrichment**: `node scripts/periodic-sync.js --mode=enrich`
2. **Weekly discovery**: `node scripts/periodic-sync.js --mode=hybrid`
3. **Manual updates**: Use YAML files for bulk business data changes

### Emergency Procedures
1. **Full rebuild**: Use `--replace` flags to completely rebuild inventory
2. **Partial sync**: Use skip flags to run only needed phases
3. **Data validation**: Always use `--dry-run` first for large changes

## Phase 4: Real-Time Webhook Synchronization

### Overview
Phase 4 implements real-time bidirectional sync between Square and your inventory system using webhooks for instant updates.

### Webhook Events Supported

**Catalog Events (`catalog.version.updated`):**
- Triggered when menu items are added, updated, or deleted in Square
- Automatically creates/updates local inventory items
- Preserves local business data (costs, suppliers, thresholds)

**Inventory Events (`inventory.count.updated`):**
- Triggered when stock levels change in Square POS or Dashboard
- Updates local inventory counts in real-time
- Creates automatic stock movements and low stock alerts

### Webhook Setup

**1. Configure Square Webhooks:**
```bash
# Test webhook endpoints accessibility
node scripts/setup-square-webhooks.js --list-existing

# Set up webhook subscriptions (requires public HTTPS URL)
node scripts/setup-square-webhooks.js
```

**2. Required Environment Variables:**
```bash
# Add to .env.local
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_signature_key
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

**3. Webhook Endpoints:**
- **Catalog**: `POST /api/webhooks/square/catalog`
- **Inventory**: `POST /api/webhooks/square/inventory`

### Bidirectional Sync

**Square → Local (Real-time via Webhooks):**
- Menu changes instantly create/update inventory items
- Stock changes from POS instantly update local inventory
- Automatic low stock alerts triggered

**Local → Square (On-demand via API):**
```bash
# Push local inventory counts to Square
curl -X POST /api/admin/inventory/push-to-square \
  -H "Content-Type: application/json" \
  -d '{"adminEmail": "admin@example.com", "pushType": "stock_only"}'
```

### Event-Driven Architecture

**Components:**
- **Webhook Receivers**: Secure endpoints with signature verification
- **Event Processing**: Intelligent conflict resolution and data merging
- **Sync Service**: Centralized business logic for inventory synchronization
- **Audit Trail**: Complete webhook event logging in `webhook_events` table

**Smart Conflict Resolution:**
- Square controls: item names, descriptions, categories
- Local controls: costs, suppliers, stock thresholds, locations
- Automatic: stock levels sync bidirectionally with movement tracking

### Monitoring and Status

**Sync Health Dashboard:**
```bash
# Get sync status and metrics
curl -X POST /api/admin/inventory/sync-status \
  -H "Content-Type: application/json" \
  -d '{"adminEmail": "admin@example.com"}'
```

**Manual Sync Triggers:**
```javascript
import { InventorySyncService } from '@/lib/services/inventory-sync'

// Force manual sync for testing or recovery
const result = await InventorySyncService.forceManualSync('both')
```

### Webhook Event Structure

**Catalog Webhook:**
```json
{
  "type": "catalog.version.updated",
  "event_id": "uuid",
  "data": {
    "object": {
      "catalog_version": {
        "updated_at": "2024-12-18T10:30:00Z"
      }
    }
  }
}
```

**Inventory Webhook:**
```json
{
  "type": "inventory.count.updated", 
  "event_id": "uuid",
  "data": {
    "object": {
      "inventory_counts": [
        {
          "catalog_object_id": "ITEM123",
          "location_id": "LOC456",
          "quantity": "25",
          "state": "IN_STOCK"
        }
      ]
    }
  }
}
```

### Security Features

- **Signature Verification**: Validates webhook authenticity using Square signature
- **Event Deduplication**: Prevents processing the same event multiple times
- **Admin Authentication**: All sync operations require admin access
- **Audit Logging**: Complete trail of all webhook events and sync operations

### Production Deployment

**Requirements:**
1. **Public HTTPS URL**: Webhooks require publicly accessible endpoints
2. **SSL Certificate**: Square requires valid SSL for webhook URLs
3. **Webhook Signature Key**: Configure in Square Developer Console
4. **Database Migration**: Run webhook_events table migration

**Testing:**
```bash
# Test webhook endpoints
curl https://your-domain.com/api/webhooks/square/catalog
curl https://your-domain.com/api/webhooks/square/inventory

# Make test changes in Square Dashboard to trigger webhooks
# Monitor logs for real-time sync processing
```

## Complete Implementation Guide

### Phase-by-Phase Setup

**Phase 1 - Manual Bulk Upload:**
```bash
node scripts/bulk-upload-suppliers.js suppliers.yaml
node scripts/bulk-upload-inventory.js inventory.yaml
```

**Phase 2 - Square Discovery:**
```bash
node scripts/sync-square-catalog.js --dry-run
node scripts/sync-square-catalog.js
```

**Phase 3 - Hybrid Enrichment:**
```bash
node scripts/hybrid-sync.js --dry-run
node scripts/enrich-inventory.js enrichments.yaml
```

**Phase 4 - Real-Time Sync:**
```bash
node scripts/setup-square-webhooks.js
# Configure SQUARE_WEBHOOK_SIGNATURE_KEY
# Deploy to production with public HTTPS
```

### Ongoing Operations

**Daily Management:**
- Real-time updates via webhooks (automatic)
- Manual enrichment: `node scripts/enrich-inventory.js daily-updates.yaml`

**Weekly Management:**  
- Full sync verification: `node scripts/hybrid-sync.js`
- Review sync health: Check `/api/admin/inventory/sync-status`

**Emergency Procedures:**
- Force manual sync: `InventorySyncService.forceManualSync('both')`
- Full rebuild: `node scripts/hybrid-sync.js --replace`
- Webhook reset: `node scripts/setup-square-webhooks.js --delete-all`

## Final Architecture

Your inventory system now provides:
✅ **Manual Control**: YAML-based bulk operations  
✅ **Intelligent Discovery**: Square catalog synchronization  
✅ **Business Enrichment**: Hybrid data management  
✅ **Real-Time Sync**: Webhook-driven live updates  
✅ **Bidirectional Flow**: Push local changes back to Square  
✅ **Complete Audit Trail**: Every change tracked and logged  
✅ **Smart Automation**: Intelligent defaults and conflict resolution