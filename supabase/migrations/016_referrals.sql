-- 012_referrals.sql
-- Tracks referral relationships
-- Execution Order: 12th

DROP TABLE IF EXISTS public.referrals CASCADE;

CREATE TABLE public.referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  referral_code   TEXT NOT NULL,
  status          referral_status NOT NULL DEFAULT 'pending',
  credits_awarded INTEGER NOT NULL DEFAULT 0,
  completed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_referrals_referrer  ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referee   ON public.referrals(referee_id);
CREATE INDEX idx_referrals_code      ON public.referrals(referral_code);

COMMENT ON TABLE public.referrals IS 'Tracks referral relationships';
