-- ============================================================================
-- DeBuggAI Database Setup - Complete Migration Script
-- ============================================================================
-- Run this entire script in Supabase SQL Editor
-- https://supabase.com/dashboard/project/gaelygqwuzcoyduzedkm/sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ----------------------------------------------------------------------------
-- 2. ENUM TYPES
-- ----------------------------------------------------------------------------
DROP TYPE IF EXISTS public.plan_type CASCADE;
CREATE TYPE public.plan_type AS ENUM ('free', 'pro', 'team', 'business', 'enterprise');

DROP TYPE IF EXISTS public.transaction_type CASCADE;
CREATE TYPE public.transaction_type AS ENUM (
  'credit_added', 'credit_spent', 'subscription_reset',
  'referral_bonus', 'admin_adjustment', 'purchase'
);

DROP TYPE IF EXISTS public.referral_status CASCADE;
CREATE TYPE public.referral_status AS ENUM ('pending', 'completed', 'failed', 'expired');

DROP TYPE IF EXISTS public.payout_status CASCADE;
CREATE TYPE public.payout_status AS ENUM ('pending', 'approved', 'processing', 'paid', 'rejected');

DROP TYPE IF EXISTS public.debug_action_type CASCADE;
CREATE TYPE public.debug_action_type AS ENUM ('analyze', 'reverse', 'web_builder');

DROP TYPE IF EXISTS public.template_category CASCADE;
CREATE TYPE public.template_category AS ENUM ('landing_page', 'dashboard', 'ecommerce', 'auth', 'marketing', 'saas', 'portfolio');

-- ----------------------------------------------------------------------------
-- 3. PROFILES TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL UNIQUE,
  full_name             TEXT,
  username              TEXT UNIQUE CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  avatar_url            TEXT,
  plan_type             plan_type NOT NULL DEFAULT 'free',
  stripe_customer_id    TEXT UNIQUE,
  is_admin              BOOLEAN NOT NULL DEFAULT false,
  is_ambassador         BOOLEAN NOT NULL DEFAULT false,
  referral_code         TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  zero_knowledge_mode   BOOLEAN NOT NULL DEFAULT false,
  last_login_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_referral_code   ON public.profiles(referral_code);
CREATE INDEX idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
CREATE INDEX idx_profiles_plan_type       ON public.profiles(plan_type);
CREATE INDEX idx_profiles_username        ON public.profiles(username);

