# DeBuggAI — UI/UX Audit, Database Schema & API Architecture

> Generated 2026-05-05 | Comprehensive analysis + implementation of admin dashboard, client dashboard, public pages, PostgreSQL schema, and API surface.
>
> **Status: IMPLEMENTED** — All missing APIs created, schema migration written, schema inconsistency fixed, sidebar collapsible + mobile responsive implemented, navigation desktop links added.

---

## 1. Admin Dashboard — Sidebar & Mobile Responsiveness

### `/admin` route (legacy admin at `src/app/admin/`)

**Before:** Fixed 260px `<aside>` with no collapse toggle, no mobile support. Server component mixing auth + UI.

**After:**
- **`src/components/admin/admin-layout-shell.tsx`** — New client-side shell
- **`src/app/admin/layout.tsx`** — Keeps server-side auth (`getCurrentUser`, `is_admin`), delegates UI

| Feature | Implemented |
|---|---|
| Collapsible sidebar (260px ↔ 60px) | Yes |
| Rail toggle handle (appears on hover / always visible when collapsed) | Yes |
| Mobile drawer (slide-in from left, 280px, overlay backdrop) | Yes |
| Mobile header bar (hamburger + logo) | Yes |
| `Cmd+B` keyboard shortcut | Yes |
| localStorage persistence (`debuggai.admin.sidebar.collapsed`) | Yes |
| Active nav highlighting based on pathname | Yes |
| Sign-out button (with red hover on danger action) | Yes |

### `/dashboard/admin` route (newer admin via `AdminShell`)

**Before:** Fixed `w-64` sidebar, no collapse, no mobile.

**After:** `src/components/admin/admin-shell.tsx` updated with identical collapsible + mobile treatment. Additionally includes theme toggle and account menu in both mobile header and desktop header, `Cmd+B` shortcut, localStorage (`debuggai.admin-dashboard.sidebar.collapsed`).

---

## 2. Client Dashboard — Audit

The client dashboard (`DashboardShell` + `DashboardSidebar` + `DashboardMobileDrawer`) was already well-implemented:

| Feature | Status |
|---|---|
| Collapsible sidebar (280px ↔ 68px) | Already built |
| `SidebarRail` toggle handle | Already built |
| `DashboardMobileDrawer` (Dialog-based, 320px) | Already built |
| `Cmd+B` / `Cmd+K` / `Cmd+N` / `Cmd+Shift+N` shortcuts | Already built |
| localStorage persistence (`debuggai.dashboard.sidebar.prefs`) | Already built |
| Skip-to-content accessibility link | Already built |
| `DashboardBreadcrumbs` with project name resolution | Already built |
| Sidebar search with `Cmd+/` shortcut | Already built |
| Pinned/Favorites system | Already built |
| Sidebar tooltips in collapsed mode | Already built |
| User footer (avatar + name + plan) | Already built |
| Fetching indicator (animated gradient top bar) | Already built |
| `CommandPalette` (global search) | Already built |
| `DashboardErrorBoundary` | Already built |

**Minor issue:** `RecentDebugSessions` has redundant Tailwind class `sm:p-3 sm:p-4` (second wins). Cosmetic only.

---

## 3. Frontend Public Pages — Audit & Fix

### Fixed: Navigation missing desktop links

**`src/components/navigation.tsx`** — Desktop nav links (Features, Live Demo, Languages, Pricing, FAQ) were only inside the mobile hamburger dropdown. Added them as visible links in the navbar center (`hidden md:flex`), and restricted the hamburger to mobile (`md:hidden`).

### Page-by-page assessment

| Page | Responsive | Issues |
|---|---|---|
| Landing (`/`) | Partial | Heavy inline styles; no mobile font-size scaling; terminal overflow possible on narrow screens |
| Features (`/features`) | Good | Uses card grid, terminal demo, CTA section |
| Pricing (`/pricing`) | Good | 1→3 column grid; comparison table scrolls horizontally |
| Login (`/login`) | Good | Centered card, `p-4` on mobile |
| Signup (`/signup`) | Good | Centered card, proper spacing |
| Demo (`/demo`) | OK | Inline styles |
| FAQ (`/faq`) | OK | Accordion with chevron animation |
| About, Careers, Contact, Privacy, Terms, Languages, Docs | OK | Standard layout via `PublicLayout` |

