-- ============================================================================
-- DeBuggAI AI Orchestration - RLS policy completion
-- Migration: 20260516 (follow-up)
-- Purpose:
-- - Add missing INSERT/UPDATE policies for run_steps/tool_calls/jobs/artifacts/usage
--   so application endpoints can write as the authenticated user.
-- ============================================================================

-- run_steps: writable by run owner
ALTER TABLE public.run_steps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'run_steps_insert_run_owner') THEN
    CREATE POLICY run_steps_insert_run_owner ON public.run_steps
      FOR INSERT WITH CHECK (
        run_id IN (SELECT r.id FROM public.runs r WHERE r.user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'run_steps_update_run_owner') THEN
    CREATE POLICY run_steps_update_run_owner ON public.run_steps
      FOR UPDATE USING (
        run_id IN (SELECT r.id FROM public.runs r WHERE r.user_id = auth.uid())
      );
  END IF;
END $$;

-- tool_calls: writable by run owner (via step -> run)
ALTER TABLE public.tool_calls ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tool_calls_insert_run_owner') THEN
    CREATE POLICY tool_calls_insert_run_owner ON public.tool_calls
      FOR INSERT WITH CHECK (
        run_step_id IN (
          SELECT s.id FROM public.run_steps s
          JOIN public.runs r ON r.id = s.run_id
          WHERE r.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tool_calls_update_run_owner') THEN
    CREATE POLICY tool_calls_update_run_owner ON public.tool_calls
      FOR UPDATE USING (
        run_step_id IN (
          SELECT s.id FROM public.run_steps s
          JOIN public.runs r ON r.id = s.run_id
          WHERE r.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- artifacts: writable by run owner
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'artifacts_insert_run_owner') THEN
    CREATE POLICY artifacts_insert_run_owner ON public.artifacts
      FOR INSERT WITH CHECK (
        run_id IN (SELECT r.id FROM public.runs r WHERE r.user_id = auth.uid())
      );
  END IF;
END $$;

-- jobs: allow inserting jobs for own runs; (leasing/execution should be service role later)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'jobs_insert_run_owner') THEN
    CREATE POLICY jobs_insert_run_owner ON public.jobs
      FOR INSERT WITH CHECK (
        run_id IN (SELECT r.id FROM public.runs r WHERE r.user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'jobs_select_run_owner') THEN
    CREATE POLICY jobs_select_run_owner ON public.jobs
      FOR SELECT USING (
        run_id IN (SELECT r.id FROM public.runs r WHERE r.user_id = auth.uid())
      );
  END IF;
END $$;

-- ai_usage_ledger: allow inserting for self
ALTER TABLE public.ai_usage_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_usage_insert_own') THEN
    CREATE POLICY ai_usage_insert_own ON public.ai_usage_ledger
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

