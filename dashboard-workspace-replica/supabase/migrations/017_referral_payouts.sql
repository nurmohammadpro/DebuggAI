-- 013_referral_payouts.sql
-- Monthly ambassador commission batches
-- Execution Order: 13th

DROP TABLE IF EXISTS public.referral_payouts CASCADE;

CREATE TABLE public.referral_payouts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_usd          NUMERIC(10,2) NOT NULL CHECK (amount_usd > 0),
  period_month        DATE NOT NULL,
  referral_count      INTEGER NOT NULL DEFAULT 0,
  status              payout_status NOT NULL DEFAULT 'pending',
  stripe_transfer_id  TEXT,
  approved_by         UUID REFERENCES public.profiles(id),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at             TIMESTAMPTZ,
  UNIQUE (user_id, period_month)
);

COMMENT ON TABLE public.referral_payouts IS 'Monthly ambassador commission batches';
