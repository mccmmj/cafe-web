-- Fix notification action URLs to point to individual order details
-- This migration updates the create_order_notification function to use the proper order details URL

CREATE OR REPLACE FUNCTION create_order_notification(
    p_user_id UUID,
    p_order_id UUID,
    p_status VARCHAR(50),
    p_order_number VARCHAR(50)
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    notification_title VARCHAR(255);
    notification_message TEXT;
BEGIN
    -- Set title and message based on order status
    CASE p_status
        WHEN 'confirmed' THEN
            notification_title := 'Order Confirmed';
            notification_message := 'Your order #' || p_order_number || ' has been confirmed and is being prepared.';
        WHEN 'preparing' THEN
            notification_title := 'Order Being Prepared';
            notification_message := 'Your order #' || p_order_number || ' is currently being prepared.';
        WHEN 'ready' THEN
            notification_title := 'Order Ready';
            notification_message := 'Your order #' || p_order_number || ' is ready for pickup!';
        WHEN 'completed' THEN
            notification_title := 'Order Complete';
            notification_message := 'Thank you! Your order #' || p_order_number || ' has been completed.';
        WHEN 'cancelled' THEN
            notification_title := 'Order Cancelled';
            notification_message := 'Your order #' || p_order_number || ' has been cancelled.';
        ELSE
            notification_title := 'Order Update';
            notification_message := 'Your order #' || p_order_number || ' status has been updated to ' || p_status || '.';
    END CASE;

    -- Insert notification with proper action URL pointing to individual order details
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        action_url,
        data
    ) VALUES (
        p_user_id,
        notification_title,
        notification_message,
        'order_status',
        '/orders/' || p_order_id::TEXT,  -- Fixed: Point to individual order details page
        jsonb_build_object('order_id', p_order_id, 'order_number', p_order_number, 'status', p_status)
    ) RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;