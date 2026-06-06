-- ============================================================================
-- AI Orchestration updated_at triggers
-- Migration: 20260516 (follow-up)
-- Purpose:
-- - Ensure updated_at stays accurate on orchestration tables
-- Notes:
-- - Uses the shared public.update_updated_at() trigger function created earlier.
-- ============================================================================

DO $$
BEGIN
  -- threads.updated_at
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='threads')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_threads_updated_at') THEN
    CREATE TRIGGER trg_threads_updated_at
      BEFORE UPDATE ON public.threads
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  -- runs.updated_at
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='runs')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_runs_updated_at') THEN
    CREATE TRIGGER trg_runs_updated_at
      BEFORE UPDATE ON public.runs
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  -- jobs.updated_at
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='jobs')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_jobs_updated_at') THEN
    CREATE TRIGGER trg_jobs_updated_at
      BEFORE UPDATE ON public.jobs
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END;
$$
;
