-- Persist normalized invoice text + extraction metadata for audit + regression testing

BEGIN;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS raw_text text,
  ADD COLUMN IF NOT EXISTS clean_text text,
  ADD COLUMN IF NOT EXISTS text_analysis jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN invoices.raw_text IS 'Original text extracted from the invoice before normalization';
COMMENT ON COLUMN invoices.clean_text IS 'Normalized invoice text after column/spacing cleanup';
COMMENT ON COLUMN invoices.text_analysis IS 'JSON blob describing extraction method, heuristics, and validation stats';

COMMIT;
