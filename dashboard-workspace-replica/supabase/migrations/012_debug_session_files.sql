-- 008_debug_session_files.sql
-- Normalized file storage for multi-file debug sessions
-- Execution Order: 8th

DROP TABLE IF EXISTS public.debug_session_files CASCADE;

CREATE TABLE public.debug_session_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.debug_sessions(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  language        TEXT,
  content         TEXT NOT NULL,
  is_error_source BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_session_files_session ON public.debug_session_files(session_id);

COMMENT ON TABLE public.debug_session_files IS 'Normalized file storage for multi-file debug sessions';
