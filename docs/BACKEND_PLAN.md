# DeBuggAI — Backend Implementation Plan (API + DB)

This plan is derived from `DeBuggAI_Backend_API_DB_Reference.md` and aligns with the current v1 frontend UI:
- v1 “Projects” remain `public.generations` until we introduce a dedicated `projects` table.
- No schema work is required to keep the current UI functioning, but the steps below define the backend phase we’ll start next.

---

## Phase 0 — Baseline verification (before DB changes)
1. Confirm Supabase “Site URL” + redirect URLs match production (Vercel) so email confirmation never lands on `localhost`.
2. Confirm API route auth contract:
   - Client always sends `Authorization: Bearer <access_token>`.
   - Server verifies JWT and uses service-role only for admin-only operations.

---

## Phase 1 — Database schema (bring Supabase to the reference spec)
Goal: ship the schema described in `DeBuggAI_Backend_API_DB_Reference.md` with strict RLS + safe admin patterns.

1. **Extensions + enums**
   - Enable `uuid-ossp`, `pgcrypto`, `pg_trgm`.
   - Create enum types: `plan_type`, `transaction_type`, `referral_status`, `payout_status`, `debug_action_type`.
2. **Core identity**
   - Create `public.profiles` (1:1 with `auth.users`) + `updated_at` trigger.
   - Add “create profile on user signup” trigger.
3. **Credits**
   - Create `public.credit_wallets` (1 row per user) + non-negative balance check.
   - Create `public.credit_transactions` append-only ledger.
   - Add SECURITY DEFINER function(s) to apply credit changes atomically (wallet + ledger).
4. **Sessions**
   - Ensure `public.debug_sessions` matches spec (retention, tags, action type, zk mode flags).
   - Add `public.web_builder_sessions` to persist builder messages + generated output.
5. **Billing + referrals**
   - Create/seed `public.subscription_plans`.
   - Add referrals / payouts tables if included in the reference.
6. **Indexes**
   - Add key indexes (`user_id`, `created_at`, `pg_trgm` index for search fields) per reference.

---

## Phase 2 — RLS + admin security (non-negotiable)
1. **RLS everywhere**
   - Default deny; only allow owners to read/write their own rows.
2. **Admin check**
   - Add `public.is_admin(p_user_id uuid)` SECURITY DEFINER function.
   - No client-side admin claims; admin routes must call `rpc('is_admin')`.
3. **Write constraints**
   - Credit ledger is append-only (no UPDATE/DELETE).
   - Wallet balance changes only via approved functions.

---

## Phase 3 — Next.js API routes (match the reference routes)

### Auth (`/api/auth/*`)
- Implement: register, login, logout, verify-email, forgot/reset-password, session.
- Ensure post-verify redirect supports production + local dev.

### Debug (`/api/debug/*`)
- Implement SSE streaming routes:
  - `/api/debug/analyze`, `/api/debug/reverse`
- Persistence routes:
  - `/api/debug/sessions` CRUD (list, get, update title/tags, delete)

### Projects (v1 + v2)
- v1 (immediate): implement `/api/projects/*` as a thin layer over `public.generations`.
- v2 (later): add `projects` table and migrate existing `generations.metadata.project_key` into real project ids.

### Web builder (`/api/web-builder/*`)
- Sessions CRUD + streaming generation endpoint.
- Forking/public templates endpoints as described.

### Credits + subscriptions
- `/api/credits/wallet`, `/api/credits/transactions`, `/api/credits/topup`
- `/api/subscriptions/*` + Stripe customer portal

### Admin (`/api/admin/*`)
- Users list/edit/delete, credits adjustment, analytics, audit/abuse logs, payouts.
- Guard every handler with `requireAdmin()` (JWT → `rpc('is_admin')`).

### Webhooks
- `/api/webhooks/stripe` with signature verification.

---

## Phase 4 — Supabase Edge Functions
Goal: move long-running/streaming AI work into Supabase Functions (Deno), keep Next API routes as the authenticated gateway.

Implement (from reference):
- `debug-ai-analyze` (SSE)
- `debug-ai-reverse` (SSE)
- `generate-web-code` (SSE)
- `save-debug-session`
- `get-debug-history`
- `stripe-webhook`

Key rules:
- Parse `req.json()` exactly once.
- Edge functions verify JWT via Supabase auth.
- Rate limiting is DB-backed.

---

## Phase 5 — “Make it real” milestones (backend phase acceptance)
1. Signup → verify → login → dashboard works in production.
2. Credits decrement on AI actions; wallet/ledger match.
3. Debug history is persisted and paginated.
4. Web builder sessions persist message history + outputs.
5. Admin routes are locked down and auditable.
6. Stripe subscription resets credits monthly and writes ledger rows.

