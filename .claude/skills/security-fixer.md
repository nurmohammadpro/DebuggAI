---
name: security-fixer
description: Track 1 - Security & Secrets (S01-S08). Fix exposed API keys, unguarded admin routes, CORS, and auth configuration. P0 critical priority.
type: skill
---

# Security & Secrets Fixer

**Purpose**: Fix critical security vulnerabilities in DeBuggAI before any other work.

**Priority**: P0 - Do these before anything else. Three edge functions have a live API key hardcoded. Admin routes have zero access control.

## Quick Start Checklist (Do in order)

1. [ ] S01 - Rotate the leaked Groq API key (30 min)
2. [ ] S02 - Remove hardcoded key fallbacks from all edge functions (1 hr)
3. [ ] S03 - Set all production Supabase secrets (30 min)
4. [ ] S04 - Remove real Supabase URL + anon key from env.dart defaults (30 min)
5. [ ] S05 - Guard /admin/* routes with server-side role check (2 hr)
6. [ ] S06 - Restrict CORS to your actual domain (1 hr)
7. [ ] S07 - Add Supabase Auth redirect URL allowlist (30 min)
8. [ ] S08 - Verify no secrets were ever committed to git (15 min)

---

## S01 - Rotate the Leaked Groq API Key

**Time**: 30 min | **Priority**: P0

**What's broken**: Key `gsk_3vMlOd9dRtRiOA2MTU...` is hardcoded in 3 edge functions.

**Steps**:
1. Go to Groq console dashboard
2. Rotate/create new API key
3. Save the new key for S03

**Files involved**: None (Groq dashboard only)

**Verification**: New key works in production.

---

## S02 - Remove Hardcoded Key Fallbacks

**Time**: 1 hr | **Priority**: P0

**What's broken**: All three edge functions have hardcoded `"gsk_..."` fallback strings.

**Files**:
- `supabase/functions/debug-ai-analyze/index.ts`
- `supabase/functions/debug-ai-reverse/index.ts`
- `supabase/functions/generate-web-code/index.ts`

**Fix for each file**:
```typescript
// BEFORE (BAD)
const apiKey = Deno.env.get('AI_API_KEY') ?? 'gsk_3vMlOd9dRtRiOA2MTU...';

// AFTER (GOOD)
const apiKey = Deno.env.get('AI_API_KEY');
if (!apiKey) {
  throw new Error('AI_API_KEY not set');
}
```

**Verification**: Each function throws "AI_API_KEY not set" when env var is missing.

**Command to test**:
```bash
# Remove env var temporarily to verify error is thrown
supabase functions deploy debug-ai-analyze --no-verify-jwt
curl -X POST $(supabase status | grep 'API URL' | awk '{print $3}')/functions/v1/debug-ai-analyze
# Should return: {"error":"AI_API_KEY not set"}
```

---

## S03 - Set All Production Supabase Secrets

**Time**: 30 min | **Priority**: P0

**What's needed**: Set all secrets in production Supabase project.

**Command**:
```bash
# Set each secret (use the NEW key from S01)
supabase secrets set AI_API_KEY=gsk_NEW_KEY_HERE
supabase secrets set AI_BASE_URL=https://api.groq.com/openai/v1
supabase secrets set AI_MODEL=llama-3.3-70b-versatile
supabase secrets set STRIPE_SECRET_KEY=sk_live_XXX
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_XXX

# Verify
supabase secrets list
```

**Verification**: `supabase secrets list` shows all 5 secrets.

---

## S04 - Remove Supabase Credentials from env.dart

**Time**: 30 min | **Priority**: P0

**What's broken**: Production project URL (`htdybnbstdexitbpmwai.supabase.co`) and full JWT anon key are committed.

**File**: `lib/src/config/env.dart`

**Fix**:
```dart
// BEFORE (BAD)
static const String supabaseUrl = String.fromEnvironment(
  'SUPABASE_URL',
  defaultValue: 'https://htdybnbstdexitbpmwai.supabase.co',
);

static const String supabaseAnonKey = String.fromEnvironment(
  'SUPABASE_ANON_KEY',
  defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
);

// AFTER (GOOD)
static const String supabaseUrl = String.fromEnvironment(
  'SUPABASE_URL',
  defaultValue: '', // Empty default - must be provided via --dart-define
);

static const String supabaseAnonKey = String.fromEnvironment(
  'SUPABASE_ANON_KEY',
  defaultValue: '', // Empty default - must be provided via --dart-define
);
```

**Verification**: App shows "App not configured" screen when env vars not set (see U11).

---

## S05 - Guard /admin/* Routes with Role Check

**Time**: 2 hr | **Priority**: P0

**What's broken**: Any logged-in user can navigate to `/admin/abuse`, `/admin/promo`, `/admin/ambassadors`.

**Prerequisites**: D01 migration must be run first (adds `is_admin` column).

**Files**:
- `lib/src/core/app_router.dart`
- `lib/src/services/session_store.dart` (see F08 for is_admin fetch)

**Fix in app_router.dart**:
```dart
// Add admin route guard
GoRoute(
  path: '/admin/abuse',
  redirect: (context, state) {
    final session = SessionStore.of(context);
    if (session?.isAdmin != true) {
      return '/'; // Redirect non-admins to home
    }
    return null; // Allow access
  },
  // ... rest of route config
),
```

**Verification**:
1. Create test user without is_admin=true
2. Log in and try to navigate to /admin/abuse
3. Should redirect to home page

---

## S06 - Restrict CORS to Actual Domain

**Time**: 1 hr | **Priority**: P1

**What's broken**: `Access-Control-Allow-Origin: '*'` allows any website to make authenticated calls.

**Files**: All `supabase/functions/*/index.ts`

**Fix**:
```typescript
// BEFORE (BAD)
return new Response(JSON.stringify(data), {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  },
});

