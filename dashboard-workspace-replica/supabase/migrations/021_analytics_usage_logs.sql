-- 017_analytics_usage_logs.sql
-- DB-backed rate limiting (survives cold starts)
-- Execution Order: 17th

DROP TABLE IF EXISTS public.analytics_usage_logs CASCADE;

CREATE TABLE public.analytics_usage_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type  debug_action_type NOT NULL,
  ip_address   INET,
  credits_used INTEGER NOT NULL DEFAULT 1,
  model_used   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Critical index for rate limiting
CREATE INDEX idx_usage_rate_limit
  ON public.analytics_usage_logs(user_id, action_type, created_at DESC);

COMMENT ON TABLE public.analytics_usage_logs IS 'DB-backed rate limiting (survives cold starts)';
