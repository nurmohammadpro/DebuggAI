# DeBuggAI — Database Schema Reference

> **Stack:** Supabase (PostgreSQL + Auth + Realtime)  
> **Principle:** Every table has RLS. Every write is audited. Secrets never touch client code.

---

## Table of Contents

1. [Custom ENUM Types](#1-custom-enum-types)
2. [Core Tables](#2-core-tables)
3. [Debug Service Tables](#3-debug-service-tables)
4. [Web Builder Tables](#4-web-builder-tables)
5. [Referral & Ambassador Tables](#5-referral--ambassador-tables)
6. [System Tables](#6-system-tables)
7. [Row Level Security](#7-row-level-security)
8. [Database Functions & Triggers](#8-database-functions--triggers)
9. [Performance Indexes](#9-performance-indexes)
10. [Realtime Configuration](#10-realtime-configuration)
11. [Migration Execution Order](#11-migration-execution-order)

---

## 1. Custom ENUM Types

```sql
-- Plan tiers
CREATE TYPE public.plan_type AS ENUM ('free', 'pro', 'enterprise');

-- Transaction types (immutable ledger)
CREATE TYPE public.transaction_type AS ENUM (
  'credit_added',       -- Welcome bonus, purchase, referral
  'credit_spent',       -- AI usage
  'subscription_reset', -- Monthly reset
  'referral_bonus',     -- Referral rewards
  'admin_adjustment',   -- Manual admin changes
  'purchase'            -- Direct credit purchase
);

-- Referral lifecycle
CREATE TYPE public.referral_status AS ENUM (
  'pending', 'completed', 'failed', 'expired'
);

-- Payout states for ambassador program
CREATE TYPE public.payout_status AS ENUM (
  'pending', 'approved', 'processing', 'paid', 'rejected'
);

-- Core product actions
CREATE TYPE public.debug_action_type AS ENUM (
  'analyze',     -- Debug analysis
  'reverse',     -- Reverse engineer
  'web_builder'  -- v0.dev-like generation
);

-- Web builder template categories
CREATE TYPE public.template_category AS ENUM (
  'landing_page', 'dashboard', 'ecommerce',
  'auth', 'marketing', 'saas', 'portfolio'
);
```

---

## 2. Core Tables

### 2.1 profiles
Extends `auth.users` with app-specific identity. Never store passwords here.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, FK → auth.users | User identity |
| `email` | TEXT | NOT NULL, UNIQUE | Contact email |
| `full_name` | TEXT | | Display name |
| `username` | TEXT | UNIQUE, regex `^[a-z0-9_]{3,30}$` | Public handle |
| `avatar_url` | TEXT | | Profile image |
| `plan_type` | plan_type | DEFAULT 'free' | Subscription tier |
| `stripe_customer_id` | TEXT | UNIQUE | Stripe billing ID |
| `is_admin` | BOOLEAN | DEFAULT false | Admin flag (server-side only) |
| `is_ambassador` | BOOLEAN | DEFAULT false | Ambassador status |
| `referral_code` | TEXT | UNIQUE, auto-generated | Referral identifier |
| `zero_knowledge_mode` | BOOLEAN | DEFAULT false | Opt-out of AI persistence |
| `last_login_at` | TIMESTAMPTZ | | Last session timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Account creation |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last profile update |

```sql
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
```

### 2.2 credit_wallets
Atomic balance storage. One row per user. No negative balances.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Wallet ID |
| `user_id` | UUID | NOT NULL, UNIQUE, FK → profiles | Owner |
| `balance` | INTEGER | NOT NULL, DEFAULT 30, CHECK ≥ 0 | Current credits |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update |

```sql
CREATE TABLE public.credit_wallets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance     INTEGER NOT NULL DEFAULT 30 CHECK (balance >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.3 credit_transactions
**Immutable ledger.** Never UPDATE or DELETE.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Transaction ID |
| `wallet_id` | UUID | NOT NULL, FK → credit_wallets | Parent wallet |
| `amount` | INTEGER | NOT NULL | Positive = add, negative = spend |
| `type` | transaction_type | NOT NULL | Transaction category |
| `description` | TEXT | | Human-readable note |
| `metadata` | JSONB | DEFAULT '{}' | Context (action_type, etc.) |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Transaction time |

```sql
CREATE TABLE public.credit_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id   UUID NOT NULL REFERENCES public.credit_wallets(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,
  type        transaction_type NOT NULL,
  description TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.4 subscription_plans
Static seed data defining tiers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Plan ID |
| `name` | TEXT | NOT NULL, UNIQUE | Plan name |
| `stripe_price_id` | TEXT | UNIQUE | Stripe price reference |
| `price_monthly` | NUMERIC(8,2) | DEFAULT 0 | Monthly cost |
| `credits_per_month` | INTEGER | NOT NULL | Monthly credit allocation |
| `history_days` | INTEGER | DEFAULT 30 | Session retention period |
| `features` | JSONB | DEFAULT '[]' | Feature flags |
| `is_active` | BOOLEAN | DEFAULT true | Visibility |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation |

**Seed Data:**

| Name | Price | Credits | History | Features |
|------|-------|---------|---------|----------|
| free | $0 | 30 | 30 days | analyze, reverse |
| pro | $9 | 300 | 365 days | +web_builder, zero_knowledge, priority_ai |
| enterprise | $49 | Unlimited | 730 days | +admin_api, sla |

```sql
INSERT INTO public.subscription_plans
  (name, price_monthly, credits_per_month, history_days, features)
VALUES
  ('free',       0,   30,        30,  '["analyze","reverse"]'),
  ('pro',        9,   300,       365, '["analyze","reverse","web_builder","zero_knowledge","priority_ai"]'),
  ('enterprise', 49,  2147483647, 730, '["analyze","reverse","web_builder","zero_knowledge","priority_ai","admin_api","sla"]');
```

---

## 3. Debug Service Tables

### 3.1 debug_sessions
AI debugging history with soft-delete via retention window.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Session ID |
| `user_id` | UUID | NOT NULL, FK → profiles | Owner |
| `title` | TEXT | | User-defined title |
| `prompt` | TEXT | NOT NULL | User input |
| `result` | TEXT | | AI output (NULL while streaming) |
| `action_type` | debug_action_type | NOT NULL | analyze / reverse / web_builder |
| `language` | TEXT | | Auto-detected language |
| `files_count` | INTEGER | DEFAULT 0 | Attached files |
| `credits_spent` | INTEGER | DEFAULT 1 | Cost |
| `model_used` | TEXT | | AI model identifier |
| `tokens_in` | INTEGER | | Input tokens |
| `tokens_out` | INTEGER | | Output tokens |
| `duration_ms` | INTEGER | | Processing time |
| `is_zero_knowledge` | BOOLEAN | DEFAULT false | Privacy mode |
| `is_saved` | BOOLEAN | DEFAULT false | User bookmark |
| `tags` | TEXT[] | DEFAULT '{}' | Searchable tags |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Session start |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update |

```sql
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
```

### 3.2 debug_session_files
Normalized file storage for multi-file debug sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | File ID |
| `session_id` | UUID | NOT NULL, FK → debug_sessions | Parent session |
| `file_name` | TEXT | NOT NULL | Original filename |
| `language` | TEXT | | Detected language |
| `content` | TEXT | NOT NULL | File contents |
| `is_error_source` | BOOLEAN | DEFAULT false | File containing error |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Upload time |

```sql
CREATE TABLE public.debug_session_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.debug_sessions(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  language        TEXT,
  content         TEXT NOT NULL,
  is_error_source BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. Web Builder Tables

### 4.1 web_builder_sessions
Core session state for the visual builder.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Session ID |
| `user_id` | UUID | NOT NULL, FK → profiles | Owner |
| `title` | TEXT | DEFAULT 'Untitled Project' | Display name |
| `description` | TEXT | | Project notes |
| `messages` | JSONB | DEFAULT '[]' | Chat history [{role, content, timestamp}] |
| `generated_html` | TEXT | | Latest HTML output |
| `generated_code` | TEXT | | Full component code |
| `stack` | TEXT | DEFAULT 'react' | react, vue, svelte, vanilla |
| `template_id` | UUID | FK → web_builder_templates | Starter template |
| `is_public` | BOOLEAN | DEFAULT false | Gallery visibility |
| `forked_from` | UUID | FK → web_builder_sessions | Source fork |
| `view_count` | INTEGER | DEFAULT 0 | Public views |
| `credits_spent` | INTEGER | DEFAULT 0 | Total cost |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last edit |

```sql
CREATE TABLE public.web_builder_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT 'Untitled Project',
  description     TEXT,
  messages        JSONB NOT NULL DEFAULT '[]',
  generated_html  TEXT,
  generated_code  TEXT,
  stack           TEXT DEFAULT 'react',
  template_id     UUID REFERENCES public.web_builder_templates(id),
  is_public       BOOLEAN NOT NULL DEFAULT false,
  forked_from     UUID REFERENCES public.web_builder_sessions(id) ON DELETE SET NULL,
  view_count      INTEGER NOT NULL DEFAULT 0,
  credits_spent   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.2 web_builder_versions
Immutable version history (Git-like commits for UI).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Version ID |
| `session_id` | UUID | NOT NULL, FK → web_builder_sessions | Parent |
| `version_number` | INTEGER | NOT NULL | Sequential version |
| `commit_message` | TEXT | | User note |
| `code_snapshot` | TEXT | NOT NULL | Frozen code |
| `html_snapshot` | TEXT | | Frozen HTML |
| `preview_image_url` | TEXT | | Storage bucket ref |
| `prompt_used` | TEXT | | AI prompt that generated this |
| `model_used` | TEXT | | AI model |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Snapshot time |

```sql
CREATE TABLE public.web_builder_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES public.web_builder_sessions(id) ON DELETE CASCADE,
  version_number    INTEGER NOT NULL,
  commit_message    TEXT,
  code_snapshot     TEXT NOT NULL,
  html_snapshot     TEXT,
  preview_image_url TEXT,
  prompt_used       TEXT,
  model_used        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, version_number)
);
```

### 4.3 web_builder_templates
Pre-built starter templates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Template ID |
| `name` | TEXT | NOT NULL | Display name |
| `description` | TEXT | | Summary |
| `category` | template_category | NOT NULL | UI category |
| `thumbnail_url` | TEXT | | Preview image |
| `preview_html` | TEXT | NOT NULL | Rendered preview |
| `starter_code` | TEXT | NOT NULL | Initial code |
| `stack` | TEXT | DEFAULT 'react' | Tech stack |
| `tags` | TEXT[] | DEFAULT '{}' | Search tags |
| `is_official` | BOOLEAN | DEFAULT false | Platform curated |
| `is_active` | BOOLEAN | DEFAULT true | Visibility |
| `usage_count` | INTEGER | DEFAULT 0 | Times used |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update |

```sql
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
```

---

## 5. Referral & Ambassador Tables

### 5.1 referrals
Tracks referral relationships.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Referral ID |
| `referrer_id` | UUID | NOT NULL, FK → profiles | Inviter |
| `referee_id` | UUID | FK → profiles | Invited user |
| `referral_code` | TEXT | NOT NULL | Code used |
| `status` | referral_status | DEFAULT 'pending' | Lifecycle state |
| `credits_awarded` | INTEGER | DEFAULT 0 | Credits given |
| `completed_at` | TIMESTAMPTZ | | Completion time |
| `expires_at` | TIMESTAMPTZ | DEFAULT now()+30d | Expiration |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation |

```sql
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
```

### 5.2 referral_payouts
Monthly ambassador commission batches.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Payout ID |
| `user_id` | UUID | NOT NULL, FK → profiles | Ambassador |
| `amount_usd` | NUMERIC(10,2) | CHECK > 0 | Commission amount |
| `period_month` | DATE | NOT NULL | First day of month |
| `referral_count` | INTEGER | DEFAULT 0 | Qualified referrals |
| `status` | payout_status | DEFAULT 'pending' | Processing state |
| `stripe_transfer_id` | TEXT | | Stripe transfer ref |
| `approved_by` | UUID | FK → profiles | Admin approver |
| `notes` | TEXT | | Internal notes |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation |
| `paid_at` | TIMESTAMPTZ | | Payment time |

```sql
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
```

---

## 6. System Tables

### 6.1 notifications
User-facing notification inbox.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Notification ID |
| `user_id` | UUID | NOT NULL, FK → profiles | Recipient |
| `title` | TEXT | NOT NULL | Headline |
| `body` | TEXT | | Details |
| `type` | TEXT | DEFAULT 'info' | info / success / warning / error |
| `action_url` | TEXT | | Deep link |
| `is_read` | BOOLEAN | DEFAULT false | Read status |
| `read_at` | TIMESTAMPTZ | | Read timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation |

```sql
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
```

### 6.2 audit_events
Immutable security & admin audit trail.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Event ID |
| `user_id` | UUID | FK → profiles | Actor |
| `action` | TEXT | NOT NULL | Event type |
| `target_id` | UUID | | Affected resource |
| `target_type` | TEXT | | Resource category |
| `ip_address` | INET | | Origin IP |
| `user_agent` | TEXT | | Client UA |
| `metadata` | JSONB | DEFAULT '{}' | Context |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Event time |

```sql
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
```

### 6.3 abuse_events
Rate limit violations & suspicious activity.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Event ID |
| `user_id` | UUID | FK → profiles | Offender |
| `ip_address` | INET | | Origin IP |
| `event_type` | TEXT | NOT NULL | rate_limit_hit / invalid_token / credit_race |
| `endpoint` | TEXT | | API endpoint |
| `metadata` | JSONB | DEFAULT '{}' | Context |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Event time |

```sql
CREATE TABLE public.abuse_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address  INET,
  event_type  TEXT NOT NULL,
  endpoint    TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6.4 analytics_usage_logs
DB-backed rate limiting (survives cold starts).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Log ID |
| `user_id` | UUID | NOT NULL, FK → profiles | Actor |
| `action_type` | debug_action_type | NOT NULL | Action category |
| `ip_address` | INET | | Origin IP |
| `credits_used` | INTEGER | DEFAULT 1 | Cost |
| `model_used` | TEXT | | AI model |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Event time |

```sql
CREATE TABLE public.analytics_usage_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type  debug_action_type NOT NULL,
  ip_address   INET,
  credits_used INTEGER NOT NULL DEFAULT 1,
  model_used   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 7. Row Level Security

Enable RLS on every table:

```sql
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
```

### Core Policies

```sql
-- profiles: Public read, self-only update (prevent privilege escalation)
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
    AND plan_type = (SELECT plan_type FROM public.profiles WHERE id = auth.uid())
  );

-- credit_wallets: Self-only read, no direct update (use RPC)
CREATE POLICY "wallets_select_own"
  ON public.credit_wallets FOR SELECT USING (auth.uid() = user_id);

-- credit_transactions: Self-only read
CREATE POLICY "transactions_select_own"
  ON public.credit_transactions FOR SELECT
  USING (wallet_id IN (
    SELECT id FROM public.credit_wallets WHERE user_id = auth.uid()
  ));

-- subscription_plans: Public read
CREATE POLICY "plans_select_all"
  ON public.subscription_plans FOR SELECT USING (is_active = true);

-- debug_sessions: Full CRUD for owner
CREATE POLICY "sessions_select_own"
  ON public.debug_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own"
  ON public.debug_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own"
  ON public.debug_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sessions_delete_own"
  ON public.debug_sessions FOR DELETE USING (auth.uid() = user_id);

-- debug_session_files: Cascade via session ownership
CREATE POLICY "session_files_select"
  ON public.debug_session_files FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.debug_sessions WHERE user_id = auth.uid()
  ));

-- web_builder_sessions: Owner + public read
CREATE POLICY "wb_select"
  ON public.web_builder_sessions FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "wb_insert_own"
  ON public.web_builder_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wb_update_own"
  ON public.web_builder_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "wb_delete_own"
  ON public.web_builder_sessions FOR DELETE USING (auth.uid() = user_id);

-- web_builder_versions: Cascade via session ownership
CREATE POLICY "wb_versions_select"
  ON public.web_builder_versions FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.web_builder_sessions
    WHERE user_id = auth.uid() OR is_public = true
  ));

-- web_builder_templates: Public read
CREATE POLICY "templates_select_public"
  ON public.web_builder_templates FOR SELECT USING (is_active = true);

-- referrals: Involved parties only
CREATE POLICY "referrals_select_involved"
  ON public.referrals FOR SELECT
  USING (auth.uid() IN (referrer_id, referee_id));

-- referral_payouts: Self-only
CREATE POLICY "payouts_select_own"
  ON public.referral_payouts FOR SELECT USING (auth.uid() = user_id);

-- notifications: Self-only
CREATE POLICY "notifs_select_own"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifs_update_own"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- audit_events: Self read (admin via SECURITY DEFINER)
CREATE POLICY "audit_select_own"
  ON public.audit_events FOR SELECT USING (auth.uid() = user_id);
```

---

## 8. Database Functions & Triggers

### Auto-create profile + wallet on signup

```sql
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
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Atomic credit deduction (race-condition safe)

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
  UPDATE public.credit_wallets
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id AND balance >= p_amount
  RETURNING id, balance INTO v_wallet_id, v_new_balance;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits');
  END IF;

  INSERT INTO public.credit_transactions
    (wallet_id, amount, type, description, metadata)
  VALUES
    (v_wallet_id, -p_amount, 'credit_spent',
     COALESCE(p_description, p_action_type),
     jsonb_build_object('action_type', p_action_type));

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'wallet_id', v_wallet_id);
END;
$$;
```

### Add credits

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
  SET balance = balance + p_amount, updated_at = now()
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

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;
```

### Safe admin check

```sql
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = p_user_id), false);
$$;
```

### Claim referral

```sql
CREATE OR REPLACE FUNCTION public.claim_referral(
  p_referee_id    UUID,
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
  SELECT id INTO v_referrer_id
  FROM public.profiles
  WHERE referral_code = p_referral_code AND id != p_referee_id;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.referrals
    WHERE referrer_id = v_referrer_id AND referee_id = p_referee_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;

  INSERT INTO public.referrals
    (referrer_id, referee_id, referral_code, status, credits_awarded)
  VALUES
    (v_referrer_id, p_referee_id, p_referral_code, 'completed', 10);

  PERFORM public.add_credits(v_referrer_id, 10, 'referral_bonus',
    'Referral bonus — new user signed up', '{}');
  PERFORM public.add_credits(p_referee_id, 10, 'referral_bonus',
    'Referral bonus — signed up with referral code', '{}');

  RETURN jsonb_build_object('success', true, 'referrer_id', v_referrer_id);
END;
$$;
```

### Generic updated_at trigger

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON public.credit_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON public.debug_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_wb_sessions_updated_at
  BEFORE UPDATE ON public.web_builder_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_templates_updated_at
  BEFORE UPDATE ON public.web_builder_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

---

## 9. Performance Indexes

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
CREATE INDEX idx_sessions_user_created     ON public.debug_sessions(user_id, created_at DESC);
CREATE INDEX idx_sessions_action_type      ON public.debug_sessions(user_id, action_type);
CREATE INDEX idx_sessions_tags             ON public.debug_sessions USING GIN(tags);
CREATE INDEX idx_sessions_title_trgm       ON public.debug_sessions USING GIN(title gin_trgm_ops);

-- debug_session_files
CREATE INDEX idx_session_files_session     ON public.debug_session_files(session_id);

-- web_builder_sessions
CREATE INDEX idx_wb_user_id                ON public.web_builder_sessions(user_id);
CREATE INDEX idx_wb_public                 ON public.web_builder_sessions(is_public) WHERE is_public = true;
CREATE INDEX idx_wb_created_at             ON public.web_builder_sessions(created_at DESC);
CREATE INDEX idx_wb_forked                 ON public.web_builder_sessions(forked_from);

-- web_builder_versions
CREATE INDEX idx_wb_versions_session       ON public.web_builder_versions(session_id, version_number DESC);

-- referrals
CREATE INDEX idx_referrals_referrer        ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referee         ON public.referrals(referee_id);
CREATE INDEX idx_referrals_code            ON public.referrals(referral_code);

-- analytics_usage_logs (critical for rate limiting)
CREATE INDEX idx_usage_rate_limit
  ON public.analytics_usage_logs(user_id, action_type, created_at DESC);

-- notifications
CREATE INDEX idx_notifs_user_unread
  ON public.notifications(user_id, is_read) WHERE is_read = false;

-- audit_events
CREATE INDEX idx_audit_user_id             ON public.audit_events(user_id);
CREATE INDEX idx_audit_created_at          ON public.audit_events(created_at DESC);
CREATE INDEX idx_audit_action              ON public.audit_events(action);

-- abuse_events
CREATE INDEX idx_abuse_user_id             ON public.abuse_events(user_id);
CREATE INDEX idx_abuse_created_at          ON public.abuse_events(created_at DESC);
```

---

## 10. Realtime Configuration

Enable live updates for critical tables:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debug_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.web_builder_sessions;
```

---

## 11. Migration Execution Order

Run in this exact sequence. Each file must succeed before the next begins.

```
001_extensions.sql          -- uuid-ossp, pgcrypto, pg_trgm
002_enums.sql               -- All custom types
003_profiles.sql            -- Core user identity
004_credit_wallets.sql      -- Balance storage
005_credit_transactions.sql -- Immutable ledger
006_subscription_plans.sql  -- Plan definitions + seed data
007_debug_sessions.sql      -- AI debug history
008_debug_session_files.sql -- Multi-file support
009_web_builder_sessions.sql -- Builder state
010_web_builder_versions.sql -- Version history
011_web_builder_templates.sql -- Starter templates
012_referrals.sql           -- Referral tracking
013_referral_payouts.sql    -- Ambassador payouts
014_notifications.sql       -- User inbox
015_audit_events.sql        -- Security trail
016_abuse_events.sql        -- Violations
017_analytics_usage_logs.sql -- Rate limit data
018_rls_policies.sql        -- Row Level Security
019_functions_triggers.sql  -- DB logic
020_indexes.sql             -- Performance
021_realtime.sql            -- Live subscriptions
```

### Deploy via Supabase CLI

```bash
# Link to project
supabase link --project-ref YOUR_PROJECT_REF

# Push all pending migrations
supabase db push --linked

# Verify tables and RLS
supabase db query "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

# Verify indexes
supabase db query "SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;"

# Deploy edge functions
supabase functions deploy --all

# Verify secrets
supabase secrets list
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Separate `debug_sessions` and `web_builder_sessions`** | Different access patterns, retention policies, and AI contexts |
| **Immutable `credit_transactions`** | Financial audit trail; prevents tampering |
| **JSONB `messages` in web_builder** | Chat history is append-only; schema flexibility for rich content |
| **Separate `web_builder_versions`** | Git-like history without bloating the main session row |
| **DB-backed rate limiting** | Edge functions cold-start wipe in-memory Maps |
| **`zero_knowledge_mode`** | Privacy-conscious users can opt out of AI persistence |
| **`is_public` on builder sessions** | Enables template gallery and community sharing |
| **RLS on every table** | Defense in depth; never trust client |

---

*DeBuggAI Database Schema Reference — April 2026*
