BEGIN;

ALTER TABLE public.cogs_products
  ADD COLUMN IF NOT EXISTS product_code text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cogs_products_product_code_unique
  ON public.cogs_products (lower(product_code))
  WHERE product_code IS NOT NULL;

COMMENT ON COLUMN public.cogs_products.product_code IS 'Stable human-friendly code used to reference products in recipe imports (e.g., LATTE_12OZ)';

COMMIT;

