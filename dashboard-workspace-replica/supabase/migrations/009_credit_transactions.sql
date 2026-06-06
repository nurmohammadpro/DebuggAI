-- 005_credit_transactions.sql
-- Immutable transaction ledger
-- Execution Order: 5th

DROP TABLE IF EXISTS public.credit_transactions CASCADE;

CREATE TABLE public.credit_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id   UUID NOT NULL REFERENCES public.credit_wallets(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,
  type        transaction_type NOT NULL,
  description TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_transactions_wallet_id    ON public.credit_transactions(wallet_id);
CREATE INDEX idx_transactions_created_at   ON public.credit_transactions(created_at DESC);
CREATE INDEX idx_transactions_type         ON public.credit_transactions(type);

COMMENT ON TABLE public.credit_transactions IS 'Immutable ledger. Never UPDATE or DELETE.';
