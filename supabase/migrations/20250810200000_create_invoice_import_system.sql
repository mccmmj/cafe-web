-- Invoice Import System Migration
-- Creates tables for AI-powered invoice processing and order matching

-- =============================================
-- ENSURE PROFILES TABLE HAS ROLE COLUMN
-- =============================================

-- Add role column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'customer' CHECK (role IN ('customer', 'admin'));

-- =============================================
-- INVOICES TABLE
-- =============================================
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- File storage
  file_url TEXT, -- URL to stored invoice file (PDF/image)
  file_name VARCHAR(255),
  file_size INTEGER,
  file_type VARCHAR(50), -- 'pdf', 'png', 'jpg', etc.
  
  -- Processing status
  status VARCHAR(20) NOT NULL DEFAULT 'uploaded', 
  -- Status values: 'uploaded', 'parsing', 'parsed', 'reviewing', 'matched', 'confirmed', 'error'
  
  -- AI parsing results
  parsed_data JSONB, -- Raw extracted data from AI
  parsing_confidence DECIMAL(3,2) DEFAULT 0, -- 0-1 confidence score
  parsing_error TEXT, -- Error message if parsing failed
  
  -- Processing metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE(supplier_id, invoice_number),
  CHECK (parsing_confidence >= 0 AND parsing_confidence <= 1),
  CHECK (status IN ('uploaded', 'parsing', 'parsed', 'reviewing', 'matched', 'confirmed', 'error'))
);

-- =============================================
-- INVOICE ITEMS TABLE (parsed line items)
-- =============================================
CREATE TABLE invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Parsed item data
  line_number INTEGER NOT NULL, -- Line position in invoice
  item_description TEXT NOT NULL,
  supplier_item_code VARCHAR(100), -- SKU/UPC/item code from supplier
  
  -- Quantities and pricing
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,4) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  
  -- Package handling
  package_size VARCHAR(50), -- "12x", "24x", "case", "each", etc.
  unit_type VARCHAR(50), -- "each", "lb", "oz", "case", etc.
  units_per_package INTEGER DEFAULT 1, -- For conversion calculations
  
  -- Matching results
  matched_item_id UUID REFERENCES inventory_items(id),
  match_confidence DECIMAL(3,2) DEFAULT 0, -- 0-1 confidence score
  match_method VARCHAR(50), -- 'exact', 'fuzzy', 'manual', 'sku', 'ai'
  
  -- Status and review
  is_reviewed BOOLEAN DEFAULT FALSE,
  review_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (match_confidence >= 0 AND match_confidence <= 1),
  CHECK (quantity > 0),
  CHECK (unit_price >= 0),
  CHECK (units_per_package > 0)
);

-- =============================================
-- ORDER INVOICE MATCHES TABLE
-- =============================================
CREATE TABLE order_invoice_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Matching metadata
  match_confidence DECIMAL(3,2) NOT NULL DEFAULT 0, -- 0-1 overall match confidence
  match_method VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'auto', 'manual', 'ai'
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Status values: 'pending', 'reviewing', 'confirmed', 'rejected'
  
  -- Variance tracking
  quantity_variance DECIMAL(10,3) DEFAULT 0, -- Difference in total quantities
  amount_variance DECIMAL(10,2) DEFAULT 0, -- Difference in total amounts
  variance_notes TEXT,
  
  -- Review and approval
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(purchase_order_id, invoice_id),
  CHECK (match_confidence >= 0 AND match_confidence <= 1),
  CHECK (status IN ('pending', 'reviewing', 'confirmed', 'rejected'))
);

-- =============================================
-- SUPPLIER INVOICE TEMPLATES TABLE
-- =============================================
CREATE TABLE supplier_invoice_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Template metadata
  template_name VARCHAR(100) NOT NULL,
  template_version VARCHAR(20) DEFAULT '1.0',
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Parsing configuration
  format_config JSONB NOT NULL DEFAULT '{}', -- AI parsing instructions
  parsing_rules JSONB NOT NULL DEFAULT '{}', -- Field extraction rules
  package_mappings JSONB NOT NULL DEFAULT '{}', -- Package size mappings
  
  -- Item matching rules
  item_matching_rules JSONB NOT NULL DEFAULT '{}', -- Custom matching logic
  default_unit_conversions JSONB NOT NULL DEFAULT '{}', -- Unit conversions
  
  -- Template usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  success_rate DECIMAL(3,2) DEFAULT 0, -- Template effectiveness
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE(supplier_id, template_name),
  CHECK (success_rate >= 0 AND success_rate <= 1)
);

