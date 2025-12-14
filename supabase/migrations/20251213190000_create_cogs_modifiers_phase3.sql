-- Phase 3: Theoretical COGS modifiers (Square add-ons)
-- Adds modifier sets/options and modifier option recipes.

BEGIN;

-- 1) Modifier sets (Square MODIFIER_LIST)
CREATE TABLE IF NOT EXISTS public.cogs_modifier_sets (
  id uuid default gen_random_uuid() primary key,
  square_modifier_list_id text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cogs_modifier_sets_active
  ON public.cogs_modifier_sets(is_active);

-- 2) Modifier options (Square MODIFIER)
CREATE TABLE IF NOT EXISTS public.cogs_modifier_options (
  id uuid default gen_random_uuid() primary key,
  modifier_set_id uuid references public.cogs_modifier_sets(id) on delete cascade not null,
  square_modifier_id text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cogs_modifier_options_set
  ON public.cogs_modifier_options(modifier_set_id);

-- 3) Modifier option recipes (versioned, effective-dated)
CREATE TABLE IF NOT EXISTS public.cogs_modifier_option_recipes (
  id uuid default gen_random_uuid() primary key,
  modifier_option_id uuid references public.cogs_modifier_options(id) on delete cascade not null,
  version integer not null default 1 check (version > 0),
  effective_from timestamptz not null,
  effective_to timestamptz,
  notes text,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint cogs_modifier_option_recipes_valid_range check (effective_to is null or effective_to > effective_from)
);

CREATE INDEX IF NOT EXISTS idx_cogs_modifier_option_recipes_option
  ON public.cogs_modifier_option_recipes(modifier_option_id, effective_from desc);

-- 4) Modifier option recipe lines (ingredients)
CREATE TABLE IF NOT EXISTS public.cogs_modifier_option_recipe_lines (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references public.cogs_modifier_option_recipes(id) on delete cascade not null,
  inventory_item_id uuid references public.inventory_items(id) on delete restrict not null,
  qty numeric(12,4) not null check (qty > 0),
  unit text not null,
  loss_pct numeric(6,3) not null default 0 check (loss_pct >= 0 and loss_pct <= 100),
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint cogs_modifier_option_recipe_lines_unique unique (recipe_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_cogs_modifier_option_recipe_lines_recipe
  ON public.cogs_modifier_option_recipe_lines(recipe_id);

-- 5) RLS
ALTER TABLE public.cogs_modifier_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cogs_modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cogs_modifier_option_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cogs_modifier_option_recipe_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages cogs modifier sets"
  ON public.cogs_modifier_sets
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read cogs modifier sets"
  ON public.cogs_modifier_sets
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages cogs modifier options"
  ON public.cogs_modifier_options
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read cogs modifier options"
  ON public.cogs_modifier_options
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages modifier option recipes"
  ON public.cogs_modifier_option_recipes
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read modifier option recipes"
  ON public.cogs_modifier_option_recipes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages modifier option recipe lines"
  ON public.cogs_modifier_option_recipe_lines
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read modifier option recipe lines"
  ON public.cogs_modifier_option_recipe_lines
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 6) updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_cogs_modifier_sets') THEN
    CREATE TRIGGER handle_updated_at_cogs_modifier_sets
      BEFORE UPDATE ON public.cogs_modifier_sets
      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_cogs_modifier_options') THEN
    CREATE TRIGGER handle_updated_at_cogs_modifier_options
      BEFORE UPDATE ON public.cogs_modifier_options
      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_cogs_modifier_option_recipes') THEN
    CREATE TRIGGER handle_updated_at_cogs_modifier_option_recipes
      BEFORE UPDATE ON public.cogs_modifier_option_recipes
      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
  END IF;
END $$;

COMMENT ON TABLE public.cogs_modifier_sets IS 'Square modifier lists used to organize modifier options for theoretical COGS add-ons';
COMMENT ON TABLE public.cogs_modifier_options IS 'Square modifier options used as add-ons in theoretical COGS';
COMMENT ON TABLE public.cogs_modifier_option_recipes IS 'Versioned, effective-dated recipes attached to a modifier option';
COMMENT ON TABLE public.cogs_modifier_option_recipe_lines IS 'Ingredient lines for a modifier option recipe';

COMMIT;

