-- ============================================================================
-- Scoped Job Leasing Helpers
-- Migration: 20260516 (follow-up)
-- Purpose:
-- - Allow workers to lease jobs *scoped to a single run* (multi-tenant safe)
-- - Keep execution restricted to service_role
-- ============================================================================

CREATE OR REPLACE FUNCTION public.lease_jobs_for_run(
  p_worker_id TEXT,
  p_run_id UUID,
  p_limit INTEGER DEFAULT 5,
  p_lease_seconds INTEGER DEFAULT 60
)
RETURNS SETOF public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT j.id
    FROM public.jobs j
    WHERE j.run_id = p_run_id
      AND j.status = 'queued'
      AND j.available_at <= now()
    ORDER BY j.priority ASC, j.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(p_limit, 50))
  )
  UPDATE public.jobs j
  SET status = 'leased',
      locked_by = p_worker_id,
      locked_until = now() + make_interval(secs => GREATEST(5, LEAST(p_lease_seconds, 3600))),
      attempts = attempts + 1,
      updated_at = now()
  WHERE j.id IN (SELECT id FROM picked)
  RETURNING j.*;
END;
$$
;

REVOKE ALL ON FUNCTION public.lease_jobs_for_run(TEXT, UUID, INTEGER, INTEGER) FROM PUBLIC
;

GRANT EXECUTE ON FUNCTION public.lease_jobs_for_run(TEXT, UUID, INTEGER, INTEGER) TO service_role
;
