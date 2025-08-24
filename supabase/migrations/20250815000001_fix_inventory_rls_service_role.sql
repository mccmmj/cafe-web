-- Fix RLS policies to allow service role operations for invoice import
-- This allows server-side API operations to create/update inventory items

-- Add service role policy for inventory_items
CREATE POLICY "Service role can manage inventory items" ON public.inventory_items 
  FOR ALL USING (auth.role() = 'service_role');

-- Add service role policy for suppliers  
CREATE POLICY "Service role can manage suppliers" ON public.suppliers 
  FOR ALL USING (auth.role() = 'service_role');

-- Add service role policy for stock_movements
CREATE POLICY "Service role can manage stock movements" ON public.stock_movements 
  FOR ALL USING (auth.role() = 'service_role');

-- Add service role policy for purchase_orders
CREATE POLICY "Service role can manage purchase orders" ON public.purchase_orders 
  FOR ALL USING (auth.role() = 'service_role');

-- Add service role policy for purchase_order_items
CREATE POLICY "Service role can manage purchase order items" ON public.purchase_order_items 
  FOR ALL USING (auth.role() = 'service_role');

-- Add service role policy for low_stock_alerts
CREATE POLICY "Service role can manage low stock alerts" ON public.low_stock_alerts 
  FOR ALL USING (auth.role() = 'service_role');

-- Add service role policy for recipe_ingredients
CREATE POLICY "Service role can manage recipe ingredients" ON public.recipe_ingredients 
  FOR ALL USING (auth.role() = 'service_role');