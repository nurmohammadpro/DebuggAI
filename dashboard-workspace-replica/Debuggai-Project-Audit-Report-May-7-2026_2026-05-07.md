# DeBuggAI — Project Audit & Report (May 7, 2026)

## 1\. What We've Built So Far

Organized by domain, derived from commit history and codebase analysis.

### 1A. Authentication & Authorization

-   Email/password sign-up, sign-in, password reset
-   Supabase Auth backend with OAuth/magic-link callback handler
-   Server-side admin auth with ADMIN\_EMAILS allowlist
-   Two-tier admin: /admin/\* (standalone server-auth layout) + /dashboard/admin/\* (client-side AdminRouteGuard)
-   Session bootstrapper with singleton pattern (prevents concurrent getSession() race)
-   Automatic profile creation on sign-up via handle\_new\_user() trigger

### 1B. AI Debugging Engine

-   SSE-streaming debug analysis (/api/debug) — language detection, error analysis, fix generation
-   Debug history with search, filter, delete, rename
-   Credit deduction per debug session
-   Code input with language auto-detection
-   Streaming results display with syntax-highlighted fixes

### 1C. AI Web Builder

-   Virtual file tree system with diff tracking (added/modified/deleted)
-   Monaco code editor with diff mode, syntax highlighting
-   Sandpack/iframe live preview pane
-   AI chat panel with SSE streaming code generation
-   Build terminal with real-time log streaming
-   Tech stack selector (React, Next.js, Express, etc.)
-   Project management: create, rename, duplicate, delete
-   File tree explorer with folder collapse/expand

### 1D. Docker Sandbox (Web Builder Runtime)

-   File-system-based sandbox creation with Docker
-   Real-time build logs via SSE
-   Zip export of project files
-   Preview proxy (/preview/\[id\]/\[...slug\]) avoiding CORS issues
-   Sandbox lifecycle management (create, run, stop, cleanup)

### 1E. Projects System

-   CRUD for generated projects (generations table)
-   Project settings: general info, custom domains, env vars, integrations
-   Settings navigation sidebar across all settings pages
-   Virtual file tree with serialization

### 1F. Credits & Billing

-   Credit wallet per user with balance tracking
-   Credit transaction history (earned/spent/refunded) with pagination
-   Stripe checkout integration via edge function
-   Plan definitions: Free, Pro, Team, Business, Enterprise
-   Credit costs per action type (debug, generate, export)

### 1G. Referral Program

-   Referral code generation and tracking
-   Ambassador tiers with leaderboard
-   Referral payouts table
-   Track referral visits via edge function

### 1H. Admin Dashboard (Two Systems)

-   Standalone /admin: Server-auth layout with overview KPI cards, user management (search/filter/bulk actions/ban), credit economy management, abuse monitoring, audit trail with CSV export, referral leaderboard, system settings (rate limits, AI model config, security, integrations, database maintenance)
-   Dashboard /dashboard/admin: Client-auth wrapper with admin overview, credits, monitoring, user management

### 1I. Dashboard Shell & UX

-   Collapsible sidebar with pinned items (chats/projects)
-   Cmd+K command palette for navigation/search
-   Dynamic breadcrumbs from pathname
-   Mobile drawer navigation
-   Composer card with model selector
-   User account menu with credits, settings, referrals, theme toggle
-   Recent debug sessions and transactions widgets

### 1J. Public/Marketing Site

-   12 public pages: Landing, Pricing, About, Features, Demo, Docs, FAQ, Languages, Contact, Careers, Terms, Privacy
-   Public layout with navigation bar and footer
-   Landing page with hero, live activity feed, features grid, terminal demo, testimonials, pricing preview, FAQ accordion

### 1K. Design System Migration

-   103 files updated — replaced all shadcn UI primitives (Button, Card, Badge, Input, etc.) with native HTML elements
-   \--app-\* CSS variables across all pages and components
-   Consistent radius system: 6px (buttons/badges/inputs), 8px (cards/nav-items), 10px (dialogs/modals)
-   Typography scale: 16px titles, 13px body, 11px labels with uppercase tracking
-   Backdrop-blur panels on dashboard cards
-   Theme toggle with dark/light support

### 1L. Workspace IDE (Skeleton)

-   Icon sidebar with mode switching (Explorer, Search, Git, Bug, Plugins, Settings)
-   File tree panel with tabs (Files / Versions)
-   Editor area with code/preview toggle
-   Right panel framework (Chat, Terminal, Git, Env, Connections)
-   Version history list with snapshots
-   Workspace dashboard compositing all panels
-   Draggable panel splitter

## 2\. Database Schema Summary

30 migration files across these tables:

┌─────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Category        │ Tables                                                                                                   │
├─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Users & Auth    │ profiles, subscriptions (plan tracking)                                                                  │
├─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Credits         │ credit\_wallets, credit\_transactions                                                                       │
├─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Debug           │ debug\_sessions, debug\_session\_files                                                                      │
├─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Web Builder      │ generations (projects), web\_builder\_sessions, web\_builder\_versions, web\_builder\_templates                 │
├─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Referrals       │ referrals, referral\_payouts                                                                                │
├─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Projects        │ projects, project\_settings, project\_domains, project\_env\_vars, project\_integrations                      │
├─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Version Control │ project\_branches, pull\_requests, pr\_comments, pr\_reviews, git\_integrations, deployments, deployment\_logs  │
├─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Collaboration   │ workspaces, workspace\_members, workspace\_invitations, comments                                            │
├─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Admin/Ops      │ audit\_events, abuse\_events, analytics\_usage\_logs, notifications                                            │
├─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Public          │ contact\_messages, newsletter\_subscribers                                                                   │
└─────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────┘

