-- Webhook Events Tracking Table
-- Stores all webhook events for audit trail and duplicate prevention

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid default gen_random_uuid() primary key,
  event_id text not null unique,
  event_type text not null,
  merchant_id text,
  event_data jsonb not null,
  sync_result jsonb,
  processed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON public.webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_merchant ON public.webhook_events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON public.webhook_events(processed_at desc);

-- Enable Row Level Security
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admin access
CREATE POLICY "Admin can manage webhook events" ON public.webhook_events 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Add table comment
COMMENT ON TABLE public.webhook_events IS 'Stores webhook events from Square and other services for audit trail and duplicate prevention';