-- ----------------------------------------------------------------------------
-- 4. CREDIT WALLETS
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.credit_wallets CASCADE;
CREATE TABLE public.credit_wallets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance     INTEGER NOT NULL DEFAULT 30 CHECK (balance >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallets_user_id ON public.credit_wallets(user_id);

-- ----------------------------------------------------------------------------
-- 5. CREDIT TRANSACTIONS
-- ----------------------------------------------------------------------------
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

CREATE INDEX idx_transactions_wallet_id  ON public.credit_transactions(wallet_id);
CREATE INDEX idx_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX idx_transactions_type       ON public.credit_transactions(type);

-- ----------------------------------------------------------------------------
-- 6. SUBSCRIPTION PLANS
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.subscription_plans CASCADE;
CREATE TABLE public.subscription_plans (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               plan_type NOT NULL UNIQUE,
  stripe_price_id    TEXT UNIQUE,
  price_monthly      NUMERIC(8,2) NOT NULL DEFAULT 0,
  credits_per_month  INTEGER NOT NULL,
  history_days       INTEGER NOT NULL DEFAULT 30,
  features           JSONB NOT NULL DEFAULT '[]',
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.subscription_plans (name, price_monthly, credits_per_month, history_days, features)
VALUES
  ('free',       0,   30,    30,  '["analyze","reverse"]'::jsonb),
  ('pro',        9,   300,   365, '["analyze","reverse","web_builder","zero_knowledge","priority_ai"]'::jsonb),
  ('team',       99,  2500,  365, '["analyze","reverse","web_builder","zero_knowledge","priority_ai","team_dashboard","export"]'::jsonb),
  ('business',   299, 10000, 730, '["analyze","reverse","web_builder","zero_knowledge","priority_ai","team_dashboard","export","github","vercel","analytics"]'::jsonb),
  ('enterprise', 999, 40000, 730, '["analyze","reverse","web_builder","zero_knowledge","priority_ai","team_dashboard","export","github","vercel","analytics","admin_controls","sla","private_deployment"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. DEBUG SESSIONS
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.debug_sessions CASCADE;
CREATE TABLE public.debug_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title             TEXT,
  prompt            TEXT NOT NULL,
  result            TEXT,
  action_type       debug_action_type NOT NULL,
  language          TEXT,
  files_count       INTEGER NOT NULL DEFAULT 0,
  credits_spent     INTEGER NOT NULL DEFAULT 1,
  model_used        TEXT,
  tokens_in         INTEGER,
  tokens_out        INTEGER,
  duration_ms       INTEGER,
  is_zero_knowledge BOOLEAN NOT NULL DEFAULT false,
  is_saved          BOOLEAN NOT NULL DEFAULT false,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_id      ON public.debug_sessions(user_id);
CREATE INDEX idx_sessions_user_created ON public.debug_sessions(user_id, created_at DESC);
CREATE INDEX idx_sessions_action_type  ON public.debug_sessions(user_id, action_type);
CREATE INDEX idx_sessions_tags         ON public.debug_sessions USING GIN(tags);

-- ----------------------------------------------------------------------------
-- 8. DEBUG SESSION FILES
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.debug_session_files CASCADE;
CREATE TABLE public.debug_session_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.debug_sessions(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  language        TEXT,
  content         TEXT NOT NULL,
  is_error_source BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_files_session ON public.debug_session_files(session_id);

-- ----------------------------------------------------------------------------
-- 9. WEB BUILDER SESSIONS
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.web_builder_sessions CASCADE;
CREATE TABLE public.web_builder_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT 'Untitled Project',
  description     TEXT,
  messages        JSONB NOT NULL DEFAULT '[]',
  generated_html  TEXT,
  generated_code  TEXT,
  stack           TEXT DEFAULT 'react',
  template_id     UUID,
  is_public       BOOLEAN NOT NULL DEFAULT false,
  forked_from     UUID REFERENCES public.web_builder_sessions(id) ON DELETE SET NULL,
  view_count      INTEGER NOT NULL DEFAULT 0,
  credits_spent   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wb_user_id    ON public.web_builder_sessions(user_id);
CREATE INDEX idx_wb_public     ON public.web_builder_sessions(is_public) WHERE is_public = true;
CREATE INDEX idx_wb_created_at ON public.web_builder_sessions(created_at DESC);
CREATE INDEX idx_wb_forked     ON public.web_builder_sessions(forked_from);

-- ----------------------------------------------------------------------------
-- 10. WEB BUILDER VERSIONS
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.web_builder_versions CASCADE;
CREATE TABLE public.web_builder_versions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES public.web_builder_sessions(id) ON DELETE CASCADE,
  version_number   INTEGER NOT NULL,
  commit_message   TEXT,
  code_snapshot    TEXT NOT NULL,
  html_snapshot    TEXT,
  preview_image_url TEXT,
  prompt_used      TEXT,
  model_used       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, version_number)
);

CREATE INDEX idx_wb_versions_session ON public.web_builder_versions(session_id, version_number DESC);

-- ----------------------------------------------------------------------------
-- 11. WEB BUILDER TEMPLATES
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.web_builder_templates CASCADE;
CREATE TABLE public.web_builder_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  category        template_category NOT NULL,
  thumbnail_url   TEXT,
  preview_html    TEXT NOT NULL,
  starter_code    TEXT NOT NULL,
  stack           TEXT NOT NULL DEFAULT 'react',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  is_official     BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  usage_count     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 12. REFERRALS
-- ----------------------------------------------------------------------------
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

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referee  ON public.referrals(referee_id);
CREATE INDEX idx_referrals_code     ON public.referrals(referral_code);

-- ----------------------------------------------------------------------------
-- 13. REFERRAL PAYOUTS
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 14. NOTIFICATIONS
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.notifications CASCADE;
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  type        TEXT NOT NULL DEFAULT 'info',
  action_url  TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifs_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- ----------------------------------------------------------------------------
-- 15. AUDIT EVENTS
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.audit_events CASCADE;
CREATE TABLE public.audit_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_id   UUID,
  target_type TEXT,
  ip_address  INET,
  user_agent  TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user_id    ON public.audit_events(user_id);
CREATE INDEX idx_audit_created_at ON public.audit_events(created_at DESC);
CREATE INDEX idx_audit_action     ON public.audit_events(action);

-- ----------------------------------------------------------------------------
-- 16. ABUSE EVENTS
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.abuse_events CASCADE;
CREATE TABLE public.abuse_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address  INET,
  event_type  TEXT NOT NULL,
  endpoint    TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_abuse_user_id    ON public.abuse_events(user_id);
CREATE INDEX idx_abuse_created_at ON public.abuse_events(created_at DESC);

-- ----------------------------------------------------------------------------
-- 17. ANALYTICS USAGE LOGS
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.analytics_usage_logs CASCADE;
CREATE TABLE public.analytics_usage_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type  debug_action_type NOT NULL,
  ip_address   INET,
  credits_used INTEGER NOT NULL DEFAULT 1,
  model_used   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usage_rate_limit ON public.analytics_usage_logs(user_id, action_type, created_at DESC);

-- ----------------------------------------------------------------------------
-- 18. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_wallets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_session_files  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_builder_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_builder_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_builder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_payouts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id AND is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) AND plan_type = (SELECT plan_type FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "wallets_select_own" ON public.credit_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_select_own" ON public.credit_transactions FOR SELECT USING (wallet_id IN (SELECT id FROM public.credit_wallets WHERE user_id = auth.uid()));
CREATE POLICY "plans_select_all" ON public.subscription_plans FOR SELECT USING (is_active = true);

CREATE POLICY "sessions_select_own" ON public.debug_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON public.debug_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON public.debug_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sessions_delete_own" ON public.debug_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "session_files_select" ON public.debug_session_files FOR SELECT USING (session_id IN (SELECT id FROM public.debug_sessions WHERE user_id = auth.uid()));

CREATE POLICY "wb_select" ON public.web_builder_sessions FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "wb_insert_own" ON public.web_builder_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wb_update_own" ON public.web_builder_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "wb_delete_own" ON public.web_builder_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "wb_versions_select" ON public.web_builder_versions FOR SELECT USING (session_id IN (SELECT id FROM public.web_builder_sessions WHERE user_id = auth.uid() OR is_public = true));
CREATE POLICY "templates_select_public" ON public.web_builder_templates FOR SELECT USING (is_active = true);

CREATE POLICY "referrals_select_involved" ON public.referrals FOR SELECT USING (auth.uid() IN (referrer_id, referee_id));
CREATE POLICY "payouts_select_own" ON public.referral_payouts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifs_select_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifs_update_own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "audit_select_own" ON public.audit_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "abuse_select_own" ON public.abuse_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usage_select_own" ON public.analytics_usage_logs FOR SELECT USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 19. FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------------------

-- Auto-create profile + wallet on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.credit_wallets (user_id, balance)
  VALUES (NEW.id, 30)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.credit_transactions (wallet_id, amount, type, description)
  SELECT id, 30, 'credit_added', 'Welcome bonus — 30 free credits'
  FROM public.credit_wallets
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic credit deduction
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_action_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance INTEGER;
BEGIN
  UPDATE public.credit_wallets
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id AND balance >= p_amount
  RETURNING id, balance INTO v_wallet_id, v_new_balance;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits');
  END IF;

  INSERT INTO public.credit_transactions (wallet_id, amount, type, description, metadata)
  VALUES (v_wallet_id, -p_amount, 'credit_spent', COALESCE(p_description, p_action_type), jsonb_build_object('action_type', p_action_type));

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'wallet_id', v_wallet_id);
END;
$$;

-- Add credits
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type transaction_type,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance INTEGER;
BEGIN
  UPDATE public.credit_wallets
  SET balance = balance + p_amount, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING id, balance INTO v_wallet_id, v_new_balance;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'wallet_not_found');
  END IF;

  INSERT INTO public.credit_transactions (wallet_id, amount, type, description, metadata)
  VALUES (v_wallet_id, p_amount, p_type, COALESCE(p_description, p_type::text), p_metadata);

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- Safe admin check
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = p_user_id), false);
$$;

