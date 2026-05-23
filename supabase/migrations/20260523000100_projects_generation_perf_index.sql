-- Improve dashboard/project listing performance for generation-backed queries.
-- This is especially important after larger AI-generated code payloads.

CREATE INDEX IF NOT EXISTS idx_generations_user_created_at
  ON public.generations(user_id, created_at DESC);
