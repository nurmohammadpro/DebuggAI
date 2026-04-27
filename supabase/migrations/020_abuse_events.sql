-- 016_abuse_events.sql
-- Rate limit violations & suspicious activity
-- Execution Order: 16th

DROP TABLE IF EXISTS public.abuse_events CASCADE;

CREATE TABLE public.abuse_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address  INET,
  event_type  TEXT NOT NULL,
  endpoint    TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_abuse_user_id     ON public.abuse_events(user_id);
CREATE INDEX idx_abuse_created_at  ON public.abuse_events(created_at DESC);

COMMENT ON TABLE public.abuse_events IS 'Rate limit violations & suspicious activity';