-- Claim referral
CREATE OR REPLACE FUNCTION public.claim_referral(p_referee_id UUID, p_referral_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = p_referral_code AND id != p_referee_id;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referrer_id = v_referrer_id AND referee_id = p_referee_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;

  INSERT INTO public.referrals (referrer_id, referee_id, referral_code, status, credits_awarded)
  VALUES (v_referrer_id, p_referee_id, p_referral_code, 'completed', 10);

  PERFORM public.add_credits(v_referrer_id, 10, 'referral_bonus', 'Referral bonus — new user signed up', '{}');
  PERFORM public.add_credits(p_referee_id, 10, 'referral_bonus', 'Referral bonus — signed up with referral code', '{}');

  RETURN jsonb_build_object('success', true, 'referrer_id', v_referrer_id);
END;
$$;

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at    BEFORE UPDATE ON public.profiles            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_wallets_updated_at    BEFORE UPDATE ON public.credit_wallets      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_sessions_updated_at   BEFORE UPDATE ON public.debug_sessions      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_wb_sessions_updated_at BEFORE UPDATE ON public.web_builder_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_templates_updated_at  BEFORE UPDATE ON public.web_builder_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- 20. REALTIME
-- ----------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debug_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.web_builder_sessions;

-- ----------------------------------------------------------------------------
-- 21. SET FIRST ADMIN USER
-- ----------------------------------------------------------------------------
-- Replace 'nurprodev@gmail.com' with your admin email
UPDATE public.profiles
SET is_admin = true
WHERE email = 'nurprodev@gmail.com';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Verify installation:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- SELECT * FROM public.subscription_plans;
-- ============================================================================
