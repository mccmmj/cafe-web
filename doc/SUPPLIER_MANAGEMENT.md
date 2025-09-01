# Supplier Management

This document explains how to manage suppliers in your cafe system, including bulk upload functionality.

## Bulk Upload Suppliers from YAML

You can bulk upload suppliers using a YAML file format. This is useful for:
- Initial setup with multiple suppliers
- Migrating suppliers from another system
- Batch updates to supplier information

### Prerequisites

1. **Admin Account**: You need an admin user account with `role = 'admin'` in your database
2. **Environment Variables**: Your `.env` file must contain Supabase credentials
3. **Admin Email**: You'll need the email address of your admin account

### Step 1: Create Your Suppliers YAML File

Create a YAML file with your supplier data. See `suppliers-example.yaml` for reference:

```yaml
suppliers:
  - name: "Your Coffee Roaster"
    contact_person: "John Smith"
    email: "john@coffeeroaster.com"
    phone: "(555) 123-4567"
    address: "123 Coffee St, Your City"
    payment_terms: "Net 30"
    notes: "Premium coffee supplier"
    is_active: true
  - name: "Local Dairy"
    contact_person: "Mary Johnson"
    email: "mary@localdairy.com"
    phone: "(555) 987-6543"
    payment_terms: "COD"
    is_active: true
```

#### Required Fields
- `name`: Supplier name (must be unique)

#### Optional Fields
- `contact_person`: Primary contact name
- `email`: Contact email address
- `phone`: Contact phone number
- `address`: Business address
- `payment_terms`: Payment terms (e.g., "Net 30", "COD", "Net 15")
- `notes`: Additional notes about the supplier
- `is_active`: Whether supplier is active (default: true)

### Step 2: Upload Suppliers

Use the CLI tool to upload your suppliers:

```bash
# Upload suppliers (adds new, updates existing by name)
npm run upload-suppliers suppliers.yaml -- --email admin@example.com

# Replace all existing suppliers with new ones
npm run upload-suppliers suppliers.yaml -- --replace --email admin@example.com

# Show help
npm run upload-suppliers -- --help
```

### Options

- `--email`: Admin email address (required for authentication)
- `--replace`: Removes all existing suppliers first, then adds new ones
- `--help`: Show detailed usage information

### Upload Behavior

**Default Mode (Merge)**:
- New suppliers are created
- Existing suppliers (same name) are updated
- Other suppliers remain unchanged

**Replace Mode (`--replace`)**:
- All existing suppliers are removed
- New suppliers from YAML are created
- Use with caution - this cannot be undone!

### Authentication

The bulk upload uses **Service Role Authentication** and requires:

1. **Environment Variables**: Your `.env` file must contain:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   SUPABASE_SECRET_KEY=your-supabase-secret-key
   ```

2. **Admin Account**: A user account with:
   - Valid email address in the `profiles` table
   - `role = 'admin'` in the database

**No browser login required!** The CLI tool authenticates directly with Supabase.

### Example Usage

```bash
# 1. Create your suppliers.yaml file
cp suppliers-example.yaml my-suppliers.yaml

# 2. Edit my-suppliers.yaml with your actual supplier data

# 3. Upload suppliers (no need for running dev server!)
npm run upload-suppliers my-suppliers.yaml -- --email your-admin@example.com

# 4. Check results in /admin/inventory (Suppliers tab)
```

### Troubleshooting

**"Admin user not found" error**:
- Check that the email address is correct
- Make sure the user exists in your `profiles` table
- Verify you're using the correct environment (development vs production)

**"Does not have admin privileges" error**:
- Your user account needs admin privileges
- Update your role in the Supabase dashboard: profiles table → your user → role = 'admin'

**"Missing Supabase environment variables" error**:
- Make sure your `.env` file contains the required Supabase credentials
- Check that variable names match exactly (no typos)

**"Duplicate supplier names" error**:
- Check your YAML file for duplicate supplier names
- Supplier names must be unique within the file

**YAML parsing errors**:
- Validate your YAML syntax using an online YAML validator
- Make sure indentation is consistent (use spaces, not tabs)
- Quote strings containing special characters

## Manual Supplier Management

You can also manage suppliers manually through the admin interface:

1. Go to `/admin/inventory`
2. Click on the "Suppliers" tab
3. Use "Add Supplier" to create new suppliers
4. Click on any supplier to edit their information
5. Use the toggle to activate/deactivate suppliers

## Database Schema

Suppliers are stored in the `public.suppliers` table with these fields:

```sql
CREATE TABLE public.suppliers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  contact_person text,
  email text,
  phone text,
  address text,
  payment_terms text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

## Integration with Inventory

Suppliers are used throughout the inventory system:

- **Inventory Items**: Can be linked to suppliers for procurement
- **Purchase Orders**: Generated for suppliers to restock inventory
- **Cost Tracking**: Supplier information helps track item costs
- **Reporting**: Supplier performance and spending analysis