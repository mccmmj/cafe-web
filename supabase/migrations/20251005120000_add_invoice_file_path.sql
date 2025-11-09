-- Add storage path column for invoices and backfill existing records

BEGIN;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS file_path text;

UPDATE invoices
SET file_path = regexp_replace(file_url, '.*/storage/v1/object/public/invoices/', '')
WHERE file_path IS NULL
  AND file_url IS NOT NULL
  AND file_url LIKE '%/storage/v1/object/public/invoices/%';

COMMIT;
