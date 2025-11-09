-- Remove mock suppliers from the database
-- These were added during initial setup for testing purposes

DELETE FROM public.suppliers WHERE name IN (
  'Local Coffee Roasters',
  'Mile High Dairy', 
  'Denver Bakery Supply',
  'Fresh Produce Co',
  'Paper & Packaging Plus'
);