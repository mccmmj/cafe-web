-- Create notifications system for user notifications
-- This enables the bell icon functionality and order status updates

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error', 'order_status'
    read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url VARCHAR(500), -- Optional URL to navigate when notification is clicked
    data JSONB, -- Additional data for the notification (order_id, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Only authenticated users can insert notifications (admins will use service role)
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Service role can manage all notifications (for admin/system notifications)
CREATE POLICY "Service role can manage notifications" ON public.notifications
    FOR ALL USING (auth.role() = 'service_role');

-- Function to create order status notifications
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

    -- Insert notification
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
        '/orders',
        jsonb_build_object('order_id', p_order_id, 'order_number', p_order_number, 'status', p_status)
    ) RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.notifications
        WHERE user_id = p_user_id AND read = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.notifications
    SET read = TRUE
    WHERE user_id = p_user_id AND read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;