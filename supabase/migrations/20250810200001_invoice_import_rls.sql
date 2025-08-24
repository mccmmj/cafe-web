-- Invoice Import System - Row Level Security
-- Ensures only admins can access invoice import functionality

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_invoice_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_import_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ADMIN-ONLY POLICIES
-- =============================================

-- INVOICES - Admin only access
CREATE POLICY "Admins can manage invoices"
  ON invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- INVOICE ITEMS - Admin only access
CREATE POLICY "Admins can manage invoice items"
  ON invoice_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ORDER INVOICE MATCHES - Admin only access
CREATE POLICY "Admins can manage order invoice matches"
  ON order_invoice_matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- SUPPLIER INVOICE TEMPLATES - Admin only access
CREATE POLICY "Admins can manage supplier invoice templates"
  ON supplier_invoice_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- INVOICE IMPORT SESSIONS - Admin only access (own sessions)
CREATE POLICY "Admins can manage their own import sessions"
  ON invoice_import_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
    AND user_id = auth.uid()
  );

-- Alternative policy for admins to view all sessions (for debugging)
CREATE POLICY "Admins can view all import sessions"
  ON invoice_import_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- =============================================
-- STORAGE POLICIES (for invoice file uploads)
-- =============================================

-- Create storage bucket for invoice files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for invoice file uploads - Admin only
CREATE POLICY "Admins can upload invoice files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoices'
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Storage policy for invoice file access - Admin only
CREATE POLICY "Admins can access invoice files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'invoices'
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Storage policy for invoice file updates - Admin only
CREATE POLICY "Admins can update invoice files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'invoices'
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Storage policy for invoice file deletion - Admin only
CREATE POLICY "Admins can delete invoice files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'invoices'
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- =============================================
-- GRANT PERMISSIONS TO SERVICE ROLE
-- =============================================

-- Grant service role access for server-side operations
GRANT ALL ON invoices TO service_role;
GRANT ALL ON invoice_items TO service_role;
GRANT ALL ON order_invoice_matches TO service_role;
GRANT ALL ON supplier_invoice_templates TO service_role;
GRANT ALL ON invoice_import_sessions TO service_role;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =============================================
-- UTILITY FUNCTIONS FOR RLS
-- =============================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current admin user ID
CREATE OR REPLACE FUNCTION get_admin_user_id()
RETURNS UUID AS $$
BEGIN
  IF is_admin() THEN
    RETURN auth.uid();
  ELSE
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON POLICY "Admins can manage invoices" ON invoices 
IS 'Only admin users can create, read, update, and delete invoices';

COMMENT ON POLICY "Admins can manage invoice items" ON invoice_items 
IS 'Only admin users can manage parsed invoice line items';

COMMENT ON POLICY "Admins can manage order invoice matches" ON order_invoice_matches 
IS 'Only admin users can manage invoice-to-order matching data';

COMMENT ON POLICY "Admins can manage supplier invoice templates" ON supplier_invoice_templates 
IS 'Only admin users can configure supplier-specific parsing templates';

COMMENT ON POLICY "Admins can manage their own import sessions" ON invoice_import_sessions 
IS 'Admin users can only manage their own import sessions';

COMMENT ON FUNCTION is_admin() 
IS 'Utility function to check if current user has admin privileges';

COMMENT ON FUNCTION get_admin_user_id() 
IS 'Returns current user ID if admin, otherwise raises exception';