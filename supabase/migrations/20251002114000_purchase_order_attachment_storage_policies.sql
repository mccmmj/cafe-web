-- Ensure purchase order attachment bucket and policies exist

BEGIN;

INSERT INTO storage.buckets (id, name, public)
SELECT 'purchase-order-attachments', 'purchase-order-attachments', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'purchase-order-attachments'
);

CREATE POLICY "Authenticated users can upload purchase order attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'purchase-order-attachments'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

CREATE POLICY "Authenticated users can update purchase order attachments"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'purchase-order-attachments'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
)
WITH CHECK (
  bucket_id = 'purchase-order-attachments'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

CREATE POLICY "Authenticated users can delete purchase order attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'purchase-order-attachments'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

CREATE POLICY "Purchase order attachments public read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'purchase-order-attachments');

COMMIT;