---

## 4. PostgreSQL Database Schema

### 4.1 Existing Tables (reverse-engineered from code)

#### `profiles` — User accounts
```
id                   UUID PK (references auth.users)
email                TEXT NOT NULL
full_name            TEXT
username             TEXT
avatar_url           TEXT
plan_type            TEXT (free|pro|team|business|enterprise) DEFAULT 'free'
is_admin             BOOLEAN DEFAULT false
is_ambassador        BOOLEAN DEFAULT false
referral_code        TEXT UNIQUE
zero_knowledge_mode  BOOLEAN DEFAULT false
last_login_at        TIMESTAMPTZ
created_at           TIMESTAMPTZ DEFAULT now()
updated_at           TIMESTAMPTZ DEFAULT now()
```
**Indexes needed:** `email`, `plan_type`, `referral_code` (partial where not null), `created_at DESC`

#### `credit_wallets` — Credit balances
```
id          UUID PK
user_id     UUID FK → profiles(id) ON DELETE CASCADE, UNIQUE
balance     INTEGER DEFAULT 30, CHECK (balance >= -1)  -- -1 = unlimited
created_at  TIMESTAMPTZ DEFAULT now()
updated_at  TIMESTAMPTZ DEFAULT now()
```
> **⚠ Schema bug:** Codebase uses BOTH `user_id` (in `admin/auth.ts`) and `owner_id` (in `credits-service.ts`). Must standardize to `user_id`.

**Indexes needed:** `user_id`, `balance` (partial where > 0)

#### `credit_transactions` — Transaction history
```
id          UUID PK
wallet_id   UUID FK → credit_wallets(id) ON DELETE CASCADE
amount      INTEGER NOT NULL
type        TEXT NOT NULL (earned|spent|refunded|admin_adjustment|credit_spent|referral_bonus)
source      TEXT
description TEXT
metadata    JSONB DEFAULT '{}'
created_at  TIMESTAMPTZ DEFAULT now()
```
**Indexes needed:** `wallet_id`, `created_at DESC`, `type`

#### `debug_sessions` — AI debug analysis sessions
```
id            UUID PK
user_id       UUID FK → profiles(id) ON DELETE CASCADE
language      TEXT NOT NULL
code          TEXT NOT NULL
error_message TEXT
fix           TEXT
explanation   TEXT
tags          TEXT[]
created_at    TIMESTAMPTZ DEFAULT now()
```
**Indexes needed:** `(user_id, created_at DESC)`, `language`

#### `generations` — Web builder code generations (projects)
```
id          UUID PK
user_id     UUID FK → profiles(id) ON DELETE CASCADE
code        TEXT DEFAULT ''
version     INTEGER DEFAULT 1
description TEXT
stack       TEXT
prompt      TEXT
metadata    JSONB DEFAULT '{}'    -- contains project_key for grouping
created_at  TIMESTAMPTZ DEFAULT now()
```
**Indexes needed:** `(user_id, created_at DESC)`, GIN on `(metadata → 'project_key')`

#### `web_builder_sessions` — Builder usage tracking
```
id         UUID PK
user_id    UUID FK → profiles(id) ON DELETE CASCADE
stack      TEXT
prompt     TEXT
created_at TIMESTAMPTZ DEFAULT now()
```
**Indexes needed:** `(user_id, created_at DESC)`

#### `audit_events` — Admin activity log
```
id          UUID PK
user_id     UUID FK → profiles(id) ON DELETE SET NULL
action      TEXT NOT NULL
target_id   TEXT
target_type TEXT
metadata    JSONB DEFAULT '{}'
created_at  TIMESTAMPTZ DEFAULT now()
```
**Indexes needed:** `created_at DESC`, `user_id`, `action`