PostgreSQL Enums: plan\_type, transaction\_type, referral\_status, payout\_status, debug\_action\_type, template\_category, pr\_status, pr\_merge\_strategy, git\_provider

Key Functions: handle\_new\_user() (auto-profile), deduct\_credits(), add\_credits(), is\_admin(), claim\_referral(), update\_updated\_at(), get\_ambassador\_leaderboard(), create\_branch\_from\_version(), merge\_pull\_request(), get\_project\_branches(), get\_user\_plan()

RLS: Enabled on all user-data tables with policies for owner access and admin overrides

## 3\. Edge Functions (10 active)

┌────────────────────────┬──────────────────────────────────┐
│ Function                │ Purpose                          │
├────────────────────────┼──────────────────────────────────┤
│ debug                  │ AI debug analysis (streaming)    │
├────────────────────────┼──────────────────────────────────┤
│ debug-ai-analyze      │ One-shot AI analysis              │
├────────────────────────┼──────────────────────────────────┤
│ generate               │ AI code generation (streaming)    │
├────────────────────────┼──────────────────────────────────┤
│ detect-language        │ Auto-detect programming language   │
├────────────────────────┼──────────────────────────────────┤
│ create-checkout        │ Stripe checkout session            │
├────────────────────────┼──────────────────────────────────┤
│ stripe-webhook         │ Stripe event handling              │
├────────────────────────┼──────────────────────────────────┤
│ generate-referral-code │ Unique referral code creation      │
├────────────────────────┼──────────────────────────────────┤
│ track-referral         │ Referral visit tracking            │
├────────────────────────┼──────────────────────────────────┤
│ ambassador-leaderboard  │ Ambassador rankings                │
├────────────────────────┼──────────────────────────────────┤
│ web-builder-templates   │ Starter template management        │
├────────────────────────┼──────────────────────────────────┤
│ monitoring             │ System health endpoint             │
└────────────────────────┴──────────────────────────────────┘

## 4\. What Hasn't Been Done (Next Steps)

Broken into concrete pieces:

### Phase A — Workspace IDE Completion

The workspace components exist as a skeleton but aren't functional:

-   A1. Wire up file tree to actual project files (currently shows empty state)
-   A2. Implement "New File" / "New Folder" buttons
-   A3. Connect version history to web\_builder\_versions table
-   A4. Implement right panel tabs (Chat, Terminal, Git, Env, Connections)
-   A5. Wire up the mode toggle (Build ↔ Debug) to persist and route correctly
-   A6. Connect workspace project switcher to real project data

### Phase B — Version Control & Git

Tables exist but no UI or API wiring:

-   B1. API routes for branches, PRs, and git integrations
-   B2. Branch management UI (create, switch, merge)
-   B3. Pull request creation and review flow
-   B4. Git provider connection (GitHub integration)
-   B5. Deployment pipeline UI from deployments table

### Phase C — Collaboration & Workspaces

Tables exist but completely unimplemented:

-   C1. API routes for workspaces, members, invitations, comments
-   C2. Real-time presence via Supabase Realtime
-   C3. Collaborative editing (operational transforms or CRDT)
-   C4. Comment threads on files and lines
-   C5. Workspace invitation flow

### Phase D — Missing Features / Polish

-   D1. Notification center UI (bell icon dropdown — API exists but no UI)
-   D2. Admin monitoring dashboard is placeholder-only (no real metrics)
-   D3. Analytics/logging pipeline from analytics\_usage\_logs to a dashboard
-   D4. Contact form submission admin view (table exists, no admin UI)
-   D5. Newsletter management admin UI
-   D6. Database maintenance actions in admin settings (currently UI-only stubs)

### Phase E — Quality & Infrastructure

-   E1. No tests anywhere (no Jest, no Playwright, no Cypress)
-   E2. No error.tsx or not-found.tsx or loading.tsx at the app root — missing graceful error boundaries
-   E3. No middleware.ts at the Next.js root (auth gating is done in layouts only)
-   E4. Edge functions save-debug-session and stripe\_webhook are empty directories
-   E5. TypeScript strict mode? — check tsconfig
-   E6. SEO metadata is bare — only root layout has basic title

### Phase F — Auth & Account

-   F1. No email verification flow
-   F2. No MFA/2FA setup
-   F3. No OAuth provider buttons (GitHub, Google) in login/signup forms
-   F4. Profile page is sparse (settings page goes to transactions)
-   F5. Account deletion flow missing

## 5\. Architecture Observations

-   Two admin systems: /admin (server-auth) and /dashboard/admin (client-auth). This duplication could be consolidated.
-   Two notification tables: notifications in 018 migration and a re-creation in 20260505\_schema\_normalization.sql. Should verify only one exists.
-   Agent/assistant paradigm: The "agent" concept is used in workspace but workspace-agent.tsx was not found — may be missing.
-   No rate limiting visible on API routes except for admin abuse monitoring.
-   No logging framework — errors are silently caught in many places.