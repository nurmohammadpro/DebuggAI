---
name: db-migrator
description: Track 2 - Database & Schema (D01-D10). Create 5 new migrations, fix rate limiting, RLS policies, profile trigger, and audit access. P0-P1 priority.
type: skill
---

# Database & Schema Migrator

**Purpose**: Create new migrations for admin features, session persistence, and fix existing schema issues.

**Priority**: P0-P1 - Required for launch. 17 existing migrations are solid; need 5 new ones plus fixes.

---

## D01 - Migration 020: Add is_admin and stripe_customer_id

**Time**: 30 min | **Priority**: P0

**What's needed**: Admin column for route guards (S05), Stripe customer for subscription flow.

**File**: `supabase/migrations/020_profiles_admin.sql`

**SQL**:
```sql
-- Add admin flag for S05 route guard
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Index for Stripe customer lookups (P01)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe ON profiles(stripe_customer_id);

-- Comment
COMMENT ON COLUMN profiles.is_admin IS 'Admin access flag - controls /admin/* route access';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for subscription management';
```

**Verification**:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name IN ('is_admin', 'stripe_customer_id');
-- Should show both columns
```

**Run command**: `supabase db push --linked`

---

## D02 - Migration 021: debug_sessions Persistence Table

**Time**: 1 hr | **Priority**: P1

**What's needed**: Persist AI debug sessions for history feature (U01).

**File**: `supabase/migrations/021_debug_sessions.sql`

**SQL**:
```sql
-- Debug session storage for history feature
CREATE TABLE IF NOT EXISTS debug_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  prompt text NOT NULL,
  result text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('analyze', 'reverse', 'web')),
  files_count int DEFAULT 0,
  credits_spent int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS: Users own their rows
ALTER TABLE debug_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debug sessions"
  ON debug_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debug sessions"
  ON debug_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own debug sessions"
  ON debug_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Index for history queries
CREATE INDEX idx_debug_sessions_user_created ON debug_sessions(user_id, created_at DESC);
```

**Verification**:
```sql
-- Test RLS as anonymous (should return 0 rows)
SET ROLE anon;
SELECT COUNT(*) FROM debug_sessions;

-- Test RLS as authenticated user
SET ROLE authenticated;
SELECT COUNT(*) FROM debug_sessions;
```

---

## D03 - Migration 022: web_builder_sessions Table

**Time**: 45 min | **Priority**: P1

**What's needed**: Store full chat history per web builder session.

**File**: `supabase/migrations/022_web_builder_sessions.sql`

**SQL**:
```sql
-- Web builder session storage with full message history
CREATE TABLE IF NOT EXISTS web_builder_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages jsonb DEFAULT '[]'::jsonb,
  generated_html text,
  credits_spent int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS enforced
ALTER TABLE web_builder_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own web builder sessions"
  ON web_builder_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own web builder sessions"
  ON web_builder_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Message structure in jsonb:
