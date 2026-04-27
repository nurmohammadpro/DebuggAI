-- 021_realtime.sql
-- Realtime configuration for live updates
-- Execution Order: 21st (last)

-- Enable live updates for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debug_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.web_builder_sessions;
