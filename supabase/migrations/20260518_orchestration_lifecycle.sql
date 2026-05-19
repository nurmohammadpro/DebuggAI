-- ============================================================================
-- DeBuggAI Orchestration Lifecycle hardening
-- Migration: 20260516
-- Purpose:
-- - Add job timeout support
-- - Add dead-letter tracking
-- - Add cost_cents column to ai_usage_ledger for margin analytics
-- - Add retry tracking
-- ============================================================================

-- Add timeout seconds to jobs (default 300s = 5 min)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'timeout_seconds'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN timeout_seconds INTEGER NOT NULL DEFAULT 300;
  END IF;
END $$;

-- Add dead-letter reason column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'dlq_reason'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN dlq_reason TEXT;
  END IF;
END $$;

-- Add cost_cents to ai_usage_ledger (if not already present)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_usage_ledger' AND column_name = 'cost_cents'
  ) THEN
    ALTER TABLE public.ai_usage_ledger ADD COLUMN cost_cents INTEGER;
  END IF;
END $$;

-- Dead-letter view: jobs that exhausted attempts or timed out
CREATE OR REPLACE VIEW public.dead_letter_jobs AS
SELECT
  j.*,
  r.objective AS run_objective,
  r.user_id
FROM public.jobs j
JOIN public.runs r ON r.id = j.run_id
WHERE j.status = 'failed'
  AND (
    j.attempts >= j.max_attempts
    OR (j.locked_until IS NOT NULL AND j.locked_until < now())
  );

-- Index for timeout detection
CREATE INDEX IF NOT EXISTS idx_jobs_locked_until
  ON public.jobs(locked_until, status)
  WHERE locked_until IS NOT NULL AND status IN ('leased', 'running');

-- Function: reap timed-out jobs (call periodically via pg_cron or edge function)
CREATE OR REPLACE FUNCTION public.reap_timed_out_jobs(p_grace_seconds INTEGER DEFAULT 30)
RETURNS SETOF public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH reaped AS (
    UPDATE public.jobs j
    SET status = 'failed',
        last_error = COALESCE(j.last_error, 'Job timed out'),
        dlq_reason = 'timeout',
        locked_until = NULL,
        updated_at = now()
    WHERE j.status IN ('leased', 'running')
      AND j.locked_until IS NOT NULL
      AND j.locked_until + make_interval(secs => p_grace_seconds) < now()
    RETURNING j.*
  )
  SELECT * FROM reaped;
END;
$$;

-- Function: daily credit usage aggregation
CREATE OR REPLACE FUNCTION public.get_daily_credit_usage(p_days INTEGER DEFAULT 30)
RETURNS TABLE (date TEXT, credits BIGINT, cost NUMERIC)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    to_char(created_at, 'YYYY-MM-DD') AS date,
    SUM(credits_charged)::BIGINT AS credits,
    COALESCE(SUM(cost_usd), 0) AS cost
  FROM public.ai_usage_ledger
  WHERE created_at >= now() - make_interval(days => p_days)
  GROUP BY to_char(created_at, 'YYYY-MM-DD')
  ORDER BY date ASC;
$$;

-- Function: finalize stale runs (all jobs terminal but run still running)
CREATE OR REPLACE FUNCTION public.finalize_stale_runs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  finalized_count INTEGER := 0;
BEGIN
  -- Find runs whose jobs are all terminal (succeeded/failed/canceled) but run is still running
  WITH terminal_runs AS (
    SELECT r.id,
           CASE
             WHEN COUNT(j.id) FILTER (WHERE j.status = 'failed') > 0 THEN 'failed'
             WHEN COUNT(j.id) FILTER (WHERE j.status = 'canceled') > 0 THEN 'canceled'
             ELSE 'succeeded'
           END AS final_status
    FROM public.runs r
    JOIN public.jobs j ON j.run_id = r.id
    WHERE r.status IN ('queued', 'running')
      AND r.started_at IS NOT NULL
      AND r.started_at < now() - interval '5 minutes'
    GROUP BY r.id
    HAVING COUNT(j.id) > 0
       AND COUNT(j.id) FILTER (WHERE j.status NOT IN ('succeeded', 'failed', 'canceled')) = 0
  )
  UPDATE public.runs r
  SET status = tr.final_status,
      error = CASE WHEN tr.final_status = 'failed'
        THEN COALESCE(r.error, 'A job in this run failed')
        ELSE r.error END,
      ended_at = now(),
      updated_at = now()
  FROM terminal_runs tr
  WHERE r.id = tr.id;

  GET DIAGNOSTICS finalized_count = ROW_COUNT;
  RETURN finalized_count;
END;
$$;

-- Throttle config table: persisted rate-limit rules, AI model config, security toggles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'throttle_config') THEN
    CREATE TABLE public.throttle_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Seed default configs
    INSERT INTO public.throttle_config (key, value, category) VALUES
      ('rate_limit_per_minute', '30', 'rate_limit'),
      ('rate_limit_per_hour', '500', 'rate_limit'),
      ('ai_model_default', 'llama-3.3-70b-versatile', 'ai'),
      ('ai_model_fallback', 'llama-3.1-8b-instant', 'ai'),
      ('ai_max_tokens', '4096', 'ai'),
      ('ai_temperature', '0.7', 'ai'),
      ('sandbox_enabled', 'true', 'security'),
      ('zero_knowledge_enabled', 'true', 'security'),
      ('github_oauth_enabled', 'true', 'integrations'),
      ('max_job_attempts', '3', 'jobs'),
      ('job_default_timeout_seconds', '300', 'jobs')
    ON CONFLICT (key) DO NOTHING;

    -- Enable RLS
    ALTER TABLE public.throttle_config ENABLE ROW LEVEL SECURITY;

    -- Admin-only access
    CREATE POLICY "Admin full access" ON public.throttle_config
      FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.is_admin = true
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.is_admin = true
      ));

    -- Allow read for authenticated users (non-sensitive keys only)
    CREATE POLICY "Users can read non-sensitive" ON public.throttle_config
      FOR SELECT TO authenticated
      USING (category NOT IN ('security', 'jobs'));
  END IF;
END $$;
