-- 010_web_builder_versions.sql
-- Immutable version history (Git-like commits for UI)
-- Execution Order: 10th

DROP TABLE IF EXISTS public.web_builder_versions CASCADE;

CREATE TABLE public.web_builder_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES public.web_builder_sessions(id) ON DELETE CASCADE,
  version_number    INTEGER NOT NULL,
  commit_message    TEXT,
  code_snapshot     TEXT NOT NULL,
  html_snapshot     TEXT,
  preview_image_url TEXT,
  prompt_used       TEXT,
  model_used        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, version_number)
);

-- Indexes
CREATE INDEX idx_wb_versions_session ON public.web_builder_versions(session_id, version_number DESC);

COMMENT ON TABLE public.web_builder_versions IS 'Immutable version history (Git-like commits for UI)';
