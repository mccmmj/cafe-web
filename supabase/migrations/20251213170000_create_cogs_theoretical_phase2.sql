-- Phase 2: Theoretical COGS foundations (products/sellables + recipes + overrides)

BEGIN;

-- 1) Products (Square ITEM)
CREATE TABLE IF NOT EXISTS public.cogs_products (
  id uuid default gen_random_uuid() primary key,
  square_item_id text not null unique,
  name text not null,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cogs_products_active
  ON public.cogs_products(is_active);

-- 2) Sellables (Square ITEM_VARIATION)
CREATE TABLE IF NOT EXISTS public.cogs_sellables (
  id uuid default gen_random_uuid() primary key,
  square_variation_id text not null unique,
  product_id uuid references public.cogs_products(id) on delete cascade not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cogs_sellables_product
  ON public.cogs_sellables(product_id);

-- 3) Sellable aliases (historical Square variation IDs)
CREATE TABLE IF NOT EXISTS public.cogs_sellable_aliases (
  id uuid default gen_random_uuid() primary key,
  square_variation_id text not null unique,
  sellable_id uuid references public.cogs_sellables(id) on delete cascade not null,
  valid_from timestamptz,
  valid_to timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cogs_sellable_aliases_sellable
  ON public.cogs_sellable_aliases(sellable_id);

-- 4) Product base recipes (versioned, effective-dated)
CREATE TABLE IF NOT EXISTS public.cogs_product_recipes (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.cogs_products(id) on delete cascade not null,
  version integer not null default 1 check (version > 0),
  effective_from timestamptz not null,
  effective_to timestamptz,
  yield_qty numeric(12,3) not null default 1 check (yield_qty > 0),
  yield_unit text not null default 'each',
  notes text,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint cogs_product_recipes_valid_range check (effective_to is null or effective_to > effective_from)
);

CREATE INDEX IF NOT EXISTS idx_cogs_product_recipes_product
  ON public.cogs_product_recipes(product_id, effective_from desc);

-- 5) Product recipe lines (ingredients)
CREATE TABLE IF NOT EXISTS public.cogs_product_recipe_lines (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references public.cogs_product_recipes(id) on delete cascade not null,
  inventory_item_id uuid references public.inventory_items(id) on delete restrict not null,
  qty numeric(12,4) not null check (qty > 0),
  unit text not null,
  loss_pct numeric(6,3) not null default 0 check (loss_pct >= 0 and loss_pct <= 100),
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint cogs_product_recipe_lines_unique unique (recipe_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_cogs_product_recipe_lines_recipe
  ON public.cogs_product_recipe_lines(recipe_id);

-- 6) Sellable recipe overrides (diffs, effective-dated)
CREATE TABLE IF NOT EXISTS public.cogs_sellable_recipe_overrides (
  id uuid default gen_random_uuid() primary key,
  sellable_id uuid references public.cogs_sellables(id) on delete cascade not null,
  version integer not null default 1 check (version > 0),
  effective_from timestamptz not null,
  effective_to timestamptz,
  notes text,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint cogs_sellable_overrides_valid_range check (effective_to is null or effective_to > effective_from)
);

CREATE INDEX IF NOT EXISTS idx_cogs_sellable_overrides_sellable
  ON public.cogs_sellable_recipe_overrides(sellable_id, effective_from desc);

-- 7) Override operations (add/remove/replace/multiplier)
CREATE TABLE IF NOT EXISTS public.cogs_sellable_recipe_override_ops (
  id uuid default gen_random_uuid() primary key,
  override_id uuid references public.cogs_sellable_recipe_overrides(id) on delete cascade not null,
  op_type text not null check (op_type in ('add', 'remove', 'replace', 'multiplier')),
  target_inventory_item_id uuid references public.inventory_items(id) on delete restrict,
  new_inventory_item_id uuid references public.inventory_items(id) on delete restrict,
  qty numeric(12,4),
  unit text,
  multiplier numeric(12,6),
  loss_pct numeric(6,3),
  created_at timestamptz not null default timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cogs_sellable_override_ops_override
  ON public.cogs_sellable_recipe_override_ops(override_id);

-- 8) RLS
ALTER TABLE public.cogs_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cogs_sellables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cogs_sellable_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cogs_product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cogs_product_recipe_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cogs_sellable_recipe_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cogs_sellable_recipe_override_ops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages cogs products"
  ON public.cogs_products
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read cogs products"
  ON public.cogs_products
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages cogs sellables"
  ON public.cogs_sellables
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read cogs sellables"
  ON public.cogs_sellables
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages cogs sellable aliases"
  ON public.cogs_sellable_aliases
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read cogs sellable aliases"
  ON public.cogs_sellable_aliases
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages product recipes"
  ON public.cogs_product_recipes
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read product recipes"
  ON public.cogs_product_recipes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages product recipe lines"
  ON public.cogs_product_recipe_lines
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read product recipe lines"
  ON public.cogs_product_recipe_lines
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages sellable overrides"
  ON public.cogs_sellable_recipe_overrides
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read sellable overrides"
  ON public.cogs_sellable_recipe_overrides
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages sellable override ops"
  ON public.cogs_sellable_recipe_override_ops
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read sellable override ops"
  ON public.cogs_sellable_recipe_override_ops
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 9) updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_cogs_products') THEN
    CREATE TRIGGER handle_updated_at_cogs_products
      BEFORE UPDATE ON public.cogs_products
      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_cogs_sellables') THEN
    CREATE TRIGGER handle_updated_at_cogs_sellables
      BEFORE UPDATE ON public.cogs_sellables
      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_cogs_product_recipes') THEN
    CREATE TRIGGER handle_updated_at_cogs_product_recipes
      BEFORE UPDATE ON public.cogs_product_recipes
      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_cogs_sellable_overrides') THEN
    CREATE TRIGGER handle_updated_at_cogs_sellable_overrides
      BEFORE UPDATE ON public.cogs_sellable_recipe_overrides
      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
  END IF;
END $$;

COMMENT ON TABLE public.cogs_products IS 'Square ITEM catalog records used for base recipes (theoretical COGS)';
COMMENT ON TABLE public.cogs_sellables IS 'Square ITEM_VARIATION catalog records used as sellables in theoretical COGS';
COMMENT ON TABLE public.cogs_product_recipes IS 'Versioned, effective-dated base recipes at the product level';
COMMENT ON TABLE public.cogs_sellable_recipe_overrides IS 'Versioned, effective-dated sellable overrides expressed as diff operations';

COMMIT;