-- [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
```

**Verification**:
```sql
INSERT INTO web_builder_sessions (user_id, messages)
VALUES (auth.uid(), '[{"role": "user", "content": "test"}]'::jsonb);
SELECT * FROM web_builder_sessions;
```

---

## D04 - Migration 023: Admin Audit Log View with RLS

**Time**: 1 hr | **Priority**: P1

**What's needed**: Unified audit log view protected by admin check.

**File**: `supabase/migrations/023_admin_audit.sql`

**SQL**:
```sql
-- Admin audit log - combines audit and abuse events
CREATE OR REPLACE VIEW admin_audit_log AS
SELECT
  'audit' as source_type,
  ae.id,
  ae.user_id,
  ae.action,
  ae.metadata,
  ae.created_at
FROM audit_events ae
UNION ALL
SELECT
  'abuse' as source_type,
  ab.id,
  ab.reported_user_id as user_id,
  'abuse_report' as action,
  jsonb_build_object(
    'reason', ab.reason,
    'reporter_id', ab.reporter_id,
    'status', ab.status
  ) as metadata,
  ab.created_at
FROM abuse_events ab;

-- Admin check function (SECURITY DEFINER runs with elevated permissions)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$;

-- RLS on view via function
CREATE POLICY "Only admins can view audit log"
  ON admin_audit_log FOR SELECT
  USING (is_admin());

-- Grant access
GRANT SELECT ON admin_audit_log TO authenticated;
```

**Verification**:
```sql
-- As non-admin user, should return 0 rows
SET ROLE authenticated;
SELECT * FROM admin_audit_log LIMIT 1;
```

---

## D05 - Migration 024: Notifications read_at Column

**Time**: 20 min | **Priority**: P2

**What's needed**: Add read tracking for unread badge count.

**File**: `supabase/migrations/024_notifications_read.sql`

**SQL**:
```sql
-- Add read timestamp for notification tracking
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS read_at timestamptz DEFAULT null;

-- Update RLS to allow users to mark own notifications as read
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for unread count queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id) WHERE read_at IS NULL;
```

**Verification**:
```sql
-- Mark notification as read
UPDATE notifications
SET read_at = now()
WHERE id = 'some-uuid' AND user_id = auth.uid();
```

---

## D06 - Replace In-Memory Rate Limiter

**Time**: 2 hr | **Priority**: P0

**What's broken**: Current Deno `Map<string,{count,resetAt}>` resets on every cold start.

**Files**:
- `supabase/functions/generate-web-code/index.ts`
- `supabase/functions/debug-ai-reverse/index.ts`

**Fix pattern** (copy from `debug-ai-analyze` which already does this correctly):
```typescript
async function checkRateLimit(userId: string, actionType: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('analytics_usage_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (error) throw error;
  return (data?.length ?? 0) < 10; // 10 requests per 24h
}
```

**Verification**: Rate limit persists across cold starts.

---

## D07 - Add Composite Index for Rate Limit Queries

**Time**: 15 min | **Priority**: P1

**What's needed**: Makes rate limit count query O(log n) instead of O(n).

**File**: Add to existing migration or create new one.

**SQL**:
```sql
-- Composite index for rate limit queries
CREATE INDEX IF NOT EXISTS idx_usage_rate
  ON analytics_usage_logs(user_id, action_type, created_at DESC);

-- Verify index usage
EXPLAIN ANALYZE
SELECT count(*) FROM analytics_usage_logs
WHERE user_id = 'test-uuid'
  AND action_type = 'analyze'
  AND created_at > now() - interval '24 hours';
-- Should show "Index Scan using idx_usage_rate"
```

---

## D08 - Fix handle_new_user Trigger for Credit Wallet

**Time**: 30 min | **Priority**: P1

**What's broken**: Signup trigger creates profiles row but NOT credit_wallet row. First generation fails.

**File**: Find in existing migrations, update the trigger function.

**SQL**:
```sql
-- Update the trigger function to also create credit wallet
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile row (existing)
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');

  -- Create credit wallet with 30 free credits (NEW)
  INSERT INTO credit_wallets (owner_type, owner_id, balance)
  VALUES ('user', NEW.id, 30)
  ON CONFLICT (owner_type, owner_id) DO NOTHING;

  RETURN NEW;
END;
$$;
```

**Verification**:
```sql
-- After signup, check wallet exists
SELECT * FROM credit_wallets WHERE owner_id = 'new-user-id';
-- Should show balance = 30
```

---

## D09 - Audit RLS Policies on debug_cases Tables

**Time**: 45 min | **Priority**: P1

**What's needed**: Verify RLS on debug_cases, debug_artifacts, debug_nodes, debug_edges is complete.

**File**: `supabase/migrations/006_debug_graph_core.sql` (review)

**Verification**:
```sql
-- Test as anonymous (should return 0 rows)
SET ROLE anon;
SELECT * FROM debug_cases;

-- Test as owner (should return own rows only)
SET ROLE authenticated;
SELECT * FROM debug_cases WHERE user_id = auth.uid();

-- Check each policy
SELECT
  schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('debug_cases', 'debug_artifacts', 'debug_nodes', 'debug_edges');
```

**Expected policies**:
- Users can SELECT own rows
- Users can INSERT own rows
- Users can UPDATE own rows
- Users can DELETE own rows

---

## D10 - Verify Free User Credits on Signup

**Time**: 30 min | **Priority**: P1

**What's needed**: Confirm new users start with 30 credits (matches plan table).

**Verification**:
```sql
-- Check plan table for free tier
SELECT included_credits FROM plans WHERE name = 'free';
-- Should be 30

-- After D08 fix, verify new user gets 30 credits
SELECT w.balance FROM credit_wallets w
JOIN profiles p ON w.owner_id = p.id
WHERE p.id = 'new-user-id';
-- Should be 30
```

---

## Completion Checklist

- [ ] D01: Migration 020 created and applied
- [ ] D02: Migration 021 created and applied
- [ ] D03: Migration 022 created and applied
- [ ] D04: Migration 023 created and applied
- [ ] D05: Migration 024 created and applied
- [ ] D06: All edge functions use DB-backed rate limiting
- [ ] D07: Composite index created and verified
- [ ] D08: handle_new_user trigger creates credit_wallet
- [ ] D09: RLS policies audited on all debug tables
- [ ] D10: Free users get 30 credits on signup

**Next tracks**: Track 3 (Backend bugs) or Track 4 (Flutter Core).