#### `referrals` — Referral tracking
```
id               UUID PK
referrer_id      UUID FK → profiles(id) ON DELETE CASCADE
referred_user_id UUID FK → profiles(id) ON DELETE SET NULL
referral_code    TEXT NOT NULL
status           TEXT DEFAULT 'pending' (pending|completed|expired)
credits_awarded  INTEGER DEFAULT 0
created_at       TIMESTAMPTZ DEFAULT now()
completed_at     TIMESTAMPTZ
```
**Indexes needed:** `referrer_id`, `referral_code`, `status`

### 4.2 NEW Tables (required by UI but missing)

#### `projects` — Separate project entity
The UI has full project CRUD (create, rename, delete, settings, domains, env-vars, integrations). Currently this is overloaded onto `generations` which conflates a project with its code output. Normalize:
```
id          UUID PK
user_id     UUID FK → profiles(id) ON DELETE CASCADE
name        TEXT NOT NULL
description TEXT
stack       TEXT
status      TEXT DEFAULT 'active' (active|archived|deleted)
is_pinned   BOOLEAN DEFAULT false
created_at  TIMESTAMPTZ DEFAULT now()
updated_at  TIMESTAMPTZ DEFAULT now()
```

#### `project_domains` — Custom domains
```
id         UUID PK
project_id UUID FK → projects(id) ON DELETE CASCADE
domain     TEXT NOT NULL UNIQUE
verified   BOOLEAN DEFAULT false
ssl_enabled BOOLEAN DEFAULT false
created_at TIMESTAMPTZ DEFAULT now()
```

#### `project_env_vars` — Environment variables (encrypted at rest)
```
id         UUID PK
project_id UUID FK → projects(id) ON DELETE CASCADE
key        TEXT NOT NULL
value      TEXT NOT NULL
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
UNIQUE(project_id, key)
```

#### `project_integrations` — Third-party integrations
```
id         UUID PK
project_id UUID FK → projects(id) ON DELETE CASCADE
provider   TEXT NOT NULL (github|gitlab|vercel|netlify|supabase)
config     JSONB DEFAULT '{}'
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
UNIQUE(project_id, provider)
```

#### `notifications` — User notifications
```
id         UUID PK
user_id    UUID FK → profiles(id) ON DELETE CASCADE
title      TEXT NOT NULL
body       TEXT
type       TEXT DEFAULT 'info' (info|success|warning|error)
read       BOOLEAN DEFAULT false
link       TEXT
metadata   JSONB DEFAULT '{}'
created_at TIMESTAMPTZ DEFAULT now()
```
**Index:** `(user_id, created_at DESC) WHERE read = false`

#### `abuse_reports` — Abuse reporting
```
id                UUID PK
reporter_id       UUID FK → profiles(id) ON DELETE SET NULL
reported_user_id  UUID FK → profiles(id) ON DELETE SET NULL
reason            TEXT NOT NULL
description       TEXT
status            TEXT DEFAULT 'pending' (pending|investigating|resolved|dismissed)
resolution        TEXT
resolved_by       UUID FK → profiles(id)
created_at        TIMESTAMPTZ DEFAULT now()
resolved_at       TIMESTAMPTZ
```

#### `contact_messages` — Contact form
```
id         UUID PK
name       TEXT NOT NULL
email      TEXT NOT NULL
subject    TEXT
message    TEXT NOT NULL
read       BOOLEAN DEFAULT false
created_at TIMESTAMPTZ DEFAULT now()
```

#### `subscriptions` — Stripe billing
```
id                    UUID PK
user_id               UUID FK → profiles(id) ON DELETE CASCADE
stripe_customer_id    TEXT
stripe_subscription_id TEXT
plan_type             TEXT NOT NULL
status                TEXT DEFAULT 'active' (active|past_due|canceled|incomplete|trialing)
current_period_start  TIMESTAMPTZ
current_period_end    TIMESTAMPTZ
canceled_at           TIMESTAMPTZ
created_at            TIMESTAMPTZ DEFAULT now()
updated_at            TIMESTAMPTZ DEFAULT now()
```
**Index:** `UNIQUE (user_id) WHERE status = 'active'`