// AFTER (GOOD)
const allowedOrigins = [
  'https://your-production-domain.com',
  'http://localhost:3000',
];
const origin = req.headers.get('Origin') ?? '';
const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

return new Response(JSON.stringify(data), {
  headers: {
    'Access-Control-Allow-Origin': corsOrigin,
    'Content-Type': 'application/json',
  },
});
```

**Verification**: Test from unauthorized domain - requests should be blocked by CORS.

---

## S07 - Add Supabase Auth Redirect URL Allowlist

**Time**: 30 min | **Priority**: P1

**Steps**:
1. Go to Supabase dashboard > Auth > URL Configuration
2. Set Site URL to your production domain
3. Add redirect URLs (your domain + auth callback paths)
4. Remove any wildcard entries (`*`)

**Verification**: OAuth tokens can only be sent to configured URLs.

---

## S08 - Verify No Secrets Committed to Git

**Time**: 15 min | **Priority**: P1

**Commands**:
```bash
# Check for env files in history
git log --all --full-history -- "*.env*"

# Check for the leaked Groq key in history
git log --all -S "gsk_"

# If found, rotate ALL affected keys immediately
```

**Verification**: Both commands return no results.

**If secrets are found**:
1. Rotate every key that appears in history
2. Consider `git filter-repo` or `BFG Repo-Cleaner` to remove from history
3. Force push cleaned history

---

## Completion Checklist

- [ ] S01: New Groq API key created
- [ ] S02: All hardcoded key fallbacks removed (3 functions verified)
- [ ] S03: All 5 Supabase secrets set
- [ ] S04: env.dart has empty string defaults
- [ ] S05: Admin routes redirect non-admins (requires D01 + F08)
- [ ] S06: CORS restricted to production domain + localhost
- [ ] S07: Supabase Auth allowlist configured
- [ ] S08: Git history clean (no secrets found)

**Next tracks**: Proceed to Track 2 (Database & Schema) or Track 3 (Backend bugs).
