-- Sales Transactions Sync Support

-- 1. Extend inventory_items classification
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS auto_decrement boolean default false,
  ADD COLUMN IF NOT EXISTS item_type text default 'ingredient' check (item_type in ('ingredient', 'prepackaged', 'prepared', 'supply'));

-- Backfill item_type based on existing boolean flag
UPDATE public.inventory_items
SET item_type = CASE 
  WHEN is_ingredient THEN 'ingredient'
  ELSE 'prepackaged'
END
WHERE item_type = 'ingredient';

-- 2. Create sync run tracking
CREATE TABLE IF NOT EXISTS public.inventory_sales_sync_runs (
  id uuid default gen_random_uuid() primary key,
  started_at timestamptz not null default timezone('utc'::text, now()),
  finished_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'success', 'error')),
  square_cursor text,
  last_synced_at timestamptz,
  orders_processed integer not null default 0,
  auto_decrements integer not null default 0,
  manual_pending integer not null default 0,
  error_message text,
  created_by uuid references public.profiles(id) on delete set null
);

-- 3. Create sales transactions table
CREATE TABLE IF NOT EXISTS public.sales_transactions (
  id uuid default gen_random_uuid() primary key,
  square_order_id text not null unique,
  location_id text not null,
  order_number text,
  tender_total_money numeric(12,2),
  tender_currency text,
  tender_type text,
  customer_name text,
  ordered_at timestamptz not null,
  synced_at timestamptz not null default timezone('utc'::text, now()),
  sync_run_id uuid references public.inventory_sales_sync_runs(id) on delete set null,
  raw_payload jsonb not null
);

CREATE INDEX IF NOT EXISTS idx_sales_transactions_ordered_at ON public.sales_transactions(ordered_at desc);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_location ON public.sales_transactions(location_id);

-- 4. Create sales transaction items table
CREATE TABLE IF NOT EXISTS public.sales_transaction_items (
  id uuid default gen_random_uuid() primary key,
  transaction_id uuid references public.sales_transactions(id) on delete cascade not null,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  square_catalog_object_id text not null,
  name text not null,
  quantity numeric(12,3) not null,
  impact_type text not null check (impact_type in ('auto', 'manual', 'ignored')),
  impact_reason text,
  unit text,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sales_transaction_items_tx ON public.sales_transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_sales_transaction_items_inventory ON public.sales_transaction_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_sales_transaction_items_impact ON public.sales_transaction_items(impact_type);

-- 5. Pending manual deductions view
CREATE OR REPLACE VIEW public.view_pending_manual_inventory_deductions AS
SELECT
  sti.inventory_item_id,
  ii.item_name,
  SUM(sti.quantity) AS total_quantity,
  MAX(st.ordered_at) AS last_transaction_at,
  MAX(st.sync_run_id::text)::uuid AS last_sync_run_id
FROM public.sales_transaction_items sti
JOIN public.sales_transactions st ON st.id = sti.transaction_id
LEFT JOIN public.inventory_items ii ON ii.id = sti.inventory_item_id
WHERE sti.impact_type = 'manual'
GROUP BY sti.inventory_item_id, ii.item_name;

-- 6. Row level security
ALTER TABLE public.inventory_sales_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage sales sync runs" ON public.inventory_sales_sync_runs
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage sales transactions" ON public.sales_transactions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage sales transaction items" ON public.sales_transaction_items
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated admins to read sync data
CREATE POLICY "Authenticated read sales sync runs" ON public.inventory_sales_sync_runs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read sales transactions" ON public.sales_transactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read sales transaction items" ON public.sales_transaction_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE public.inventory_sales_sync_runs IS 'Tracks Square sales sync executions and cursors';
COMMENT ON TABLE public.sales_transactions IS 'Square orders imported for inventory reconciliation';
COMMENT ON TABLE public.sales_transaction_items IS 'Line items from Square orders with inventory impact classification';
COMMENT ON VIEW public.view_pending_manual_inventory_deductions IS 'Aggregates prepared item sales awaiting manual ingredient deductions';