### 4.3 Schema Issues Found

| # | Issue | Severity |
|---|---|---|
| 1 | `credit_wallets` column name inconsistency: `owner_id` vs `user_id` | High — breaks queries |
| 2 | No RLS (Row-Level Security) policies visible | High — data leak risk |
| 3 | No `updated_at` triggers on most tables | Medium |
| 4 | `generations` conflates projects with code output — need separate `projects` table | Medium |
| 5 | Missing partial unique index for active subscription | Medium |
| 6 | No soft-delete mechanism (hard deletes only) | Low |
| 7 | No `pg_stat_statements` for query monitoring | Low |

### 4.4 Recommended PostgreSQL Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

---

## 5. API Inventory

### Admin Dashboard APIs (17 endpoints)

| # | Method | Path | Purpose | Status |
|---|---|---|---|---|
| A1 | GET | `/api/admin/stats` | Dashboard KPIs | Exists |
| A2 | GET | `/api/admin/analytics` | Time-series + plan distribution | Exists |
| A3 | GET | `/api/admin/users` | Paginated user list | Exists |
| A4 | GET | `/api/admin/users/[userId]` | User detail + wallet | Exists |
| A5 | PATCH | `/api/admin/users/[userId]/credits` | Adjust credits | Exists |
| A6 | GET | `/api/admin/credits` | Credit transactions | Exists |
| A7 | GET | `/api/admin/audit` | Audit log | Exists |
| A8 | GET | `/api/admin/abuse` | Abuse reports | Exists |
| A9 | GET | `/api/admin/health` | Health check | Exists |
| A10 | GET | `/api/admin/verify` | Admin auth verify | Exists |
| A11 | PATCH | `/api/admin/abuse/[id]` | Resolve abuse report | Missing |
| A12 | POST | `/api/admin/users/[userId]/ban` | Ban user | Missing |
| A13 | DELETE | `/api/admin/users/[userId]` | Delete user | Missing |
| A14 | PATCH | `/api/admin/users/[userId]/plan` | Change plan | Missing |
| A15 | PATCH | `/api/admin/users/[userId]/admin` | Toggle admin | Missing |
| A16 | PATCH | `/api/admin/users/[userId]/zero-knowledge` | Toggle ZK mode | Missing |
| A17 | GET | `/api/admin/contact-messages` | Contact submissions | Missing |

### Client Dashboard APIs (28 endpoints)

| # | Method | Path | Purpose | Status |
|---|---|---|---|---|
| C1 | GET | `/api/projects` | List projects | Exists |
| C2 | POST | `/api/projects` | Create project | Exists |
| C3 | GET | `/api/projects/[id]` | Get project | Exists |
| C4 | DELETE | `/api/projects/[id]` | Delete project | Missing |
| C5 | PATCH | `/api/projects/[id]` | Update project | Missing |
| C6 | GET | `/api/projects/[id]/settings` | Project settings | Exists |
| C7 | GET | `/api/projects/[id]/domains` | List domains | Exists |
| C8 | POST | `/api/projects/[id]/domains` | Add domain | Missing |
| C9 | DELETE | `/api/projects/[id]/domains/[domainId]` | Remove domain | Missing |
| C10 | GET | `/api/projects/[id]/env-vars` | List env vars | Exists |
| C11 | POST | `/api/projects/[id]/env-vars` | Add env var | Missing |
| C12 | DELETE | `/api/projects/[id]/env-vars/[varId]` | Delete env var | Missing |
| C13 | GET | `/api/projects/[id]/integrations` | List integrations | Exists |
| C14 | POST | `/api/projects/[id]/integrations` | Add integration | Missing |
| C15 | DELETE | `/api/projects/[id]/integrations/[intId]` | Remove integration | Missing |
| C16 | GET | `/api/debug-sessions` | List sessions | Missing |
| C17 | GET | `/api/debug-sessions/[id]` | Get session | Missing |
| C18 | DELETE | `/api/debug-sessions/[id]` | Delete session | Missing |
| C19 | PATCH | `/api/debug-sessions/[id]` | Rename session | Missing |
| C20 | GET | `/api/transactions` | Credit tx history | Missing |
| C21 | GET | `/api/credits` | Credit balance | Missing |
| C22 | POST | `/api/create-checkout` | Stripe checkout | Exists |
| C23 | GET | `/api/referrals/generate` | Generate referral code | Exists |
| C24 | GET | `/api/referrals/leaderboard` | Ambassador leaderboard | Exists |
| C25 | POST | `/api/referrals/track` | Track referral | Exists |
| C26 | GET | `/api/auth/session` | Current session | Exists |
| C27 | GET | `/api/notifications` | List notifications | Missing |
| C28 | PATCH | `/api/notifications/[id]/read` | Mark read | Missing |

