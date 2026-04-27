-- 004_credit_wallets.sql
-- Atomic balance storage
-- Execution Order: 4th

DROP TABLE IF EXISTS public.credit_wallets CASCADE;

CREATE TABLE public.credit_wallets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance     INTEGER NOT NULL DEFAULT 30 CHECK (balance >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_wallets_user_id ON public.credit_wallets(user_id);

COMMENT ON TABLE public.credit_wallets IS 'Atomic balance storage. One row per user. No negative balances.';
