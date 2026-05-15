-- ============================================================================
-- DeBuggAI AI Orchestration (Threads, Runs, Steps, Jobs, Usage Ledger)
-- Migration: 20260516
-- Purpose:
-- - Add first-class thread/run/step data model (Codex/v0-style)
-- - Enable multi-agent execution via a DB-backed job queue with leasing
-- - Make credit spending atomic + idempotent
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------------
-- Enums
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'run_status') THEN
    CREATE TYPE public.run_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'canceled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'step_status') THEN
    CREATE TYPE public.step_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'skipped');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE public.job_status AS ENUM ('queued', 'leased', 'running', 'succeeded', 'failed', 'canceled');
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Threads
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.threads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  project_id   UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title        TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threads_user_created
  ON public.threads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_project_created
  ON public.threads(project_id, created_at DESC) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_threads_workspace_created
  ON public.threads(workspace_id, created_at DESC) WHERE workspace_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- Thread Messages (scoped chat history)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.thread_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id  UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content    TEXT NOT NULL,
  model      TEXT,
  tokens_in  INTEGER,
  tokens_out INTEGER,
  metadata   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_created
  ON public.thread_messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_thread_messages_user_created
  ON public.thread_messages(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- Runs (one user objective -> many steps)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id        UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status           public.run_status NOT NULL DEFAULT 'queued',
  objective        TEXT,
  idempotency_key  TEXT,
  error            TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_runs_thread_created
  ON public.runs(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_user_created
  ON public.runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_status
  ON public.runs(status, created_at DESC);

-- --------------------------------------------------------------------------
-- Run Steps (agent-level actions)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.run_steps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL DEFAULT 0,
  kind       TEXT NOT NULL, -- e.g. 'plan', 'llm', 'tool', 'patch', 'verify'
  agent_name TEXT NOT NULL DEFAULT 'primary',
  status     public.step_status NOT NULL DEFAULT 'queued',
  input      JSONB NOT NULL DEFAULT '{}'::jsonb,
  output     JSONB NOT NULL DEFAULT '{}'::jsonb,
  error      TEXT,
  started_at TIMESTAMPTZ,
  ended_at   TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(run_id, step_index)
);

CREATE INDEX IF NOT EXISTS idx_run_steps_run
  ON public.run_steps(run_id, step_index ASC);
CREATE INDEX IF NOT EXISTS idx_run_steps_status
  ON public.run_steps(status, created_at DESC);

-- --------------------------------------------------------------------------
-- Tool Calls (optional, but useful for tracing multi-agent work)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tool_calls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_step_id UUID NOT NULL REFERENCES public.run_steps(id) ON DELETE CASCADE,
  tool_name   TEXT NOT NULL,
  status      public.step_status NOT NULL DEFAULT 'queued',
  input       JSONB NOT NULL DEFAULT '{}'::jsonb,
  output      JSONB NOT NULL DEFAULT '{}'::jsonb,
  error       TEXT,
  started_at  TIMESTAMPTZ,
  ended_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_step
  ON public.tool_calls(run_step_id, created_at ASC);

-- --------------------------------------------------------------------------
-- Artifacts (store pointers; large payloads should live in Storage)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.artifacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL, -- e.g. 'zip', 'diff', 'report', 'preview'
  storage_path TEXT,
  content      TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artifacts_run_created
  ON public.artifacts(run_id, created_at DESC);

-- --------------------------------------------------------------------------
-- Jobs (DB-backed queue with leasing; enables multiple agents/workers)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  run_step_id   UUID REFERENCES public.run_steps(id) ON DELETE CASCADE,
  queue         TEXT NOT NULL DEFAULT 'default',
  priority      INTEGER NOT NULL DEFAULT 100,
  status        public.job_status NOT NULL DEFAULT 'queued',
  available_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_by     TEXT,
  locked_until  TIMESTAMPTZ,
  attempts      INTEGER NOT NULL DEFAULT 0,
  max_attempts  INTEGER NOT NULL DEFAULT 3,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_pickup
  ON public.jobs(status, queue, priority, available_at, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_run
  ON public.jobs(run_id, created_at DESC);

-- --------------------------------------------------------------------------
-- AI Usage Ledger (margin/analytics)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  run_id          UUID REFERENCES public.runs(id) ON DELETE SET NULL,
  model           TEXT,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  cost_usd        NUMERIC(12,6),
  credits_charged INTEGER NOT NULL DEFAULT 0,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created
  ON public.ai_usage_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_run_created
  ON public.ai_usage_ledger(run_id, created_at DESC) WHERE run_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- Idempotent, atomic credit spending
-- - Requires: credit_wallets(user_id unique), credit_transactions immutable ledger
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_idempotency_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  tx_id           UUID REFERENCES public.credit_transactions(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, idempotency_key)
);

CREATE OR REPLACE FUNCTION public.spend_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_source TEXT,
  p_description TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (wallet_id UUID, new_balance INTEGER, tx_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance INTEGER;
  v_tx_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be > 0';
  END IF;

  -- If an idempotency key is provided, short-circuit on repeats.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT cik.tx_id INTO v_tx_id
    FROM public.credit_idempotency_keys cik
    WHERE cik.user_id = p_user_id AND cik.idempotency_key = p_idempotency_key;

    IF v_tx_id IS NOT NULL THEN
      SELECT cw.id, cw.balance INTO v_wallet_id, v_balance
      FROM public.credit_wallets cw
      WHERE cw.user_id = p_user_id;

      RETURN QUERY SELECT v_wallet_id, v_balance, v_tx_id;
      RETURN;
    END IF;
  END IF;

  -- Lock wallet row for atomic spend (create if missing).
  INSERT INTO public.credit_wallets (user_id, balance)
  VALUES (p_user_id, 30)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM public.credit_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'wallet not found';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient credits';
  END IF;

  UPDATE public.credit_wallets
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_balance;

  INSERT INTO public.credit_transactions (wallet_id, amount, type, description, metadata)
  VALUES (
    v_wallet_id,
    -p_amount,
    'credit_spent',
    p_description,
    jsonb_build_object('source', p_source) || COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_tx_id;

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.credit_idempotency_keys (user_id, idempotency_key, tx_id)
    VALUES (p_user_id, p_idempotency_key, v_tx_id)
    ON CONFLICT (user_id, idempotency_key) DO UPDATE SET tx_id = EXCLUDED.tx_id;
  END IF;

  RETURN QUERY SELECT v_wallet_id, v_balance, v_tx_id;
END;
$$;

-- --------------------------------------------------------------------------
-- Job leasing helper: lease up to N jobs (SKIP LOCKED)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lease_jobs(
  p_worker_id TEXT,
  p_queue TEXT DEFAULT 'default',
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
    WHERE j.queue = p_queue
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
$$;

-- --------------------------------------------------------------------------
-- RLS
-- --------------------------------------------------------------------------
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Threads: owner, or workspace members if workspace_id is set.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'threads_select_member') THEN
    CREATE POLICY threads_select_member ON public.threads
      FOR SELECT USING (
        user_id = auth.uid()
        OR (
          workspace_id IS NOT NULL
          AND workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'threads_insert_own') THEN
    CREATE POLICY threads_insert_own ON public.threads
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'threads_update_member') THEN
    CREATE POLICY threads_update_member ON public.threads
      FOR UPDATE USING (
        user_id = auth.uid()
        OR (
          workspace_id IS NOT NULL
          AND workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
        )
      );
  END IF;
END $$;

-- Thread messages: must belong to a visible thread
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'thread_messages_select_thread') THEN
    CREATE POLICY thread_messages_select_thread ON public.thread_messages
      FOR SELECT USING (
        thread_id IN (
          SELECT t.id FROM public.threads t
          WHERE t.user_id = auth.uid()
             OR (t.workspace_id IS NOT NULL AND t.workspace_id IN (
                SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
             ))
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'thread_messages_insert_thread') THEN
    CREATE POLICY thread_messages_insert_thread ON public.thread_messages
      FOR INSERT WITH CHECK (
        thread_id IN (
          SELECT t.id FROM public.threads t
          WHERE t.user_id = auth.uid()
             OR (t.workspace_id IS NOT NULL AND t.workspace_id IN (
                SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
             ))
        )
      );
  END IF;
END $$;

-- Runs: must belong to a visible thread
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'runs_select_thread') THEN
    CREATE POLICY runs_select_thread ON public.runs
      FOR SELECT USING (
        thread_id IN (
          SELECT t.id FROM public.threads t
          WHERE t.user_id = auth.uid()
             OR (t.workspace_id IS NOT NULL AND t.workspace_id IN (
                SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
             ))
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'runs_insert_own') THEN
    CREATE POLICY runs_insert_own ON public.runs
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Steps/tool_calls/artifacts/jobs/ai_usage: readable through run ownership (minimal)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'run_steps_select_run') THEN
    CREATE POLICY run_steps_select_run ON public.run_steps
      FOR SELECT USING (
        run_id IN (SELECT r.id FROM public.runs r WHERE r.user_id = auth.uid())
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tool_calls_select_step') THEN
    CREATE POLICY tool_calls_select_step ON public.tool_calls
      FOR SELECT USING (
        run_step_id IN (SELECT s.id FROM public.run_steps s JOIN public.runs r ON r.id = s.run_id WHERE r.user_id = auth.uid())
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'artifacts_select_run') THEN
    CREATE POLICY artifacts_select_run ON public.artifacts
      FOR SELECT USING (
        run_id IN (SELECT r.id FROM public.runs r WHERE r.user_id = auth.uid())
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_usage_select_own') THEN
    CREATE POLICY ai_usage_select_own ON public.ai_usage_ledger
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;
