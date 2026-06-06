-- 007_debug_sessions.sql
-- AI debugging history with soft-delete via retention window
-- Execution Order: 7th

DROP TABLE IF EXISTS public.debug_sessions CASCADE;

CREATE TABLE public.debug_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title             TEXT,
  prompt            TEXT NOT NULL,
  result            TEXT,
  action_type       debug_action_type NOT NULL,
  language          TEXT,
  files_count       INTEGER NOT NULL DEFAULT 0,
  credits_spent     INTEGER NOT NULL DEFAULT 1,
  model_used        TEXT,
  tokens_in         INTEGER,
  tokens_out        INTEGER,
  duration_ms       INTEGER,
  is_zero_knowledge BOOLEAN NOT NULL DEFAULT false,
  is_saved          BOOLEAN NOT NULL DEFAULT false,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sessions_user_id          ON public.debug_sessions(user_id);
CREATE INDEX idx_sessions_user_created     ON public.debug_sessions(user_id, created_at DESC);
CREATE INDEX idx_sessions_action_type      ON public.debug_sessions(user_id, action_type);
CREATE INDEX idx_sessions_tags             ON public.debug_sessions USING GIN(tags);

COMMENT ON TABLE public.debug_sessions IS 'AI debugging history with soft-delete via retention window';
