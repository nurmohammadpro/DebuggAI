-- ============================================================================
-- DeBuggAI Database Schema Normalization
-- Migration: 20260505
-- Description: Fix inconsistencies, add missing tables, create indexes, RLS
-- ============================================================================

-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. FIX: credit_wallets column name inconsistency
-- ============================================================================
-- The codebase references both owner_id (credits-service.ts) and user_id (admin/auth.ts).
-- Standardizing to user_id. If owner_id exists, rename it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_wallets' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE credit_wallets RENAME COLUMN owner_id TO user_id;
  END IF;
END $$;

-- Ensure user_id has proper unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'credit_wallets_user_id_key'
  ) THEN
    -- Check for duplicates first, dedupe keeping newest
    DELETE FROM credit_wallets a
    USING credit_wallets b
    WHERE a.user_id = b.user_id AND a.created_at < b.created_at;
    ALTER TABLE credit_wallets ADD CONSTRAINT credit_wallets_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 3. NEW TABLE: projects
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  stack       TEXT,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  is_pinned   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status) WHERE status = 'active';

-- Add project_id to generations (nullable FK, backwards-compatible)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generations' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE generations ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
    CREATE INDEX idx_generations_project ON generations(project_id);
  END IF;
END $$;

-- 4. NEW TABLE: project_domains (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_domains (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  domain             TEXT NOT NULL UNIQUE,
  primary_domain     BOOLEAN DEFAULT false,
  verification_token TEXT,
  verified_at        TIMESTAMPTZ,
  ssl_enabled        BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_domains_project ON project_domains(project_id);

-- 5. NEW TABLE: project_env_vars (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_env_vars (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  is_secret   BOOLEAN DEFAULT true,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, key)
);

CREATE INDEX IF NOT EXISTS idx_project_env_vars_project ON project_env_vars(project_id);

-- 6. NEW TABLE: project_integrations (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_integrations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('github', 'gitlab', 'vercel', 'netlify', 'supabase', 'railway', 'fly')),
  config           JSONB DEFAULT '{}',
  enabled          BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, integration_type)
);

CREATE INDEX IF NOT EXISTS idx_project_integrations_project ON project_integrations(project_id);

-- 7. NEW TABLE: notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT,
  type       TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read       BOOLEAN DEFAULT false,
  link       TEXT,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_all
  ON notifications(user_id, created_at DESC);

-- 8. NEW TABLE: abuse_events (if not exists - expands existing abuse)
-- ============================================================================
CREATE TABLE IF NOT EXISTS abuse_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address     TEXT,
  event_type     TEXT NOT NULL DEFAULT 'reported' CHECK (event_type IN ('reported', 'rate_limit_hit', 'banned', 'suspicious')),
  endpoint       TEXT,
  reason         TEXT,
  description    TEXT,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  resolution     TEXT,
  resolved_by    UUID REFERENCES profiles(id),
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT now(),
  resolved_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_abuse_events_status ON abuse_events(status);
CREATE INDEX IF NOT EXISTS idx_abuse_events_created ON abuse_events(created_at DESC);

-- 9. NEW TABLE: contact_messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT,
  message    TEXT NOT NULL,
  read       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_read ON contact_messages(read, created_at DESC);

-- 10. NEW TABLE: newsletter_subscribers
-- ============================================================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT NOT NULL UNIQUE,
  subscribed     BOOLEAN DEFAULT true,
  subscribed_at  TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscribers(email) WHERE subscribed = true;

-- 11. NEW TABLE: subscriptions (Stripe billing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  plan_type              TEXT NOT NULL CHECK (plan_type IN ('free', 'pro', 'team', 'business', 'enterprise')),
  status                 TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing')),
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  canceled_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_active_user
  ON subscriptions(user_id) WHERE status = 'active';

-- 12. ADDITIONAL INDEXES for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_credit_wallets_balance ON credit_wallets(balance) WHERE balance > 0;
CREATE INDEX IF NOT EXISTS idx_credit_tx_created ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_tx_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_user_created ON debug_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_language ON debug_sessions(language);
CREATE INDEX IF NOT EXISTS idx_generations_user_created ON generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_stack ON generations(stack);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- 13. updated_at TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    BEGIN
      EXECUTE format(
        'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        tbl
      );
    EXCEPTION WHEN duplicate_object THEN
      -- trigger already exists, skip
    END;
  END LOOP;
END $$;

-- 14. ENSURE CORE TABLES EXIST (idempotent)
-- ============================================================================
CREATE TABLE IF NOT EXISTS debug_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  language      TEXT NOT NULL,
  code          TEXT NOT NULL,
  error_message TEXT,
  fix           TEXT,
  explanation   TEXT,
  tags          TEXT[],
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code        TEXT DEFAULT '',
  version     INTEGER DEFAULT 1,
  description TEXT,
  stack       TEXT,
  prompt      TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id   UUID NOT NULL REFERENCES credit_wallets(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,
  type        TEXT NOT NULL,
  source      TEXT,
  description TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 15. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Profiles: users can read their own, admins can read all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_select_own') THEN
    CREATE POLICY profiles_select_own ON profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_update_own') THEN
    CREATE POLICY profiles_update_own ON profiles
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- Credit wallets: users can only see their own
ALTER TABLE credit_wallets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'wallets_select_own') THEN
    CREATE POLICY wallets_select_own ON credit_wallets
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Credit transactions: accessible through wallet ownership
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'transactions_select_own') THEN
    CREATE POLICY transactions_select_own ON credit_transactions
      FOR SELECT USING (
        wallet_id IN (SELECT id FROM credit_wallets WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- Debug sessions: users own their sessions
ALTER TABLE debug_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'debug_sessions_crud_own') THEN
    CREATE POLICY debug_sessions_crud_own ON debug_sessions
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Generations: users own their generations
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'generations_crud_own') THEN
    CREATE POLICY generations_crud_own ON generations
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Projects: users own their projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'projects_crud_own') THEN
    CREATE POLICY projects_crud_own ON projects
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Notifications: users only see their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_crud_own') THEN
    CREATE POLICY notifications_crud_own ON notifications
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Contact messages: insert public, read admin only via service role
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'contact_insert_public') THEN
    CREATE POLICY contact_insert_public ON contact_messages
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 16. HELPER FUNCTION: is_admin (for RLS policies and API checks)
-- ============================================================================
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = p_user_id),
    false
  );
$$;

-- 17. HELPER FUNCTION: get_user_plan
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT plan_type FROM profiles WHERE id = p_user_id),
    'free'
  );
$$;
