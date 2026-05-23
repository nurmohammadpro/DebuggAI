-- Optimize thread listing by matching the dashboard query pattern:
-- WHERE user_id = ? ORDER BY updated_at DESC

CREATE INDEX IF NOT EXISTS idx_threads_user_updated_at
  ON public.threads(user_id, updated_at DESC);
