-- Update existing notifications to have proper action URLs pointing to individual order details
-- This fixes notifications created before we updated the create_order_notification function

UPDATE public.notifications 
SET action_url = '/orders/' || (data->>'order_id')::TEXT
WHERE 
    type = 'order_status' 
    AND action_url = '/orders'
    AND data ? 'order_id'
    AND data->>'order_id' IS NOT NULL;