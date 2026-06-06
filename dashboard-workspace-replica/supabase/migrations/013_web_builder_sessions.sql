-- 009_web_builder_sessions.sql
-- Core session state for the visual builder
-- Execution Order: 9th

DROP TABLE IF EXISTS public.web_builder_sessions CASCADE;

CREATE TABLE public.web_builder_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT 'Untitled Project',
  description     TEXT,
  messages        JSONB NOT NULL DEFAULT '[]',
  generated_html  TEXT,
  generated_code  TEXT,
  stack           TEXT DEFAULT 'react',
  template_id     UUID,
  is_public       BOOLEAN NOT NULL DEFAULT false,
  forked_from     UUID REFERENCES public.web_builder_sessions(id) ON DELETE SET NULL,
  view_count      INTEGER NOT NULL DEFAULT 0,
  credits_spent   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_wb_user_id        ON public.web_builder_sessions(user_id);
CREATE INDEX idx_wb_public         ON public.web_builder_sessions(is_public) WHERE is_public = true;
CREATE INDEX idx_wb_created_at     ON public.web_builder_sessions(created_at DESC);
CREATE INDEX idx_wb_forked         ON public.web_builder_sessions(forked_from);

COMMENT ON TABLE public.web_builder_sessions IS 'Core session state for the visual builder';