-- =============================================
-- INVOICE IMPORT SESSIONS TABLE
-- =============================================
CREATE TABLE invoice_import_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session status
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  -- Status values: 'active', 'completed', 'abandoned', 'error'
  
  -- Review process data
  review_data JSONB NOT NULL DEFAULT '{}', -- User decisions and modifications
  step_progress INTEGER DEFAULT 0, -- Current step in import process
  total_steps INTEGER DEFAULT 5, -- Total steps in process
  
  -- Timing information
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Session metadata
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (status IN ('active', 'completed', 'abandoned', 'error')),
  CHECK (step_progress >= 0 AND step_progress <= total_steps)
);

-- =============================================
-- INDEXES
-- =============================================

-- Invoices indexes
CREATE INDEX idx_invoices_supplier_id ON invoices(supplier_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

-- Invoice items indexes
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_matched_item_id ON invoice_items(matched_item_id);
CREATE INDEX idx_invoice_items_supplier_item_code ON invoice_items(supplier_item_code);
CREATE INDEX idx_invoice_items_match_confidence ON invoice_items(match_confidence);

-- Order invoice matches indexes
CREATE INDEX idx_order_invoice_matches_purchase_order_id ON order_invoice_matches(purchase_order_id);
CREATE INDEX idx_order_invoice_matches_invoice_id ON order_invoice_matches(invoice_id);
CREATE INDEX idx_order_invoice_matches_status ON order_invoice_matches(status);
CREATE INDEX idx_order_invoice_matches_created_at ON order_invoice_matches(created_at);

-- Supplier templates indexes
CREATE INDEX idx_supplier_invoice_templates_supplier_id ON supplier_invoice_templates(supplier_id);
CREATE INDEX idx_supplier_invoice_templates_is_active ON supplier_invoice_templates(is_active);

-- Import sessions indexes
CREATE INDEX idx_invoice_import_sessions_invoice_id ON invoice_import_sessions(invoice_id);
CREATE INDEX idx_invoice_import_sessions_user_id ON invoice_import_sessions(user_id);
CREATE INDEX idx_invoice_import_sessions_status ON invoice_import_sessions(status);
CREATE INDEX idx_invoice_import_sessions_created_at ON invoice_import_sessions(created_at);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_items_updated_at BEFORE UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_order_invoice_matches_updated_at BEFORE UPDATE ON order_invoice_matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supplier_invoice_templates_updated_at BEFORE UPDATE ON supplier_invoice_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_import_sessions_updated_at BEFORE UPDATE ON invoice_import_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_total(invoice_uuid UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(total_price), 0)
  INTO total
  FROM invoice_items
  WHERE invoice_id = invoice_uuid;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Function to update invoice status based on processing
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-transition to 'parsed' when parsing completes successfully
  IF NEW.parsed_data IS NOT NULL AND NEW.parsing_confidence > 0 AND OLD.status = 'parsing' THEN
    NEW.status = 'parsed';
    NEW.processed_at = NOW();
  END IF;
  
  -- Auto-calculate total from line items if not set
  IF NEW.total_amount = 0 THEN
    NEW.total_amount = calculate_invoice_total(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_status_trigger
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE invoices IS 'Stores uploaded supplier invoices and AI parsing results';
COMMENT ON TABLE invoice_items IS 'Individual line items parsed from invoices with matching data';
COMMENT ON TABLE order_invoice_matches IS 'Links invoices to purchase orders with confidence scoring';
COMMENT ON TABLE supplier_invoice_templates IS 'AI parsing templates customized per supplier';
COMMENT ON TABLE invoice_import_sessions IS 'Tracks user import sessions and review progress';

COMMENT ON COLUMN invoices.parsed_data IS 'Raw JSON data extracted by AI parsing';
COMMENT ON COLUMN invoices.parsing_confidence IS 'Overall confidence in AI parsing accuracy (0-1)';
COMMENT ON COLUMN invoice_items.match_confidence IS 'Confidence in item matching to inventory (0-1)';
COMMENT ON COLUMN invoice_items.units_per_package IS 'Number of units in package (for case conversion)';
COMMENT ON COLUMN order_invoice_matches.quantity_variance IS 'Difference between ordered and invoiced quantities';
COMMENT ON COLUMN supplier_invoice_templates.format_config IS 'AI prompt configuration for this supplier';