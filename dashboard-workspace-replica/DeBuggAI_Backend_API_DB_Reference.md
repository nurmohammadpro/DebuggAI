# DeBuggAI — Backend API & Database Reference

> **Stack:** Next.js 15 API Routes + Supabase (PostgreSQL + Auth + Storage + Realtime) + Groq AI + Stripe  
> **Principle:** Every route is authenticated. Every table has RLS. Secrets never touch client code.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Row Level Security](#3-row-level-security)
4. [Database Functions & Triggers](#4-database-functions--triggers)
5. [Indexes & Performance](#5-indexes--performance)
6. [API Route Reference](#6-api-route-reference)
7. [Edge Functions (Supabase)](#7-edge-functions-supabase)
8. [Authentication & Session Security](#8-authentication--session-security)
9. [Rate Limiting & Credit System](#9-rate-limiting--credit-system)
10. [Storage Buckets](#10-storage-buckets)
11. [Realtime Subscriptions](#11-realtime-subscriptions)
12. [Environment Variables](#12-environment-variables)
13. [Security Hardening Checklist](#13-security-hardening-checklist)
14. [Migration Execution Order](#14-migration-execution-order)

---

## 1. Architecture Overview

```
Client (Next.js 15)
    │
    ├── /api/*          → Next.js API Routes (server-side, Node.js)
    │     ├── /auth/*          Auth helpers (session management)
    │     ├── /debug/*         AI debug & analysis endpoints
    │     ├── /projects/*      Project CRUD
    │     ├── /credits/*       Credit wallet management
    │     ├── /subscriptions/* Stripe billing
    │     ├── /referrals/*     Referral program
    │     ├── /admin/*         Admin-only operations
    │     └── /webhooks/*      Stripe + external webhook receivers
    │
    └── Supabase SDK    → Direct DB access (RLS-protected)
          ├── auth.*           Login, signup, session
          ├── from('table')    Data queries (gated by RLS)
          ├── storage.*        File uploads
          └── channel(*)       Realtime subscriptions

Supabase Edge Functions (Deno)
    ├── debug-ai-analyze        SSE streaming — AI analysis
    ├── debug-ai-reverse        SSE streaming — reverse builder
    ├── generate-web-code       SSE streaming — web builder
    ├── save-debug-session      Persist session after analysis
    ├── get-debug-history       Paginated session history
    └── stripe-webhook          Payment event handler

External Services
    ├── Groq API                LLM inference (Llama 3.3 70B)
    ├── Stripe                  Subscriptions & payments
    └── Resend                  Transactional email
```

---

## 2. Database Schema

Run migrations in the exact order listed in [Section 14](#14-migration-execution-order).

### 001 — Enable Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- full-text search on session titles
```

### 002 — Custom ENUM Types

```sql
CREATE TYPE public.plan_type AS ENUM (
  'free',
  'pro',
  'enterprise'
);

CREATE TYPE public.transaction_type AS ENUM (
  'credit_added',
  'credit_spent',
  'subscription_reset',
  'referral_bonus',
  'admin_adjustment',
  'purchase'
);

CREATE TYPE public.referral_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'expired'
);

CREATE TYPE public.payout_status AS ENUM (
  'pending',
  'approved',
  'processing',
  'paid',
  'rejected'
);

CREATE TYPE public.debug_action_type AS ENUM (
  'analyze',
  'reverse',
  'web_builder'
);
```

### 003 — profiles

Core user identity. Extends `auth.users` — never store sensitive auth data here.

```sql
CREATE TABLE public.profiles (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT        NOT NULL UNIQUE,
  full_name         TEXT,
  username          TEXT        UNIQUE CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  avatar_url        TEXT,
  plan_type         plan_type   NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT       UNIQUE,
  is_admin          BOOLEAN     NOT NULL DEFAULT false,
  is_ambassador     BOOLEAN     NOT NULL DEFAULT false,
  referral_code     TEXT        UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  zero_knowledge_mode BOOLEAN   NOT NULL DEFAULT false,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.profiles.is_admin IS
  'Admin flag. Never expose via client queries. Check via SECURITY DEFINER function only.';

COMMENT ON COLUMN public.profiles.zero_knowledge_mode IS
  'When true, AI analysis payloads are not persisted to debug_sessions.';
```

### 004 — credit_wallets

One row per user. Balance is always non-negative. Updates are atomic.

```sql
CREATE TABLE public.credit_wallets (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance     INTEGER NOT NULL DEFAULT 30 CHECK (balance >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 005 — credit_transactions

Immutable ledger. Never UPDATE or DELETE rows here.

```sql
CREATE TABLE public.credit_transactions (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id   UUID             NOT NULL REFERENCES public.credit_wallets(id) ON DELETE CASCADE,
  amount      INTEGER          NOT NULL,   -- positive = add, negative = spend
  type        transaction_type NOT NULL,
  description TEXT,
  metadata    JSONB            NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.credit_transactions.amount IS
  'Signed integer. Positive = credits added. Negative = credits spent.';

COMMENT ON TABLE public.credit_transactions IS
  'Append-only ledger. No UPDATE or DELETE policies are granted.';
```

### 006 — subscription_plans

Static seed data — plan definitions.

```sql
CREATE TABLE public.subscription_plans (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL UNIQUE,
  stripe_price_id   TEXT        UNIQUE,             -- null for free
  price_monthly     NUMERIC(8,2) NOT NULL DEFAULT 0,
  credits_per_month INTEGER     NOT NULL,
  history_days      INTEGER     NOT NULL DEFAULT 30, -- session retention
  features          JSONB       NOT NULL DEFAULT '[]',
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed data
INSERT INTO public.subscription_plans
  (name, price_monthly, credits_per_month, history_days, features)
VALUES
  ('free',       0,  30,        30,  '["analyze","reverse"]'),
  ('pro',        9,  300,       365, '["analyze","reverse","web_builder","zero_knowledge","priority_ai"]'),
  ('enterprise', 49, 2147483647, 730, '["analyze","reverse","web_builder","zero_knowledge","priority_ai","admin_api","sla"]');
```

### 007 — debug_sessions

AI analysis history. Soft-deleted by plan retention window.

```sql
CREATE TABLE public.debug_sessions (
  id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID             NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT,
  prompt          TEXT             NOT NULL,
  result          TEXT,                          -- null while streaming
  action_type     debug_action_type NOT NULL,
  files_count     INTEGER          NOT NULL DEFAULT 0,
  credits_spent   INTEGER          NOT NULL DEFAULT 1,
  model_used      TEXT,
  tokens_in       INTEGER,
  tokens_out      INTEGER,
  duration_ms     INTEGER,
  is_zero_knowledge BOOLEAN        NOT NULL DEFAULT false,
  is_saved        BOOLEAN          NOT NULL DEFAULT false,
  tags            TEXT[]           NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ      NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.debug_sessions.result IS
  'NULL while SSE stream is in progress. Set to full result on completion.';

COMMENT ON COLUMN public.debug_sessions.is_zero_knowledge IS
  'When true, prompt and result are wiped on save (stored as empty strings).';
```

### 008 — web_builder_sessions

Web builder (v0.dev-style) session state.

```sql
CREATE TABLE public.web_builder_sessions (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT    NOT NULL DEFAULT 'Untitled',
  messages        JSONB   NOT NULL DEFAULT '[]',  -- [{role, content, timestamp}]
  generated_html  TEXT,
  generated_code  TEXT,
  template_id     UUID,
  is_public       BOOLEAN NOT NULL DEFAULT false,
  forked_from     UUID    REFERENCES public.web_builder_sessions(id) ON DELETE SET NULL,
  credits_spent   INTEGER NOT NULL DEFAULT 0,
  view_count      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 009 — referrals

```sql
CREATE TABLE public.referrals (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID           NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id      UUID           REFERENCES public.profiles(id) ON DELETE SET NULL,
  referral_code   TEXT           NOT NULL,
  status          referral_status NOT NULL DEFAULT 'pending',
  credits_awarded INTEGER        NOT NULL DEFAULT 0,
  completed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ    NOT NULL DEFAULT (now() + interval '30 days'),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);
```

### 010 — referral_payouts

Ambassador commission payouts (monthly batches).

```sql
CREATE TABLE public.referral_payouts (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_usd        NUMERIC(10,2) NOT NULL CHECK (amount_usd > 0),
  period_month      DATE          NOT NULL,              -- first day of month
  referral_count    INTEGER       NOT NULL DEFAULT 0,
  status            payout_status NOT NULL DEFAULT 'pending',
  stripe_transfer_id TEXT,
  approved_by       UUID          REFERENCES public.profiles(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  paid_at           TIMESTAMPTZ,
  UNIQUE (user_id, period_month)
);
```

### 011 — notifications

```sql
CREATE TABLE public.notifications (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT    NOT NULL,
  body        TEXT,
  type        TEXT    NOT NULL DEFAULT 'info',   -- info | success | warning | error
  action_url  TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 012 — audit_events

Immutable audit trail for admin and security events.

```sql
CREATE TABLE public.audit_events (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT    NOT NULL,     -- e.g. 'admin.plan_override', 'auth.login', 'credit.adjust'
  target_id   UUID,                 -- the affected resource id
  target_type TEXT,                 -- 'profile' | 'debug_session' | 'credit_wallet' etc.
  ip_address  INET,
  user_agent  TEXT,
  metadata    JSONB   NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_events IS
  'Append-only. No UPDATE or DELETE policies are ever granted on this table.';
```

### 013 — abuse_events

Rate limit violations and suspicious activity.

```sql
CREATE TABLE public.abuse_events (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address  INET,
  event_type  TEXT    NOT NULL,   -- 'rate_limit_hit' | 'invalid_token' | 'credit_race'
  endpoint    TEXT,
  metadata    JSONB   NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 014 — analytics_usage_logs

Per-action usage for rate limiting (DB-backed, not in-memory).

```sql
CREATE TABLE public.analytics_usage_logs (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type debug_action_type NOT NULL,
  ip_address  INET,
  credits_used INTEGER NOT NULL DEFAULT 1,
  model_used  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Row Level Security

Enable RLS on every table. Deny all by default; grant only what is needed.

```sql
-- Enable RLS on every table
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_wallets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_builder_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_payouts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_usage_logs ENABLE ROW LEVEL SECURITY;
```

### profiles

```sql
-- Anyone can read public profile fields
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent self-escalation: cannot set is_admin or plan_type via this policy
    AND is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
    AND plan_type = (SELECT plan_type FROM public.profiles WHERE id = auth.uid())
  );

-- Insert is handled only by the handle_new_user() trigger (SECURITY DEFINER)
-- No direct INSERT policy for users
```

### credit_wallets

```sql
CREATE POLICY "wallets_select_own"
  ON public.credit_wallets FOR SELECT
  USING (auth.uid() = user_id);

-- No direct UPDATE policy for users.
-- Balance changes MUST go through the atomic deduct_credits() function.
```

### credit_transactions

```sql
CREATE POLICY "transactions_select_own"
  ON public.credit_transactions FOR SELECT
  USING (
    wallet_id IN (
      SELECT id FROM public.credit_wallets WHERE user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE for users — handled via SECURITY DEFINER functions only
```

### subscription_plans

```sql
-- Public read — anyone can view plan definitions
CREATE POLICY "plans_select_all"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);
```

### debug_sessions

```sql
CREATE POLICY "sessions_select_own"
  ON public.debug_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "sessions_insert_own"
  ON public.debug_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_update_own"
  ON public.debug_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_delete_own"
  ON public.debug_sessions FOR DELETE
  USING (auth.uid() = user_id);
```

### web_builder_sessions

```sql
CREATE POLICY "wb_select"
  ON public.web_builder_sessions FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "wb_insert_own"
  ON public.web_builder_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wb_update_own"
  ON public.web_builder_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "wb_delete_own"
  ON public.web_builder_sessions FOR DELETE
  USING (auth.uid() = user_id);
```

### referrals

```sql
CREATE POLICY "referrals_select_involved"
  ON public.referrals FOR SELECT
  USING (auth.uid() IN (referrer_id, referee_id));

-- INSERT only via SECURITY DEFINER function (claim_referral)
```

### referral_payouts

```sql
CREATE POLICY "payouts_select_own"
  ON public.referral_payouts FOR SELECT
  USING (auth.uid() = user_id);
```

### notifications

```sql
CREATE POLICY "notifs_select_own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifs_update_own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### audit_events, abuse_events, analytics_usage_logs

```sql
-- Users can read their own audit trail. Admins read all (via SECURITY DEFINER function).
CREATE POLICY "audit_select_own"
  ON public.audit_events FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for regular users.
-- All writes via SECURITY DEFINER functions only.

-- No user-facing policies on abuse_events or analytics_usage_logs.
-- Admin access via service_role key in edge functions only.
```

---

## 4. Database Functions & Triggers

### handle_new_user — auto-create profile + wallet on signup

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create credit wallet with 30 free credits
  INSERT INTO public.credit_wallets (user_id, balance)
  VALUES (NEW.id, 30)
  ON CONFLICT (user_id) DO NOTHING;

  -- Record the initial credit grant
  INSERT INTO public.credit_transactions
    (wallet_id, amount, type, description)
  SELECT id, 30, 'credit_added', 'Welcome bonus — 30 free credits'
  FROM public.credit_wallets
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### deduct_credits — atomic, race-condition-safe credit spend

```sql
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id     UUID,
  p_amount      INTEGER,
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
  -- Single atomic UPDATE; fails cleanly if insufficient balance
  UPDATE public.credit_wallets
  SET
    balance    = balance - p_amount,
    updated_at = now()
  WHERE
    user_id = p_user_id
    AND balance >= p_amount
  RETURNING id, balance INTO v_wallet_id, v_new_balance;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'insufficient_credits'
    );
  END IF;

  -- Record the spend in the ledger
  INSERT INTO public.credit_transactions
    (wallet_id, amount, type, description, metadata)
  VALUES
    (v_wallet_id, -p_amount, 'credit_spent',
     COALESCE(p_description, p_action_type),
     jsonb_build_object('action_type', p_action_type));

  RETURN jsonb_build_object(
    'success',      true,
    'new_balance',  v_new_balance,
    'wallet_id',    v_wallet_id
  );
END;
$$;
```

### add_credits — add credits and record transaction

```sql
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id     UUID,
  p_amount      INTEGER,
  p_type        transaction_type,
  p_description TEXT DEFAULT NULL,
  p_metadata    JSONB DEFAULT '{}'
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
  SET
    balance    = balance + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING id, balance INTO v_wallet_id, v_new_balance;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'wallet_not_found');
  END IF;

  INSERT INTO public.credit_transactions
    (wallet_id, amount, type, description, metadata)
  VALUES
    (v_wallet_id, p_amount, p_type,
     COALESCE(p_description, p_type::text), p_metadata);

  RETURN jsonb_build_object(
    'success',     true,
    'new_balance', v_new_balance
  );
END;
$$;
```

### is_admin — safe admin check (never trust client claims)

```sql
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = p_user_id),
    false
  );
$$;
```

### claim_referral — handle referral code on signup

```sql
CREATE OR REPLACE FUNCTION public.claim_referral(
  p_referee_id  UUID,
  p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- Look up referrer by code
  SELECT id INTO v_referrer_id
  FROM public.profiles
  WHERE referral_code = p_referral_code
    AND id != p_referee_id;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  -- Check no existing relationship
  IF EXISTS (
    SELECT 1 FROM public.referrals
    WHERE referrer_id = v_referrer_id AND referee_id = p_referee_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;

  -- Create referral record
  INSERT INTO public.referrals
    (referrer_id, referee_id, referral_code, status, credits_awarded)
  VALUES
    (v_referrer_id, p_referee_id, p_referral_code, 'completed', 10);

  -- Award credits to both parties
  PERFORM public.add_credits(
    v_referrer_id, 10, 'referral_bonus',
    'Referral bonus — new user signed up', '{}'
  );
  PERFORM public.add_credits(
    p_referee_id, 10, 'referral_bonus',
    'Referral bonus — signed up with a referral code', '{}'
  );

  RETURN jsonb_build_object('success', true, 'referrer_id', v_referrer_id);
END;
$$;
```

### update_updated_at — generic timestamp trigger

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON public.credit_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON public.debug_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_wb_updated_at
  BEFORE UPDATE ON public.web_builder_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

---

## 5. Indexes & Performance

```sql
-- profiles
CREATE INDEX idx_profiles_referral_code    ON public.profiles(referral_code);
CREATE INDEX idx_profiles_stripe_customer  ON public.profiles(stripe_customer_id);
CREATE INDEX idx_profiles_plan_type        ON public.profiles(plan_type);

-- credit_wallets
CREATE INDEX idx_wallets_user_id           ON public.credit_wallets(user_id);

-- credit_transactions
CREATE INDEX idx_transactions_wallet_id    ON public.credit_transactions(wallet_id);
CREATE INDEX idx_transactions_created_at   ON public.credit_transactions(created_at DESC);
CREATE INDEX idx_transactions_type         ON public.credit_transactions(type);

-- debug_sessions
CREATE INDEX idx_sessions_user_id          ON public.debug_sessions(user_id);
CREATE INDEX idx_sessions_created_at       ON public.debug_sessions(user_id, created_at DESC);
CREATE INDEX idx_sessions_action_type      ON public.debug_sessions(user_id, action_type);
CREATE INDEX idx_sessions_tags             ON public.debug_sessions USING GIN(tags);
CREATE INDEX idx_sessions_title_trgm       ON public.debug_sessions USING GIN(title gin_trgm_ops);

-- web_builder_sessions
CREATE INDEX idx_wb_user_id                ON public.web_builder_sessions(user_id);
CREATE INDEX idx_wb_public                 ON public.web_builder_sessions(is_public) WHERE is_public = true;
CREATE INDEX idx_wb_created_at             ON public.web_builder_sessions(created_at DESC);

-- referrals
CREATE INDEX idx_referrals_referrer        ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referee         ON public.referrals(referee_id);
CREATE INDEX idx_referrals_code            ON public.referrals(referral_code);

-- analytics_usage_logs (critical for rate limiting queries)
CREATE INDEX idx_usage_rate_limit
  ON public.analytics_usage_logs(user_id, action_type, created_at DESC);

-- notifications
CREATE INDEX idx_notifs_user_unread
  ON public.notifications(user_id, is_read) WHERE is_read = false;

-- audit_events
CREATE INDEX idx_audit_user_id             ON public.audit_events(user_id);
CREATE INDEX idx_audit_created_at          ON public.audit_events(created_at DESC);
CREATE INDEX idx_audit_action              ON public.audit_events(action);
```

---

## 6. API Route Reference

All routes require a valid Supabase JWT in the `Authorization: Bearer <token>` header unless marked **[public]**.

### Authentication

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register with email + password. Optional `referral_code`. Creates profile via trigger. |
| POST | `/api/auth/login` | Email + password login. Returns session. |
| POST | `/api/auth/logout` | Invalidates session. |
| POST | `/api/auth/verify-email` | Verify email token from Supabase magic link. |
| POST | `/api/auth/forgot-password` | Send password reset email via Resend. |
| POST | `/api/auth/reset-password` | Set new password with reset token. |
| GET  | `/api/auth/session` | Return current session + profile. |

**Register request body:**
```json
{
  "email": "user@example.com",
  "password": "min8chars",
  "full_name": "Nawaz Ahmed",
  "referral_code": "abc123"
}
```

**Register response:**
```json
{
  "user": { "id": "uuid", "email": "..." },
  "session": { "access_token": "...", "refresh_token": "..." },
  "referral_claimed": true
}
```

---

### Debug Sessions

| Method | Route | Description | Credits |
|--------|-------|-------------|---------|
| POST | `/api/debug/analyze` | Analyze code/error. Returns SSE stream. | 1 |
| POST | `/api/debug/reverse` | Reverse-build analysis. Returns SSE stream. | 1 |
| POST | `/api/debug/sessions` | Save a completed session. | 0 |
| GET  | `/api/debug/sessions` | List sessions with pagination + filters. | 0 |
| GET  | `/api/debug/sessions/:id` | Get single session. | 0 |
| PATCH | `/api/debug/sessions/:id` | Update title, tags, is_saved. | 0 |
| DELETE | `/api/debug/sessions/:id` | Delete session. | 0 |

**POST /api/debug/analyze — request:**
```json
{
  "prompt": "du: .git: No such file or directory",
  "action_type": "analyze",
  "files": [
    { "name": "main.dart", "content": "void main() { ... }" }
  ],
  "zero_knowledge": false
}
```

**POST /api/debug/analyze — SSE response stream:**
```
data: {"type":"delta","content":"The error occurs because..."}
data: {"type":"delta","content":" the .git directory"}
data: {"type":"done","session_id":"uuid","credits_remaining":186}
```

**GET /api/debug/sessions — query params:**
```
?page=1&limit=20&action_type=analyze&tags=flutter,dart&search=NullPointer&from=2026-01-01
```

---

### Credits & Billing

| Method | Route | Description |
|--------|-------|-------------|
| GET  | `/api/credits/wallet` | Current balance + recent transactions. |
| GET  | `/api/credits/transactions` | Full transaction history with pagination. |
| POST | `/api/credits/topup` | Create Stripe checkout for one-time credit purchase. |

**GET /api/credits/wallet — response:**
```json
{
  "balance": 186,
  "plan": "pro",
  "plan_resets_at": "2026-05-01T00:00:00Z",
  "recent_transactions": [
    { "amount": -1, "type": "credit_spent", "description": "analyze", "created_at": "..." }
  ]
}
```

---

### Subscriptions

| Method | Route | Description |
|--------|-------|-------------|
| GET  | `/api/subscriptions/plans` **[public]** | All active plans with pricing. |
| POST | `/api/subscriptions/checkout` | Create Stripe checkout session. |
| GET  | `/api/subscriptions/current` | Current subscription + next billing date. |
| POST | `/api/subscriptions/cancel` | Cancel at period end via Stripe. |
| GET  | `/api/subscriptions/portal` | Redirect to Stripe Customer Portal URL. |

**POST /api/subscriptions/checkout — request:**
```json
{
  "plan": "pro",
  "success_url": "https://debuggai.com/dashboard?upgraded=1",
  "cancel_url": "https://debuggai.com/pricing"
}
```

---

### Referrals

| Method | Route | Description |
|--------|-------|-------------|
| GET  | `/api/referrals/my-code` | Current user's referral code + link. |
| GET  | `/api/referrals/stats` | Referrals made, credits earned, conversion rate. |
| GET  | `/api/referrals/leaderboard` **[public]** | Top 20 ambassadors. |
| POST | `/api/referrals/apply-ambassador` | Submit ambassador application. |

---

### Web Builder

| Method | Route | Description | Credits |
|--------|-------|-------------|---------|
| GET  | `/api/web-builder/sessions` | List user's builder sessions. | 0 |
| POST | `/api/web-builder/sessions` | Create new session. | 5 |
| GET  | `/api/web-builder/sessions/:id` | Get session with full message history. | 0 |
| POST | `/api/web-builder/sessions/:id/generate` | Generate/iterate on HTML. SSE stream. | 10 |
| POST | `/api/web-builder/sessions/:id/fork` | Fork a public session. | 0 |
| PATCH | `/api/web-builder/sessions/:id` | Update title, is_public. | 0 |
| DELETE | `/api/web-builder/sessions/:id` | Delete session. | 0 |
| GET  | `/api/web-builder/templates` **[public]** | Browse public templates. | 0 |

---

### Admin (requires `is_admin = true`)

All admin routes verify admin status server-side via `public.is_admin()`. A client claim of admin is never trusted.

| Method | Route | Description |
|--------|-------|-------------|
| GET  | `/api/admin/users` | List users with search + filter. |
| GET  | `/api/admin/users/:id` | Get full user profile + stats. |
| PATCH | `/api/admin/users/:id/plan` | Override plan type. |
| POST | `/api/admin/users/:id/credits` | Manual credit adjustment. |
| POST | `/api/admin/users/:id/ban` | Ban user account. |
| GET  | `/api/admin/analytics` | Platform-wide usage stats. |
| GET  | `/api/admin/payouts` | Pending payout queue. |
| POST | `/api/admin/payouts/:id/approve` | Approve payout (triggers Stripe transfer). |
| GET  | `/api/admin/audit` | Audit event log with filters. |
| GET  | `/api/admin/abuse` | Abuse event log. |

**Admin route guard (applied to all /api/admin/* routes):**
```typescript
// middleware applied before every admin handler
async function requireAdmin(req: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser(
    req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  );
  if (!user) return new Response('Unauthorized', { status: 401 });

  // NEVER trust profile.is_admin from client.
  // Always call the SECURITY DEFINER function.
  const { data: isAdmin } = await supabaseAdmin
    .rpc('is_admin', { p_user_id: user.id });

  if (!isAdmin) return new Response('Forbidden', { status: 403 });
}
```

---

### Webhooks

| Method | Route | Trigger |
|--------|-------|---------|
| POST | `/api/webhooks/stripe` | Stripe payment events |

**Stripe events handled:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activate subscription, add monthly credits |
| `customer.subscription.created` | Set `plan_type` on profile |
| `customer.subscription.updated` | Update plan, adjust credits if tier changed |
| `customer.subscription.deleted` | Downgrade to free, keep remaining credits |
| `invoice.payment_succeeded` | Monthly credit reset + send receipt email |
| `invoice.payment_failed` | Send payment failure notification |

**Stripe webhook verification (never skip this):**
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response(`Webhook signature verification failed`, { status: 400 });
  }

  // Process event...
}
```

---

## 7. Edge Functions (Supabase)

Deployed as Deno functions at `https://<project>.supabase.co/functions/v1/`.

### debug-ai-analyze

```typescript
// supabase/functions/debug-ai-analyze/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  Deno.env.get('ALLOWED_ORIGIN') ?? 'https://debuggai.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  // 1. Authenticate
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return new Response('Unauthorized', { status: 401 });

  // 2. Parse body ONCE (common mistake: calling req.json() twice throws)
  const { prompt, action_type = 'analyze', zero_knowledge = false } = await req.json();
  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: 'prompt required' }), { status: 400 });
  }

  // 3. DB-backed rate limit check
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const window24h = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await supabaseAdmin
    .from('analytics_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('action_type', action_type)
    .gte('created_at', window24h);

  const DAILY_LIMITS: Record<string, number> = {
    free: 10, pro: 300, enterprise: 999999,
  };

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('plan_type')
    .eq('id', user.id)
    .single();

  const limit = DAILY_LIMITS[profile?.plan_type ?? 'free'];
  if ((count ?? 0) >= limit) {
    return new Response(
      JSON.stringify({ error: 'daily_limit_reached', limit }),
      { status: 429, headers: CORS }
    );
  }

  // 4. Atomic credit deduction
  const { data: deduct } = await supabaseAdmin
    .rpc('deduct_credits', {
      p_user_id:     user.id,
      p_amount:      1,
      p_action_type: action_type,
    });

  if (!deduct?.success) {
    return new Response(
      JSON.stringify({ error: 'insufficient_credits' }),
      { status: 402, headers: CORS }
    );
  }

  // 5. SSE stream from Groq
  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
    },
    body: JSON.stringify({
      model:       Deno.env.get('GROQ_MODEL') ?? 'llama-3.3-70b-versatile',
      stream:      true,
      max_tokens:  4096,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: prompt },
      ],
    }),
  });

  if (!groqRes.ok) {
    const err = await groqRes.text();
    return new Response(JSON.stringify({ error: 'ai_error', detail: err }), {
      status: 502, headers: CORS,
    });
  }

  // 6. Log usage
  await supabaseAdmin.from('analytics_usage_logs').insert({
    user_id: user.id, action_type, credits_used: 1,
    ip_address: req.headers.get('cf-connecting-ip'),
    model_used: Deno.env.get('GROQ_MODEL'),
  });

  // 7. Pipe Groq SSE → client SSE
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    const reader = groqRes.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6);
          if (json === '[DONE]') {
            await writer.write(encoder.encode(
              `data: ${JSON.stringify({ type: 'done', credits_remaining: deduct.new_balance })}\n\n`
            ));
            break;
          }
          try {
            const chunk = JSON.parse(json);
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              await writer.write(encoder.encode(
                `data: ${JSON.stringify({ type: 'delta', content })}\n\n`
              ));
            }
          } catch { /* malformed chunk — skip */ }
        }
      }
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      ...CORS,
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
});

const SYSTEM_PROMPT = `You are DeBuggAI, an expert Flutter/Dart debugging assistant.
Analyze the provided error or code and respond with exactly 5 sections:
1. Classification — bug category and severity
2. Root Cause — precise technical explanation
3. The Fix — corrected code with explanation
4. Corrected Code — full working snippet
5. Prevention & Verification — how to prevent recurrence and verify the fix

Be precise, concise, and developer-focused. Format code blocks with proper syntax.`;
```

### generate-web-code

Key differences from analyze:
- Cost: 10 credits
- System prompt: HTML/CSS/Tailwind code generation
- Atomic credit deduction before stream starts

```typescript
// Cost and system prompt differ; structure is identical to debug-ai-analyze
const CREDIT_COST = 10;
const WEB_SYSTEM_PROMPT = `You are a web UI generator. Generate clean, responsive HTML with
inline Tailwind CSS classes based on the user's description. Output only valid HTML.
No explanation — only the HTML code block.`;
```

### save-debug-session

```typescript
// POST body: { title, prompt, result, action_type, credits_spent, zero_knowledge }
// Inserts into debug_sessions as the authenticated user.
// If zero_knowledge is true, store empty strings for prompt and result.
```

---

## 8. Authentication & Session Security

### Supabase Auth Configuration

```
Dashboard → Authentication → Settings:
  Site URL:              https://debuggai.com
  Redirect URLs:         https://debuggai.com/auth/callback
                         http://localhost:3000/auth/callback (dev only)
  JWT Expiry:            3600 (1 hour)
  Refresh Token Rotation: enabled
  Password minimum length: 8
  Email confirmation:    required
```

### Next.js middleware — protect all app routes

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/pricing', '/explore', '/api/webhooks'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();

  const isPublic = PUBLIC_PATHS.some(p => req.nextUrl.pathname.startsWith(p));
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Security headers (next.config.ts)

```typescript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',  value: 'on' },
  { key: 'X-Frame-Options',         value: 'DENY' },
  { key: 'X-Content-Type-Options',  value: 'nosniff' },
  { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",   // Monaco requires unsafe-eval
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "font-src 'self' fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co https://api.groq.com",
      "frame-src 'none'",                                   // sandbox preview uses blob: in JS
    ].join('; '),
  },
];
```

---

## 9. Rate Limiting & Credit System

### Per-action limits by plan

| Action | Free | Pro | Enterprise |
|--------|------|-----|------------|
| `analyze` (per 24h) | 10 | 300 | unlimited |
| `reverse` (per 24h) | 5 | 100 | unlimited |
| `web_builder` (per 24h) | 2 | 50 | unlimited |
| Max prompt length | 2,000 chars | 10,000 chars | 50,000 chars |
| Max files per request | 1 | 5 | 20 |

### Credit costs

| Action | Credits |
|--------|---------|
| Debug analyze | 1 |
| Reverse builder | 1 |
| Web builder generate | 10 |
| Web builder publish | 20 |
| Save session | 0 (free) |

### DB-backed rate limit query (safe, survives cold starts)

```sql
-- Count requests in the last 24 hours for a given user + action
SELECT COUNT(*) FROM public.analytics_usage_logs
WHERE user_id     = $1
  AND action_type = $2
  AND created_at  >= now() - interval '24 hours';
```

> **Never use in-memory Maps for rate limiting.** Deno edge functions restart on cold start, wiping the Map and resetting all counts. The `analytics_usage_logs` table is the source of truth.

---

## 10. Storage Buckets

```sql
-- Create buckets via Supabase dashboard or CLI
-- supabase storage create exports --public false
-- supabase storage create avatars --public true
```

| Bucket | Public | Purpose | Max size |
|--------|--------|---------|----------|
| `avatars` | Yes | User profile photos | 2 MB |
| `exports` | No | Debug session exports (PDF, .zip) | 10 MB |
| `screenshots` | No | AI-generated preview screenshots | 5 MB |

### Storage RLS policies

```sql
-- avatars: users manage their own folder
CREATE POLICY "avatars_select_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- exports: users access only their own files
CREATE POLICY "exports_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "exports_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 11. Realtime Subscriptions

Enable Realtime only on tables that need live updates.

```sql
-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debug_sessions;
```

### Client subscription examples

```typescript
// Live credit balance
const walletSub = supabase
  .channel('wallet-live')
  .on('postgres_changes', {
    event:  'UPDATE',
    schema: 'public',
    table:  'credit_wallets',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    setBalance(payload.new.balance);
  })
  .subscribe();

// New notification badge
const notifSub = supabase
  .channel('notifs-live')
  .on('postgres_changes', {
    event:  'INSERT',
    schema: 'public',
    table:  'notifications',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    setUnreadCount(c => c + 1);
    toast(payload.new.title);
  })
  .subscribe();

// Always clean up on unmount
return () => {
  supabase.removeChannel(walletSub);
  supabase.removeChannel(notifSub);
};
```

---

## 12. Environment Variables

### Server-side only (never expose to client)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...     # Admin key — server only. NEVER prefix with NEXT_PUBLIC_.

# AI
GROQ_API_KEY=gsk_...                       # Rotate immediately if ever committed to git
GROQ_MODEL=llama-3.3-70b-versatile

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...

# App
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
ALLOWED_ORIGIN=https://debuggai.com
```

### Client-safe (NEXT_PUBLIC_ prefix)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...   # Anon key — safe to expose (RLS protects data)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_APP_URL=https://debuggai.com
```

### Supabase Edge Function secrets (set via CLI)

```bash
supabase secrets set GROQ_API_KEY=gsk_...
supabase secrets set GROQ_MODEL=llama-3.3-70b-versatile
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
supabase secrets set ALLOWED_ORIGIN=https://debuggai.com

# Verify
supabase secrets list
```

---

## 13. Security Hardening Checklist

### Critical — do before first deploy

- [ ] **Rotate the Groq API key** if it has ever appeared in any committed file or environment dashboard screenshot
- [ ] **Confirm `SUPABASE_SERVICE_ROLE_KEY` is never prefixed `NEXT_PUBLIC_`** — this key bypasses all RLS
- [ ] **CORS locked** — `ALLOWED_ORIGIN` in edge functions must be your exact production domain, not `*`
- [ ] **Admin routes verified** — every `/api/admin/*` handler calls `public.is_admin()` via `supabaseAdmin.rpc()`, not a client-side claim
- [ ] **Stripe webhook signature verified** — `stripe.webhooks.constructEvent()` called before any event processing
- [ ] **Sandbox iframe attributes** — never include `allow-same-origin` in iframe sandbox. Use `allow-scripts allow-forms allow-modals` only
- [ ] **RLS enabled on all 12 tables** — run `SELECT tablename FROM pg_tables WHERE schemaname='public'` and verify each table has RLS enabled
- [ ] **No hardcoded fallback keys** — edge functions must `throw new Error('KEY not set')` if env var is missing, not silently use a hardcoded value
- [ ] **Supabase Auth redirect URLs** — allowlist only your production domain + localhost for dev

### Important — before launch

- [ ] **`SECURITY DEFINER` on profile trigger** — without it, new user signup fails silently (trigger runs as the new user who has no INSERT permission)
- [ ] **Rate limit is DB-backed** — confirm `analytics_usage_logs` is being written on every AI call; not just checked
- [ ] **Credit deduction is atomic** — confirm all AI endpoints call `deduct_credits()` RPC *before* streaming, not after
- [ ] **Double `req.json()` check** — each edge function parses the request body exactly once
- [ ] **Supabase Auth email confirmation** — enabled in Dashboard → Auth → Settings
- [ ] **Password minimum length** — set to 8+ in Supabase Auth settings
- [ ] **Audit log writes** — admin actions (`plan_override`, `credit_adjust`, `ban`) all insert to `audit_events`
- [ ] **Storage bucket policies** — `exports` and `screenshots` buckets are private; verify via Supabase dashboard
- [ ] **Content-Security-Policy header** — set on all responses; disallows `frame-src` to prevent clickjacking

### Good practice — ongoing

- [ ] Rotate `GROQ_API_KEY` every 90 days
- [ ] Review `abuse_events` weekly for rate limit abuse patterns
- [ ] Set up Supabase database backups (Dashboard → Database → Backups)
- [ ] Enable Supabase Point-in-Time Recovery (Pro plan)
- [ ] Monitor edge function cold start latency in Supabase dashboard
- [ ] Add Sentry DSN to both Next.js and edge functions for error tracking

---

## 14. Migration Execution Order

Run in this exact order. Each migration file must succeed before the next begins.

```
001_extensions.sql
002_enums.sql
003_profiles.sql
004_credit_wallets.sql
005_credit_transactions.sql
006_subscription_plans.sql          ← seed data included
007_debug_sessions.sql
008_web_builder_sessions.sql
009_referrals.sql
010_referral_payouts.sql
011_notifications.sql
012_audit_events.sql
013_abuse_events.sql
014_analytics_usage_logs.sql
015_rls_policies.sql
016_functions_and_triggers.sql
017_indexes.sql
018_storage_policies.sql
019_realtime.sql
```

### Deploy via Supabase CLI

```bash
# Link to project
supabase link --project-ref YOUR_PROJECT_REF

# Push all pending migrations
supabase db push --linked

# Verify tables
supabase db query "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

# Deploy edge functions
supabase functions deploy --all

# Verify secrets
supabase secrets list
```

---

*DeBuggAI Backend Reference — appbrainer.tech — April 2026*
