-- Phase 1: COGS reporting foundation (periodic COGS)
-- Adds period tracking, inventory valuation snapshots, and stored COGS reports.

BEGIN;

-- 1) COGS periods
CREATE TABLE IF NOT EXISTS public.cogs_periods (
  id uuid default gen_random_uuid() primary key,
  period_type text not null check (period_type in ('weekly', 'monthly', 'annual', 'custom')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_at timestamptz,
  closed_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint cogs_periods_valid_range check (end_at > start_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cogs_periods_unique_range
  ON public.cogs_periods (start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_cogs_periods_status
  ON public.cogs_periods (status);

CREATE INDEX IF NOT EXISTS idx_cogs_periods_end_at
  ON public.cogs_periods (end_at desc);

-- 2) Inventory valuation snapshots
CREATE TABLE IF NOT EXISTS public.inventory_valuations (
  id uuid default gen_random_uuid() primary key,
  period_id uuid references public.cogs_periods(id) on delete cascade not null,
  inventory_item_id uuid references public.inventory_items(id) on delete cascade not null,
  qty_on_hand numeric(12,3) not null default 0 check (qty_on_hand >= 0),
  unit_cost numeric(12,4) not null default 0 check (unit_cost >= 0),
  value numeric(12,2) not null default 0 check (value >= 0),
  method text not null default 'wac' check (method in ('wac')),
  computed_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint inventory_valuations_unique_item_per_period unique (period_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_valuations_period
  ON public.inventory_valuations (period_id);

CREATE INDEX IF NOT EXISTS idx_inventory_valuations_item
  ON public.inventory_valuations (inventory_item_id);

-- 3) Stored COGS reports for closed periods
CREATE TABLE IF NOT EXISTS public.cogs_reports (
  id uuid default gen_random_uuid() primary key,
  period_id uuid references public.cogs_periods(id) on delete cascade not null unique,
  begin_inventory_value numeric(12,2) not null default 0,
  purchases_value numeric(12,2) not null default 0,
  end_inventory_value numeric(12,2) not null default 0,
  periodic_cogs_value numeric(12,2) not null default 0,
  currency text not null default 'USD',
  inputs jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cogs_reports_created_at
  ON public.cogs_reports (created_at desc);

-- 4) RLS
ALTER TABLE public.cogs_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cogs_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages cogs periods"
  ON public.cogs_periods
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read cogs periods"
  ON public.cogs_periods
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages inventory valuations"
  ON public.inventory_valuations
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read inventory valuations"
  ON public.inventory_valuations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages cogs reports"
  ON public.cogs_reports
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read cogs reports"
  ON public.cogs_reports
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 5) updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_cogs_periods'
  ) THEN
    CREATE TRIGGER handle_updated_at_cogs_periods
      BEFORE UPDATE ON public.cogs_periods
      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
  END IF;
END $$;

COMMENT ON TABLE public.cogs_periods IS 'Defines reporting periods for COGS computations and period close workflow';
COMMENT ON TABLE public.inventory_valuations IS 'Inventory valuation snapshots for a COGS period (qty, unit cost, extended value)';
COMMENT ON TABLE public.cogs_reports IS 'Stored periodic COGS results for closed periods (bookkeeping/audit)';

COMMIT;

