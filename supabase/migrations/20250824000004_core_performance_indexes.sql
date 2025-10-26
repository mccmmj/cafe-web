-- Performance optimization: Add indexes for core tables that definitely exist
-- This migration adds strategic indexes only for confirmed existing tables

-- Core orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_status_created ON public.orders(user_id, status, created_at DESC);

-- Core notifications table indexes  
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications(user_id, read, created_at DESC);

-- Core profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Performance comments
COMMENT ON INDEX idx_orders_user_id_created_at IS 'Optimizes user order history queries - most common query pattern';
COMMENT ON INDEX idx_notifications_user_read_created IS 'Optimizes notification dropdown and unread count queries';
COMMENT ON INDEX idx_orders_user_status_created IS 'Optimizes filtered user order queries with status';