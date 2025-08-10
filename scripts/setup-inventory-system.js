/**
 * Setup Inventory Management System
 * Creates the necessary database tables and initial data for inventory tracking
 * Run with: node scripts/setup-inventory-system.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration. Check your .env.local file.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupInventorySystem() {
  console.log('🏗️ Setting up Inventory Management System...')
  
  try {
    // Check if inventory tables already exist by trying to query one
    const { data: existingCheck, error: tableError } = await supabase
      .from('suppliers')
      .select('id')
      .limit(1)

    if (!tableError) {
      console.log('⚠️ Inventory tables already exist. Skipping table creation.')
      return
    }

    // If we get a table not found error, that means we need to create the tables
    if (tableError.code !== '42P01') {
      console.error('Unexpected error checking tables:', tableError)
      return
    }

    console.log('📁 Creating inventory tables...')
    console.log('⚠️ Note: This script provides SQL for manual execution in Supabase Dashboard')
    console.log('🔗 Go to: https://supabase.com/dashboard/project/ofppjltowsdvojixeflr/sql')
    console.log('')
    console.log('📋 Copy and execute these SQL commands:')
    console.log('')
    
    const inventorySQL = `
-- Inventory Management System Schema
-- Run this in Supabase SQL Editor

-- 1. Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  contact_person text,
  email text,
  phone text,
  address text,
  payment_terms text,
  notes text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create inventory_items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid default gen_random_uuid() primary key,
  square_item_id text not null unique,
  item_name text not null,
  current_stock integer not null default 0 check (current_stock >= 0),
  minimum_threshold integer not null default 5 check (minimum_threshold >= 0),
  reorder_point integer not null default 10 check (reorder_point >= minimum_threshold),
  unit_cost numeric(10,2) default 0 check (unit_cost >= 0),
  unit_type text not null default 'each' check (unit_type in ('each', 'lb', 'oz', 'gallon', 'liter', 'ml')),
  is_ingredient boolean default false,
  supplier_id uuid references public.suppliers(id) on delete set null,
  location text default 'main',
  notes text,
  last_restocked_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create stock_movements table
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid default gen_random_uuid() primary key,
  inventory_item_id uuid references public.inventory_items(id) on delete cascade not null,
  movement_type text not null check (movement_type in ('purchase', 'sale', 'adjustment', 'waste', 'transfer')),
  quantity_change integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  unit_cost numeric(10,2),
  reference_id text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid default gen_random_uuid() primary key,
  supplier_id uuid references public.suppliers(id) on delete set null not null,
  order_number text unique,
  status text not null default 'draft' check (status in ('draft', 'sent', 'confirmed', 'received', 'cancelled')),
  order_date date not null default current_date,
  expected_delivery_date date,
  actual_delivery_date date,
  total_amount numeric(10,2) default 0,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create purchase_order_items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid default gen_random_uuid() primary key,
  purchase_order_id uuid references public.purchase_orders(id) on delete cascade not null,
  inventory_item_id uuid references public.inventory_items(id) on delete cascade not null,
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer default 0 check (quantity_received >= 0),
  unit_cost numeric(10,2) not null check (unit_cost >= 0),
  total_cost numeric(10,2) generated always as (quantity_ordered * unit_cost) stored,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Create low_stock_alerts table
CREATE TABLE IF NOT EXISTS public.low_stock_alerts (
  id uuid default gen_random_uuid() primary key,
  inventory_item_id uuid references public.inventory_items(id) on delete cascade not null,
  alert_level text not null check (alert_level in ('low', 'critical', 'out_of_stock')),
  stock_level integer not null,
  threshold_level integer not null,
  is_acknowledged boolean default false,
  acknowledged_by uuid references auth.users(id) on delete set null,
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Create recipe_ingredients table
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id uuid default gen_random_uuid() primary key,
  finished_item_id uuid references public.inventory_items(id) on delete cascade not null,
  ingredient_item_id uuid references public.inventory_items(id) on delete cascade not null,
  quantity_used numeric(10,4) not null check (quantity_used > 0),
  unit_type text not null default 'each',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(finished_item_id, ingredient_item_id)
);

-- 8. Add updated_at triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 9. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_square_id ON public.inventory_items(square_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock_level ON public.inventory_items(current_stock);
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier ON public.inventory_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON public.stock_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements(created_at desc);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_item ON public.low_stock_alerts(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_level ON public.low_stock_alerts(alert_level);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_finished ON public.recipe_ingredients(finished_item_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON public.recipe_ingredients(ingredient_item_id);

-- 10. Enable Row Level Security
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- 11. Create admin-only RLS policies
CREATE POLICY "Admin can manage inventory items" ON public.inventory_items 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admin can manage suppliers" ON public.suppliers 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admin can view stock movements" ON public.stock_movements 
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admin can insert stock movements" ON public.stock_movements 
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admin can manage purchase orders" ON public.purchase_orders 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admin can manage purchase order items" ON public.purchase_order_items 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admin can manage low stock alerts" ON public.low_stock_alerts 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admin can manage recipe ingredients" ON public.recipe_ingredients 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 12. Insert initial suppliers
INSERT INTO public.suppliers (name, contact_person, email, phone, payment_terms) VALUES 
  ('Local Coffee Roasters', 'John Smith', 'orders@localroasters.com', '(303) 555-0101', 'Net 15'),
  ('Mile High Dairy', 'Sarah Johnson', 'sarah@milehighdairy.com', '(303) 555-0102', 'Net 30'),
  ('Denver Bakery Supply', 'Mike Chen', 'mike@denverbakery.com', '(303) 555-0103', 'Net 30'),
  ('Fresh Produce Co', 'Lisa Martinez', 'lisa@freshproduce.com', '(303) 555-0104', 'COD'),
  ('Paper & Packaging Plus', 'David Wilson', 'david@packagingplus.com', '(303) 555-0105', 'Net 30')
ON CONFLICT (name) DO NOTHING;
`
    
    console.log(inventorySQL)
    console.log('')
    console.log('💡 After running the SQL, the inventory management system will be ready!')
    console.log('🚀 You can then access it at /admin/inventory')

    return

    if (suppliersError) {
      console.error('❌ Error creating suppliers table:', suppliersError)
      return
    }

    // Create inventory_items table
    const { error: inventoryError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.inventory_items (
          id uuid default gen_random_uuid() primary key,
          square_item_id text not null unique,
          item_name text not null,
          current_stock integer not null default 0 check (current_stock >= 0),
          minimum_threshold integer not null default 5 check (minimum_threshold >= 0),
          reorder_point integer not null default 10 check (reorder_point >= minimum_threshold),
          unit_cost numeric(10,2) default 0 check (unit_cost >= 0),
          unit_type text not null default 'each' check (unit_type in ('each', 'lb', 'oz', 'gallon', 'liter', 'ml')),
          is_ingredient boolean default false,
          supplier_id uuid references public.suppliers(id) on delete set null,
          location text default 'main',
          notes text,
          last_restocked_at timestamp with time zone,
          created_at timestamp with time zone default timezone('utc'::text, now()) not null,
          updated_at timestamp with time zone default timezone('utc'::text, now()) not null
        );
      `
    })

    if (inventoryError) {
      console.error('❌ Error creating inventory_items table:', inventoryError)
      return
    }

    // Create other inventory tables
    const additionalTables = [
      {
        name: 'stock_movements',
        sql: `
          CREATE TABLE IF NOT EXISTS public.stock_movements (
            id uuid default gen_random_uuid() primary key,
            inventory_item_id uuid references public.inventory_items(id) on delete cascade not null,
            movement_type text not null check (movement_type in ('purchase', 'sale', 'adjustment', 'waste', 'transfer')),
            quantity_change integer not null,
            previous_stock integer not null,
            new_stock integer not null,
            unit_cost numeric(10,2),
            reference_id text,
            notes text,
            created_by uuid references auth.users(id) on delete set null,
            created_at timestamp with time zone default timezone('utc'::text, now()) not null
          );
        `
      },
      {
        name: 'purchase_orders',
        sql: `
          CREATE TABLE IF NOT EXISTS public.purchase_orders (
            id uuid default gen_random_uuid() primary key,
            supplier_id uuid references public.suppliers(id) on delete set null not null,
            order_number text unique,
            status text not null default 'draft' check (status in ('draft', 'sent', 'confirmed', 'received', 'cancelled')),
            order_date date not null default current_date,
            expected_delivery_date date,
            actual_delivery_date date,
            total_amount numeric(10,2) default 0,
            notes text,
            created_by uuid references auth.users(id) on delete set null,
            created_at timestamp with time zone default timezone('utc'::text, now()) not null,
            updated_at timestamp with time zone default timezone('utc'::text, now()) not null
          );
        `
      },
      {
        name: 'purchase_order_items',
        sql: `
          CREATE TABLE IF NOT EXISTS public.purchase_order_items (
            id uuid default gen_random_uuid() primary key,
            purchase_order_id uuid references public.purchase_orders(id) on delete cascade not null,
            inventory_item_id uuid references public.inventory_items(id) on delete cascade not null,
            quantity_ordered integer not null check (quantity_ordered > 0),
            quantity_received integer default 0 check (quantity_received >= 0),
            unit_cost numeric(10,2) not null check (unit_cost >= 0),
            total_cost numeric(10,2) generated always as (quantity_ordered * unit_cost) stored,
            created_at timestamp with time zone default timezone('utc'::text, now()) not null
          );
        `
      },
      {
        name: 'low_stock_alerts',
        sql: `
          CREATE TABLE IF NOT EXISTS public.low_stock_alerts (
            id uuid default gen_random_uuid() primary key,
            inventory_item_id uuid references public.inventory_items(id) on delete cascade not null,
            alert_level text not null check (alert_level in ('low', 'critical', 'out_of_stock')),
            stock_level integer not null,
            threshold_level integer not null,
            is_acknowledged boolean default false,
            acknowledged_by uuid references auth.users(id) on delete set null,
            acknowledged_at timestamp with time zone,
            created_at timestamp with time zone default timezone('utc'::text, now()) not null
          );
        `
      },
      {
        name: 'recipe_ingredients',
        sql: `
          CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
            id uuid default gen_random_uuid() primary key,
            finished_item_id uuid references public.inventory_items(id) on delete cascade not null,
            ingredient_item_id uuid references public.inventory_items(id) on delete cascade not null,
            quantity_used numeric(10,4) not null check (quantity_used > 0),
            unit_type text not null default 'each',
            created_at timestamp with time zone default timezone('utc'::text, now()) not null,
            unique(finished_item_id, ingredient_item_id)
          );
        `
      }
    ]

    for (const table of additionalTables) {
      console.log(`📁 Creating ${table.name} table...`)
      const { error } = await supabase.rpc('exec_sql', { sql: table.sql })
      if (error) {
        console.error(`❌ Error creating ${table.name} table:`, error)
        return
      }
    }

    console.log('📊 Creating indexes for performance...')
    
    // Create indexes
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_inventory_items_square_id ON public.inventory_items(square_item_id);",
      "CREATE INDEX IF NOT EXISTS idx_inventory_items_stock_level ON public.inventory_items(current_stock);",
      "CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier ON public.inventory_items(supplier_id);",
      "CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON public.stock_movements(inventory_item_id);",
      "CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(movement_type);",
      "CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements(created_at desc);",
      "CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);",
      "CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);",
      "CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON public.purchase_order_items(purchase_order_id);",
      "CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_item ON public.low_stock_alerts(inventory_item_id);",
      "CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_level ON public.low_stock_alerts(alert_level);",
      "CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_finished ON public.recipe_ingredients(finished_item_id);",
      "CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON public.recipe_ingredients(ingredient_item_id);"
    ]

    for (const indexSql of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: indexSql })
      if (error) {
        console.log(`⚠️ Warning creating index: ${error.message}`)
      }
    }

    console.log('🔒 Setting up Row Level Security...')

    // Enable RLS on tables
    const rlsTables = ['inventory_items', 'suppliers', 'stock_movements', 'purchase_orders', 'purchase_order_items', 'low_stock_alerts', 'recipe_ingredients']
    
    for (const table of rlsTables) {
      const { error } = await supabase.rpc('exec_sql', { 
        sql: `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;` 
      })
      if (error) {
        console.log(`⚠️ Warning enabling RLS on ${table}:`, error.message)
      }
    }

    // Create RLS policies for admin access
    const adminPolicies = [
      "CREATE POLICY IF NOT EXISTS \"Admin can manage inventory items\" ON public.inventory_items FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));",
      "CREATE POLICY IF NOT EXISTS \"Admin can manage suppliers\" ON public.suppliers FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));",
      "CREATE POLICY IF NOT EXISTS \"Admin can view stock movements\" ON public.stock_movements FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));",
      "CREATE POLICY IF NOT EXISTS \"Admin can insert stock movements\" ON public.stock_movements FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));",
      "CREATE POLICY IF NOT EXISTS \"Admin can manage purchase orders\" ON public.purchase_orders FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));",
      "CREATE POLICY IF NOT EXISTS \"Admin can manage purchase order items\" ON public.purchase_order_items FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));",
      "CREATE POLICY IF NOT EXISTS \"Admin can manage low stock alerts\" ON public.low_stock_alerts FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));",
      "CREATE POLICY IF NOT EXISTS \"Admin can manage recipe ingredients\" ON public.recipe_ingredients FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));"
    ]

    for (const policy of adminPolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql: policy })
      if (error) {
        console.log(`⚠️ Warning creating policy: ${error.message}`)
      }
    }

    console.log('📦 Inserting initial suppliers...')

    // Insert initial suppliers
    const { error: supplierInsertError } = await supabase
      .from('suppliers')
      .insert([
        { name: 'Local Coffee Roasters', contact_person: 'John Smith', email: 'orders@localroasters.com', phone: '(303) 555-0101', payment_terms: 'Net 15' },
        { name: 'Mile High Dairy', contact_person: 'Sarah Johnson', email: 'sarah@milehighdairy.com', phone: '(303) 555-0102', payment_terms: 'Net 30' },
        { name: 'Denver Bakery Supply', contact_person: 'Mike Chen', email: 'mike@denverbakery.com', phone: '(303) 555-0103', payment_terms: 'Net 30' },
        { name: 'Fresh Produce Co', contact_person: 'Lisa Martinez', email: 'lisa@freshproduce.com', phone: '(303) 555-0104', payment_terms: 'COD' },
        { name: 'Paper & Packaging Plus', contact_person: 'David Wilson', email: 'david@packagingplus.com', phone: '(303) 555-0105', payment_terms: 'Net 30' }
      ])

    if (supplierInsertError) {
      console.log('⚠️ Warning inserting suppliers (may already exist):', supplierInsertError.message)
    } else {
      console.log('✅ Initial suppliers created')
    }

    console.log('\n🎉 Inventory Management System setup complete!')
    console.log('📋 Created tables:')
    console.log('   📦 inventory_items - Track stock levels for menu items')
    console.log('   🏢 suppliers - Manage vendor relationships')
    console.log('   📊 stock_movements - Audit trail for all inventory changes')
    console.log('   📋 purchase_orders - Track supplier orders and deliveries')
    console.log('   📄 purchase_order_items - Individual items in purchase orders')
    console.log('   🚨 low_stock_alerts - Automated stock level notifications')
    console.log('   🧾 recipe_ingredients - Track ingredient usage in finished products')
    console.log('\n🔐 Row Level Security policies created for admin-only access')
    console.log('📊 Performance indexes created for all key relationships')
    console.log('\n🚀 Ready to use inventory management features in /admin/inventory')

  } catch (error) {
    console.error('❌ Error setting up inventory system:', error.message)
    process.exit(1)
  }
}

// Run the setup
if (require.main === module) {
  setupInventorySystem()
}

module.exports = { setupInventorySystem }