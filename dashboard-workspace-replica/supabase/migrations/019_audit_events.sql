-- 015_audit_events.sql
-- Immutable security & admin audit trail
-- Execution Order: 15th

DROP TABLE IF EXISTS public.audit_events CASCADE;

CREATE TABLE public.audit_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_id   UUID,
  target_type TEXT,
  ip_address  INET,
  user_agent  TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_audit_user_id     ON public.audit_events(user_id);
CREATE INDEX idx_audit_created_at  ON public.audit_events(created_at DESC);
CREATE INDEX idx_audit_action      ON public.audit_events(action);

COMMENT ON TABLE public.audit_events IS 'Immutable security & admin audit trail';