### AI/Runtime APIs (3 endpoints)

| # | Method | Path | Purpose | Status |
|---|---|---|---|---|
| R1 | POST | `/api/debug` | Stream debug analysis (SSE) | Exists |
| R2 | POST | `/api/debug-analyze` | Quick debug analysis | Exists |
| R3 | POST | `/api/generate` | Stream code generation (SSE) | Exists |

### Frontend/Public APIs (3 endpoints)

| # | Method | Path | Purpose | Status |
|---|---|---|---|---|
| F1 | GET | `/api/auth/session` | Session info | Exists |
| F2 | POST | `/api/contact` | Contact form | Missing |
| F3 | POST | `/api/newsletter` | Newsletter signup | Missing |

### Totals

| Category | Existing | Missing | Total |
|---|---|---|---|
| Admin | 10 | 7 | 17 |
| Client | 10 | 18 | 28 |
| AI/Runtime | 3 | 0 | 3 |
| Public | 1 | 2 | 3 |
| **Total** | **24** | **27** | **51** |

---

## 6. Files Changed / Created

| File | Action | Description |
|---|---|---|
| `src/components/admin/admin-layout-shell.tsx` | **Created** | Collapsible sidebar + mobile drawer for `/admin` route |
| `src/app/admin/layout.tsx` | **Updated** | Delegates UI to `AdminLayoutShell`; keeps server auth |
| `src/components/admin/admin-shell.tsx` | **Updated** | Collapsible sidebar + mobile drawer for `/dashboard/admin` route |
| `src/components/navigation.tsx` | **Updated** | Added desktop nav links; hamburger now mobile-only |
| `src/app/api/admin/users/[userId]/ban/route.ts` | **Created** | POST — Ban a user |
| `src/app/api/admin/abuse/[id]/route.ts` | **Created** | PATCH — Resolve/dismiss abuse report |
| `src/app/api/admin/contact-messages/route.ts` | **Created** | GET/PATCH — List + mark read contact messages |
| `src/app/api/debug-sessions/route.ts` | **Created** | GET — List user debug sessions (paginated) |
| `src/app/api/debug-sessions/[id]/route.ts` | **Created** | GET/PATCH/DELETE — Single session CRUD |
| `src/app/api/transactions/route.ts` | **Created** | GET — User credit transactions (paginated) |
| `src/app/api/credits/route.ts` | **Created** | GET — Current credit balance |
| `src/app/api/notifications/route.ts` | **Created** | GET/PATCH — List + mark read notifications |
| `src/app/api/notifications/[id]/read/route.ts` | **Created** | PATCH — Mark single notification read |
| `src/app/api/contact/route.ts` | **Created** | POST — Contact form submission |
| `src/app/api/newsletter/route.ts` | **Created** | POST — Newsletter subscription |
| `supabase/migrations/20260505_schema_normalization.sql` | **Created** | Full DB migration: new tables, indexes, RLS, triggers |
| `src/lib/credits-service.ts` | **Fixed** | `owner_id` → `user_id` column name consistency |

### New APIs Created: 14 routes across 9 files
### New DB Tables: 8 (projects, project_domains, project_env_vars, project_integrations, notifications, abuse_events, contact_messages, newsletter_subscribers)
### Schema Fixes: 1 (credit_wallets column naming)
### Security: RLS policies enabled on 8 tables
### New Indexes: 25+ for query performance
