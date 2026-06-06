-- 003_profiles.sql
-- Core user identity table
-- Execution Order: 3rd (after enums)

CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL UNIQUE,
  full_name             TEXT,
  username              TEXT UNIQUE CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  avatar_url            TEXT,
  plan_type             plan_type NOT NULL DEFAULT 'free',
  stripe_customer_id    TEXT UNIQUE,
  is_admin              BOOLEAN NOT NULL DEFAULT false,
  is_ambassador         BOOLEAN NOT NULL DEFAULT false,
  referral_code         TEXT UNIQUE DEFAULT encode(extensions.gen_random_bytes(6), 'hex'),
  zero_knowledge_mode   BOOLEAN NOT NULL DEFAULT false,
  last_login_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_profiles_referral_code    ON public.profiles(referral_code);
CREATE INDEX idx_profiles_stripe_customer  ON public.profiles(stripe_customer_id);
CREATE INDEX idx_profiles_plan_type        ON public.profiles(plan_type);
CREATE INDEX idx_profiles_username         ON public.profiles(username);

-- Comments
COMMENT ON TABLE public.profiles IS 'Extends auth.users with app-specific identity. Never store passwords here.';
COMMENT ON COLUMN public.profiles.referral_code IS 'Auto-generated unique referral code';
COMMENT ON COLUMN public.profiles.zero_knowledge_mode IS 'Opt-out of AI persistence for privacy';
