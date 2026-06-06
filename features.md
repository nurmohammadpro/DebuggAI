# DeBuggAI — Complete Feature Documentation

**App**: DeBuggAI v0.1.0  
**URL**: [debuggaidemo.appbrainer.tech](https://debuggaidemo.appbrainer.tech)  
**Tech Stack**: Next.js 16 (App Router), TypeScript (strict), Tailwind CSS v4, Supabase (Postgres + Auth), Zustand, TanStack React Query, Monaco Editor, Docker, Stripe, Sentry, Framer Motion, Playwright, Vitest

---

## Table of Contents

1. [Authentication & User Management](#1-authentication--user-management)
2. [AI Debugging](#2-ai-debugging)
3. [Web Builder / Code Generation](#3-web-builder--code-generation)
4. [Agent System (Tool-Calling)](#4-agent-system-tool-calling)
5. [Visual Editor (Drag-and-Drop UI Builder)](#5-visual-editor-drag-and-drop-ui-builder)
6. [Workspace / IDE](#6-workspace--ide)
7. [Project Management](#7-project-management)
8. [Docker Sandbox (Live Preview)](#8-docker-sandbox-live-preview)
9. [Credit System & Billing](#9-credit-system--billing)
10. [Referral Program](#10-referral-program)
11. [Admin Panel](#11-admin-panel)
12. [Real-Time Collaboration](#12-real-time-collaboration)
13. [Notifications](#13-notifications)
14. [Design System & Theming](#14-design-system--theming)
15. [Public / Marketing Pages](#15-public--marketing-pages)
16. [API Routes](#16-api-routes)
17. [Infrastructure & DevOps](#17-infrastructure--devops)
18. [Database Schema](#18-database-schema)
19. [Testing](#19-testing)
20. [State Management Stores](#20-state-management-stores)
21. [Custom Hooks](#21-custom-hooks)

---

## 1. Authentication & User Management

### 1.1 Sign-Up
- **File**: `src/app/signup/page.tsx`, `src/components/auth/signup-form.tsx`
- **Route**: `/signup`
- Email/password registration with full name field
- OAuth via Google and GitHub
- Password minimum 8-character validation
- Terms of service acknowledgment
- Email verification flow (`/verify-email`)

### 1.2 Login
- **File**: `src/app/login/page.tsx`, `src/components/auth/login-form.tsx`
- **Route**: `/login`
- Email/password sign-in
- OAuth via Google and GitHub
- Forgot password link → `/reset-password`

### 1.3 Password Reset
- **File**: `src/app/reset-password/page.tsx`
- **Route**: `/reset-password`
- Email-based reset link
- Update password after reset flow

### 1.4 Session Management
- **File**: `src/lib/auth.ts`, `src/lib/client-auth.ts`, `src/lib/server/auth.ts`
- Supabase SSR cookie-based sessions
- Server actions: `signUp`, `signIn`, `signOut`, `resetPassword`, `updatePassword`
- `SessionBootstrapper` component for client-side session init
- `SupabaseLockHandler` for auth lock states
- `useSession` hook for React consumption
- Auto-redirect to login if unauthenticated (dashboard routes)

### 1.5 Auth Callback
- **File**: `src/app/auth/callback/page.tsx`, `src/components/auth/auth-callback-client.tsx`
- **Route**: `/auth/callback`
- OAuth redirect handler
- Server-side sign-in route: `src/app/auth/signin/route.ts`

### 1.6 CSRF Protection
- **File**: `src/lib/server/csrf.ts`, `src/lib/csrf-client.ts`
- Server-side CSRF token generation and validation
- Client-side header injection

---

## 2. AI Debugging

### 2.1 Core Debug Screen
- **File**: `src/app/dashboard/debug/page.tsx`, `src/components/dashboard/debug/enhanced-debug-tracer.tsx`
- **Route**: `/dashboard/debug`
- Language selector (12 languages)
- Code input with syntax hinting
- Optional error message input
- Quick example prompts (find bugs, review best practices, analyze error)
- Auto language detection from code patterns
- Real-time analysis results with streaming
- Two-column layout: input pane + results pane

### 2.2 Debug History
- **File**: `src/app/dashboard/debug/history/page.tsx`, `src/components/dashboard/debug/debug-history.tsx`
- **Route**: `/dashboard/debug/history`
- Search by code, error, or explanation
- Filter by programming language
- Re-run analysis
- Delete individual sessions / clear all
- Timestamps with relative time
- Language badges, error message preview, code preview, tags display
- Empty state for no sessions or no matching results

### 2.3 Supported Debug Languages
JavaScript, TypeScript, Python, Go, Rust, Java, C#, PHP, Ruby, Swift, Kotlin, C++

### 2.4 Debug Analysis Backend
- **Edge Function**: `supabase/functions/debug-ai-analyze/index.ts`
- **API Route**: `POST /api/debug-analyze` (non-streaming JSON)
- Structured analysis response:
  - Root cause identification
  - Corrected code with language-specific fences
  - Explanation of fix
  - Best practices to avoid recurrence
  - Related concepts to learn
- Language-specific error hints (e.g., JS: TypeError/ReferenceError, Python: IndentationError, Go: nil pointer)
- Analysis saved to `debug_sessions` table

### 2.5 Language Detection
- **Edge Function**: `supabase/functions/detect-language/index.ts`
- Pattern matching (language-specific regex)
- Keyword scoring with confidence calculation
- Returns detected language, confidence score (0-1), alternatives

---

## 3. Web Builder / Code Generation

### 3.1 AI Chat Panel
- **File**: `src/components/web-builder/enhanced-chat-panel.tsx`, `src/components/web-builder/chat-panel.tsx`
- v0.dev-style step-by-step AI chat with structured steps:
  1. **Thought** — AI thinks about the request
  2. **Explore** — AI explores the codebase
  3. **Action** — AI takes file-system actions
  4. **Code** — AI writes code
  5. **Completion** — Task complete
- Real-time SSE streaming of AI responses
- Chat history with timestamps
- Auto-scroll to latest message
- Quick action prompts (login form, todo list, dashboard)
- Loading indicator during generation
- Textarea with Enter to send, Shift+Enter for new line
- Character limit and auto-resize
- Empty state with suggestions
- "New Project" button for stack selection

### 3.2 Code Editor (Monaco)
- **File**: `src/components/web-builder/code-editor.tsx`
- Monaco Editor (VS Code's editor) integration
- TypeScript/TSX language support
- Dark theme (vs-dark)
- Syntax highlighting and code formatting
- Font ligatures (Fira Code, JetBrains Mono)
- Two-way sync with generation store
- Configurable height and read-only mode
- Line numbers and word wrap
- Smooth scrolling and cursor animations
- Intellisense and autocompletion

### 3.3 Preview Pane
- **File**: `src/components/web-builder/enhanced-preview-pane.tsx`
- Live preview via Docker sandbox containers
- Version history with dropdown selector
- Refresh button to rebuild preview
- Collapse button to hide preview
- Runtime error display with "Debug This" button
- 500ms debounced updates
- Error console with message, source, line, and column

### 3.4 Technology Stack Selector
- **File**: `src/components/web-builder/stack-selector.tsx`
- Modal dialog with 7 stack cards
- Feature selection checkboxes (Auth, Database, REST API, File Upload, Docker, Testing)
- Project name input
- Generate button with loading state
- **Supported stacks**: MERN, MEAN, Laravel, Django, Flask, Rails, Go

### 3.5 Template Generation
- **Edge Function**: `supabase/functions/web-builder-templates/index.ts`
- Full project structure generation per stack
- MERN template includes: client/server split, React frontend, Express API, Mongoose models, JWT auth, Multer uploads, CORS config
- Configurable features per project

### 3.6 Streaming Infrastructure
- **Edge Function**: `supabase/functions/generate/index.ts`
- **API Route**: `POST /api/generate` (SSE streaming)
- CORS support, JWT auth, conversation context (last 20 messages)
- SSE Parser utility: `src/lib/sse-parser.ts`
- Code extraction from markdown: `src/lib/extract-code.ts`
- Multiple code block extraction, language detection from fences

---

## 4. Agent System (Tool-Calling)

### 4.1 Agent Loop
- **API Route**: `POST /api/agent/turn`
- **File**: `src/lib/agent/tools.ts`, `src/lib/ai/router.ts`
- Iterative tool-calling loop for AI agents
- Intent detection (code_edit, planning, generate, debug)

### 4.2 Agent Tools (10 tools)
| Tool | Description |
|------|-------------|
| `list_dir` | List directory contents |
| `view_file` | Read file contents |
| `write_file` | Write content to file |
| `line_replace` | Replace specific lines |
| `search_files` | Search across files |
| `read_dev_logs` | Read development logs |
| `exec_command` | Execute shell command |
| `write_new_file` | Create new file |
| `delete_file` | Delete file |
| `install_package` | Install npm package |

### 4.3 AI Provider Router
- **File**: `src/lib/ai/router.ts`
- Routes requests based on intent:
  - **Groq** (Llama models) — fast, cheap, used for simple edits
  - **DeepSeek** — reasoning/planning, used for complex tasks
- Request-level intent classification

### 4.4 Visual Editor Bridge
- **File**: `src/lib/agent/visual-editor-bridge.ts`
- Bridges visual editor selections with agent tool calls
- Converts visual editor component selections to agent-readable context
- Maps property changes to code modifications

---

## 5. Visual Editor (Drag-and-Drop UI Builder)

### 5.1 Core Visual Editor
- **File**: `src/components/visual-editor/visual-editor.tsx`
- **Route**: Embedded in workspace
- Full drag-and-drop visual UI builder
- Three-panel layout: palette → canvas → properties
- One-click code generation from visual layout
- Multi-page support

### 5.2 Component Palette
- **File**: `src/components/visual-editor/component-palette.tsx`
- 24+ draggable component types:
  - Layout: container, row, column, section, grid
  - Content: heading, text, badge, divider, list, alert, link, table
  - Forms: button, input, textarea, select, checkbox, radio, form
  - Navigation: navbar, breadcrumbs
  - Media: image, video, icon
  - Feedback: progress, spinner

### 5.3 Visual Canvas
- **File**: `src/components/visual-editor/visual-editor-canvas.tsx`
- Drag-and-drop component placement
- Resizable canvas
- Keyboard shortcuts (delete, duplicate, undo/redo)
- Component selection and highlighting

### 5.4 Property Panel
- **File**: `src/components/visual-editor/property-panel.tsx`
- Component property editing (position, size, styling, content)
- Real-time preview updates
- Type-specific controls per component

### 5.5 Prompt Templates
- **File**: `src/components/visual-editor/prompt-templates.tsx`
- AI prompt templates for generating components
- Context-aware suggestions

### 5.6 State
- **File**: `src/store/visual-editor-store.ts` (Zustand, persisted)
- Tracks pages, components per page, global CSS, libraries
- Full undo/redo support via `useUndoRedo` hook

---

## 6. Workspace / IDE

### 6.1 Main Workspace
- **File**: `src/components/workspace/workspace-dashboard.tsx`
- Orchestrator for chat panel + right panel layout
- Resizable split panes
- Responsive design (desktop sidebar, mobile bottom tabs)

### 6.2 Workspace Sidebar
- **File**: `src/components/workspace/workspace-sidebar.tsx`, `src/components/dashboard/sidebar/unified-sidebar.tsx`
- Navigation links (Home, Debug, Web Builder, Settings)
- Thread list with search
- Project list with switching
- Collapsible sections

### 6.3 File Tree
- **File**: `src/components/workspace/workspace-file-tree.tsx`, `src/components/workspace/professional-file-tree.tsx`
- File explorer with folder expansion
- File creation, deletion, renaming
- Syntax-highlighted file type icons

### 6.4 Right Panel (Tabs)
- **File**: `src/components/workspace/workspace-right-panel.tsx`
- Tabbed interface:
  - **Code** — Monaco editor
  - **Preview** — Live preview via Docker sandbox
  - **Files** — File tree
  - **Console** — Runtime error log
  - **Connections** — Integration connections
  - **Visual** — Visual editor
  - **Schema** — Database schema generator

### 6.5 Connections Panel
- **File**: `src/components/workspace/workspace-connections-panel.tsx`
- Integration connection management: GitHub, Vercel, Netlify, Supabase
- OAuth connection flows per service
- Connection status indicators

### 6.6 Version Management
- **File**: `src/components/workspace/workspace-save-version-button.tsx`, `src/components/workspace/workspace-versions-list.tsx`
- Save named versions of project code
- Version history list with timestamps
- Restore previous versions

### 6.7 Deploy Modal
- **File**: `src/components/workspace/deploy-modal.tsx`
- Deploy configuration (build command, output directory, environment)
- Deployment trigger

### 6.8 Export
- **File**: `src/components/workspace/export-actions.tsx`
- Export project as zip archive
- Export via Docker sandbox API

### 6.9 Command Palette
- **File**: `src/components/dashboard/command-palette.tsx`
- Cmd+K quick-action palette
- Search across projects, threads, and actions

---

## 7. Project Management

### 7.1 Projects Hub
- **File**: `src/components/dashboard/projects/projects-hub.tsx`, `src/components/dashboard/projects/project-card.tsx`
- **Route**: `/dashboard` (when no project selected, shows ProjectsHub)
- Project listing with search and filters
- Project cards with name, description, framework, last updated
- Create, rename, delete projects with confirmation dialogs

### 7.2 Project Settings
- **File**: `src/app/dashboard/projects/[id]/settings/page.tsx`
- **Route**: `/dashboard/projects/[id]/settings`
- Project name and description
- Framework selection
- Build command configuration
- Environment type

### 7.3 Custom Domains
- **File**: `src/app/dashboard/projects/[id]/settings/domains/page.tsx`, `src/components/project/domains-manager.tsx`
- **Route**: `/dashboard/projects/[id]/settings/domains`
- Add/remove custom domains
- Domain verification status
- DNS configuration guidance

### 7.4 Environment Variables
- **File**: `src/app/dashboard/projects/[id]/settings/env-vars/page.tsx`, `src/components/project/env-vars-manager.tsx`
- **Route**: `/dashboard/projects/[id]/settings/env-vars`
- Add, edit, delete environment variables
- Key/value pairs with masked values
- Per-project isolation

### 7.5 Integrations
- **File**: `src/app/dashboard/projects/[id]/settings/integrations/page.tsx`, `src/components/project/integrations-manager.tsx`
- **Route**: `/dashboard/projects/[id]/settings/integrations`
- Third-party service connections: GitHub, Vercel, Netlify, Supabase
- OAuth-based authentication
- Connection status indicators

### 7.6 Git Branch Management
- **File**: `src/components/dashboard/branches/enhanced-branches-manager.tsx`
- **Route**: `/dashboard/branches`
- View, create, switch branches
- Branch comparison and merge

### 7.7 Runs / Build History
- **File**: `src/app/dashboard/runs/page.tsx`, `src/app/dashboard/runs/[id]/page.tsx`
- **Route**: `/dashboard/runs`, `/dashboard/runs/[id]`
- Execution/session history list
- Run detail view (status, duration, logs, output)

### 7.8 Project API Routes
- `GET/POST /api/projects` — list/create
- `GET/PUT/DELETE /api/projects/[id]` — CRUD
- `GET/PUT /api/projects/[id]/settings` — settings
- `POST /api/projects/[id]/deploy` — deploy
- `POST /api/projects/[id]/save-code` — save code

---

## 8. Docker Sandbox (Live Preview)

### 8.1 Sandbox Manager
- **File**: `src/lib/sandbox/sandbox.ts`
- Creates isolated Docker containers from project files
- Real-time log streaming via SSE (`/api/sandbox/[id]/logs`)
- Container stop and cleanup (`POST /api/sandbox/[id]/stop`)
- Export project as zip (`GET /api/sandbox/[id]/export`)

### 8.2 Resource Limits
- CPU: 1 core per container
- Memory: 1GB RAM
- PIDs: 256 process limit
- Writable `/tmp`: memory-limited tmpfs (64MB)
- No-new-privileges security flag
- All capabilities dropped (`--cap-drop ALL`)

### 8.3 Network Isolation
- Isolated Docker network per sandbox
- Egress allowlist for security (only allowlisted external hosts)
- Internal ports (4000+) — no external access

### 8.4 Auto-Reaping
- Orphaned container cleanup on boot
- Periodic reaping every 5 minutes
- Admin kill-switch via sandbox config API

### 8.5 Preview Proxy
- **Route**: `/preview/[id]/[...slug]`
- Proxies requests to sandbox containers
- Avoids CORS issues between main app and sandbox

---

## 9. Credit System & Billing

### 9.1 Pricing Tiers
| Plan | Price | Credits | Features |
|------|-------|---------|----------|
| Free | $0 | 30 | Basic features, 7-day history, 10 req/min |
| Pro | $9/mo | 300 | Priority AI, 90-day history, 30 req/min |
| Team | $99/mo | — | Team collaboration, shared resources |
| Business | $299/mo | — | Advanced features, dedicated support |
| Enterprise | $999+/mo | Custom | Custom SLA, dedicated AI, unlimited history |

### 9.2 Credit Costs
| Action | Cost |
|--------|------|
| Debug analysis | 1 credit |
| Reverse debugging | 2 credits |
| Web builder small | 20 credits |
| Web builder medium | 50 credits |
| Web builder large | 100 credits |
| Save session | 10 credits |

### 9.3 Stripe Integration
- **Edge Functions**: `supabase/functions/create-checkout/index.ts`, `supabase/functions/stripe-webhook/index.ts`
- **API Routes**: `POST /api/create-checkout`, `GET /api/user/invoices`
- Checkout session creation per plan
- Webhook handling: subscription created, updated, deleted, payment succeeded
- Stripe customer ID stored in profile
- 7-day trial for Pro plan
- Webhook signature verification

### 9.4 Transaction History
- **File**: `src/app/dashboard/settings/transactions/page.tsx`, `src/components/dashboard/settings/transactions-history.tsx`
- **Route**: `/dashboard/settings/transactions`
- List all credit transactions
- Filter by type (earned/spent/refunded)
- Search by source/description
- Export to CSV
- Relative timestamps, color-coded amounts

### 9.5 Coupon System
- **API Route**: `POST /api/coupons/redeem`
- Coupon code redemption
- Internal test coupon support

---

## 10. Referral Program

### 10.1 Referral Code Generation
- **Edge Function**: `supabase/functions/generate-referral-code/index.ts`
- **API Route**: `POST /api/referrals/generate`
- Unique 9-character codes: `{username_prefix}{3_random_chars}`
- Ambiguous character avoidance (0/O, 1/I)
- Uniqueness checking with retry

### 10.2 Referral Tracking
- **Edge Function**: `supabase/functions/track-referral/index.ts`
- **API Route**: `POST /api/referrals/track`
- Reward structure: referrer gets 10 credits, referee gets 5 bonus credits
- Self-referral prevention
- Code reuse prevention
- Status tracking (pending → completed → paid)

### 10.3 Ambassador Tiers
| Tier | Referrals | Bonus Credits |
|------|-----------|---------------|
| Bronze | 5 | +25 |
| Silver | 10 | +50 |
| Gold | 25 | +150 |
| Platinum | 50 | +350 |
| Diamond | 100 | +1000 |

### 10.4 Referral Dashboard
- **File**: `src/app/dashboard/referrals/page.tsx`, `src/components/dashboard/referrals/referrals-page.tsx`
- **Route**: `/dashboard/referrals`
- Stats grid: total referrals, completed, credits earned, ambassador tier
- Referral link/code copy-to-clipboard
- Social share button
- Ambassador milestone progress bar
- Referral history list
- Tabbed view: My Referrals / Leaderboard

### 10.5 Ambassador Leaderboard
- **File**: `src/components/referrals/ambassador-leaderboard.tsx`
- **Edge Function**: `supabase/functions/ambassador-leaderboard/index.ts`
- **API Route**: `GET /api/referrals/leaderboard`
- Tier information cards (Bronze → Diamond)
- Top 50 ambassadors with rank, avatar, name, tier badge, referral count, credits earned
- Crown/trophy/medal for top 3

---

## 11. Admin Panel

### 11.1 Admin Dashboard
- **File**: `src/app/dashboard/admin/page.tsx`, `src/components/admin/admin-dashboard.tsx`
- **Route**: `/dashboard/admin`
- Platform-wide analytics and stats overview
- Quick stats cards (users, runs, revenue, etc.)
- Protected by `AdminRouteGuard`

### 11.2 User Management
- **File**: `src/app/dashboard/admin/users/page.tsx`, `src/components/admin/admin-users.tsx`
- **Route**: `/dashboard/admin/users`
- User list with search and filter
- Ban/unban users
- Adjust user credits
- User detail view
- Pagination

### 11.3 Credit Management
- **File**: `src/app/dashboard/admin/credits/page.tsx`, `src/components/admin/admin-credits.tsx`
- **Route**: `/dashboard/admin/credits`
- Credit audit log across all users
- Manual credit adjustments

### 11.4 System Monitoring
- **File**: `src/app/dashboard/admin/monitoring/page.tsx`, `src/components/admin/admin-monitoring.tsx`
- **Route**: `/dashboard/admin/monitoring`
- System health status
- Performance metrics
- Sandbox container status

### 11.5 AI Provider Configuration
- **File**: `src/app/dashboard/admin/ai/page.tsx`, `src/components/admin/admin-ai-provider.tsx`
- **Route**: `/dashboard/admin/ai`
- Configure AI provider endpoints and API keys
- Toggle between providers

### 11.6 Runs Dashboard
- **File**: `src/app/dashboard/admin/runs/page.tsx`, `src/components/admin/admin-runs-dashboard.tsx`
- **Route**: `/dashboard/admin/runs`
- All runs across all users
- Run detail view

### 11.7 Admin API Routes
| Route | Purpose |
|-------|---------|
| `GET /api/admin/users` | List users |
| `GET/PUT /api/admin/users/[userId]` | User detail/edit |
| `POST /api/admin/users/[userId]/ban` | Ban/unban |
| `POST /api/admin/users/[userId]/credits` | Adjust credits |
| `GET /api/admin/credits` | Credit audit |
| `GET /api/admin/stats` | Platform statistics |
| `GET /api/admin/analytics` | Analytics data |
| `GET /api/admin/runs` | All runs |
| `GET /api/admin/runs/[runId]` | Run detail |
| `GET/PUT /api/admin/abuse` | Abuse reports |
| `GET /api/admin/health` | Health check |
| `GET /api/admin/metrics` | Platform metrics |
| `GET /api/admin/audit` | Audit log |
| `POST /api/admin/verify` | Admin verification |
| `POST /api/admin/maintenance` | Maintenance actions |
| `POST /api/admin/newsletter` | Send newsletter |
| `GET/PUT /api/admin/sandbox-config` | Sandbox configuration |
| `GET/PUT /api/admin/throttles` | Rate limit config |
| `GET/PUT /api/admin/ai-provider` | AI provider config |
| `GET /api/admin/contact-messages` | Contact form messages |

---

## 12. Real-Time Collaboration

### 12.1 Collab Cursors
- **File**: `src/components/workspace/collab-cursors.tsx`
- Real-time collaborator cursor overlay on the canvas
- Multi-user awareness in workspace

### 12.2 Collaboration Provider
- **File**: `src/lib/collaboration/collab-provider.ts`
- Shared editing state management
- Cursor position broadcasting
- Real-time updates via Supabase Realtime

---

## 13. Notifications

### 13.1 Notification Center
- **File**: `src/components/dashboard/notification-center.tsx`
- **API Route**: `GET /api/notifications`, `POST /api/notifications/[id]/read`
- User notification panel in dashboard
- Notification types: system, referral, billing, project activity
- Read/unread status tracking

### 13.2 Database Notifications
- `notifications` table with: user_id, type, title, message, read status, metadata
- Welcome notification on signup
- Referral milestone notifications
- Subscription/billing state change notifications

---

## 14. Design System & Theming

### 14.1 Design Philosophy ("The Workbench")
- Dark-first, flat surfaces with tonal layering
- Green (#00C853) as the sole accent color — used on ≤10% of any screen
- Type-driven hierarchy — scale and weight for separation, not borders or backgrounds
- Sparse borders — whitespace and font weight create structure
- Flat and precise — minimal elevation, no shadows on surfaces
- 6px consistent border-radius on all interactive and container elements

### 14.2 Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| Workspace Black | #0A0D0A | Page background |
| Cast Iron | #111411 | Card/panel surfaces |
| Ash | #171C17 | Secondary surfaces, toolbars |
| Deep Moss | #1E261E | Tertiary surfaces, hover fills |
| Vine Border | #1F2B1F | Default borders |
| Thicker Vine | #283228 | Stronger borders |
| Terminal Green | #00C853 | Primary accent (CTAs, active states) |
| Bright Green | #00E676 | Hover state for primary |
| Alert Red | #FF5252 | Destructive actions, errors |
| Signal Amber | #FFAB00 | Warnings, pending |
| Link Blue | #40C4FF | Links, info badges |
| Accent Purple | #CE93D8 | Experimental/labs features |

### 14.3 Typography
| Style | Size | Weight | Usage |
|-------|------|--------|-------|
| Display | 32px | 600 | Page titles, hero sections |
| Headline | 22px | 600 | Section headers |
| Title | 17px | 600 | Card titles, panel headings |
| Subtitle | 14px | 500 | Small headings, group labels |
| Body | 13px | 400 | Primary reading text |
| Caption | 11px | 400 | Metadata, timestamps |
| Stat | 24px | 600 | Numeric values (green) |
| Mono | 12px | 400 | Code, data, shortcuts |

- **Primary font**: Inter (with system-sans fallback)
- **Mono font**: JetBrains Mono

### 14.4 Theme
- **File**: `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`, `src/components/theme-init-script.tsx`
- Dark-first default with light/dark toggle
- Theme init script prevents flash on load
- Next-themes based implementation

### 14.5 Key Design Rules
- No gradient text, glassmorphism, or decorative blur effects
- No box-shadow on cards or static surfaces
- No em dashes
- No animated layout properties (animations on transforms and opacity only)
- WCAG 2.1 AA contrast ratios (4.5:1 minimum)
- `prefers-reduced-motion` support

---

## 15. Public / Marketing Pages

### 15.1 Landing Page
- **Route**: `/` (src/app/page.tsx)
- Hero section with animated tagline
- Capabilities bento grid (AI Debugging, Web Builder, Multiple languages)
- Live demo mock section
- Supported languages bar
- Pricing section with 5 tiers
- Call-to-action section
- Framer Motion scroll animations

### 15.2 Features Page
- **Route**: `/features`
- AI debugging showcase
- Speed/latency highlights
- Web builder overview
- 10+ languages display
- Security and best practices

### 15.3 Pricing Page
- **Route**: `/pricing`
- 5 plan cards: Free ($0), Pro ($9), Team ($99), Business ($299), Enterprise ($999+)
- Detailed feature comparison table
- Plan-specific CTAs

### 15.4 About Page
- **Route**: `/about`
- Mission statement
- Story section
- Stats: 10+ languages, <3s debug, 94% accuracy, 12k+ users
- Values section

### 15.5 Demo
- **Route**: `/demo`
- 4-step walkthrough: buggy code → AI analysis → root cause breakdown → fixed code
- Sub-pages: `/demo/ui`, `/demo/ui/dashboard`, `/demo/ui/debugger`, `/demo/ui/workspace`

### 15.6 Documentation
- **Route**: `/docs`
- Product documentation page

### 15.7 FAQ
- **Route**: `/faq`
- Accordion-style Q&A (5+ questions about security, pricing, languages)

### 15.8 Languages
- **Route**: `/languages`
- 12 supported programming languages display

### 15.9 Other Public Pages
| Route | Page |
|-------|------|
| `/contact` | Contact form (name, email, subject, message) |
| `/terms` | Terms of Service |
| `/privacy` | Privacy Policy |
| `/careers` | Careers page (remote-first, benefits, open positions) |

---

## 16. API Routes

### 16.1 AI & Generation
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/generate` | AI code generation (SSE streaming) |
| POST | `/api/generate/schema` | Schema generation |
| POST | `/api/generate/template` | Template generation |
| POST | `/api/debug` | AI debugging (SSE streaming) |
| POST | `/api/debug-analyze` | Structured analysis (JSON) |
| GET/POST | `/api/debug-sessions` | Debug session CRUD |
| GET/DELETE | `/api/debug-sessions/[id]` | Debug session CRUD |
| POST | `/api/agent/turn` | Agent tool-calling loop |

### 16.2 Threads & Chat
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/threads` | List/create threads |
| GET/PUT/DELETE | `/api/threads/[threadId]` | Thread CRUD |
| GET/POST | `/api/threads/[threadId]/messages` | Messages in thread |

### 16.3 Projects
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/projects` | List/create projects |
| GET/PUT/DELETE | `/api/projects/[id]` | Project CRUD |
| GET/PUT | `/api/projects/[id]/settings` | Settings |
| GET/POST | `/api/projects/[id]/branches` | Git branches |
| POST | `/api/projects/[id]/deploy` | Deploy |
| GET/POST/DELETE | `/api/projects/[id]/domains` | Custom domains |
| GET/POST/DELETE | `/api/projects/[id]/env-vars` | Environment variables |
| POST | `/api/projects/[id]/git` | Git operations |
| POST | `/api/projects/[id]/git/push` | Git push |
| GET/POST/DELETE | `/api/projects/[id]/integrations` | Integrations |
| GET/POST | `/api/projects/[id]/pull-requests` | Pull requests |
| POST | `/api/projects/[id]/save-code` | Save code |

### 16.4 Sandbox / Execution
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/runs` | List/create runs |
| GET | `/api/runs/[runId]` | Run details |
| POST | `/api/runs/[runId]/cancel` | Cancel run |
| POST | `/api/runs/[runId]/execute` | Execute run |
| POST | `/api/sandbox/create` | Create sandbox |
| GET | `/api/sandbox/[id]/logs` | Sandbox logs (SSE) |
| POST | `/api/sandbox/[id]/stop` | Stop sandbox |
| GET | `/api/sandbox/[id]/export` | Export as zip |

### 16.5 Auth & Users
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/auth/session` | Current session |
| GET | `/api/user/invoices` | User invoices |

### 16.6 Credits & Billing
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/credits` | Credit balance |
| GET | `/api/transactions` | Transaction history |
| POST | `/api/create-checkout` | Stripe checkout |
| POST | `/api/coupons/redeem` | Redeem coupon |

### 16.7 Referrals
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/referrals/generate` | Generate code |
| POST | `/api/referrals/track` | Track referral |
| GET | `/api/referrals/leaderboard` | Ambassador leaderboard |

### 16.8 Workspace
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/workspaces` | Workspace CRUD |
| GET/POST | `/api/workspaces/[id]/members` | Members |
| GET/POST | `/api/workspaces/[id]/invitations` | Invitations |

### 16.9 Infrastructure
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/notifications` | User notifications |
| POST | `/api/notifications/[id]/read` | Mark read |
| POST | `/api/newsletter` | Newsletter subscription |
| POST | `/api/contact` | Contact form |
| GET | `/api/github/repos` | GitHub repos |
| POST | `/api/deploy/trigger` | Deploy trigger |
| POST | `/api/deploy/archive` | Deploy archive |

---

## 17. Infrastructure & DevOps

### 17.1 Production Architecture
- All-in-one VPS (Hostinger KVM2): Next.js app + Docker sandboxes on same host
- Caddy reverse proxy terminates TLS (Let's Encrypt)
- Supabase cloud-hosted (separate from VPS)

### 17.2 Docker Deployment
- **File**: `deploy/docker-compose.yml`, `Dockerfile`
- Standalone Next.js output (output: "standalone")
- Multi-stage Docker build
- Caddyfile for reverse proxy configuration

### 17.3 Monitoring
- **Sentry**: `sentry.client.config.ts`, `sentry.edge.config.ts`, `sentry.server.config.ts`
- Error tracking across client, edge, and server
- Health check endpoint: `GET /api/health`
- Admin monitoring page with system metrics

### 17.4 CI/CD
- GitHub Actions on every PR: lint, typecheck, test, build
- Supabase migrations and edge functions deploy from `main`
- Auto-build and deploy via Docker Compose

### 17.5 Security
- Row Level Security (RLS) on all Supabase tables
- CSRF protection on API routes
- Server-side plan enforcement and rate limiting (`src/lib/server/plan-enforcement.ts`)
- Audit logging (`src/lib/server/audit-log.ts`)
- Graceful shutdown handler (`src/lib/server/shutdown.ts`)
- Admin emails allowlist in environment variables

### 17.6 SEO
- **File**: `src/lib/seo.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`
- Dynamic sitemap generation
- Robots.txt
- Per-page metadata builder

---

## 18. Database Schema

### 18.1 Tables (`supabase/migrations/001_initial_schema.sql`)

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (extends auth.users): id, email, full_name, avatar_url, plan, is_admin, stripe_customer_id |
| `credit_wallets` | Credit balances: id, owner_id, balance |
| `credit_transactions` | Transaction ledger: id, wallet_id, amount, type (earned/spent/refunded), source, description, metadata |
| `generations` | Web builder code versions: id, user_id, code, version, description, stack, prompt, metadata |
| `debug_sessions` | Debugging sessions: id, user_id, language, code, error_message, fix, explanation, tags |
| `messages` | Chat messages for AI context: id, user_id, role, content, generation_id, metadata |
| `referrals` | Referral relationships: id, referrer_id, referee_id, code, status, credits_earned |
| `referral_payouts` | Payout tracking: id, referral_id, user_id, amount, status |
| `notifications` | User notifications: id, user_id, type, title, message, read, metadata |

### 18.2 Key Features
- RLS policies on all tables
- Auto-create profile and wallet on user signup
- 30 free credits for new users
- Welcome notification on signup
- Updated_at triggers on profiles and credit_wallets
- Indexes for query performance

### 18.3 Migrations
| File | Changes |
|------|---------|
| `001_initial_schema.sql` | Core tables, RLS, triggers |
| `002_add_stripe_columns.sql` | `stripe_customer_id` on profiles, indexes |
| `003_add_referral_ambassador.sql` | `get_ambassador_leaderboard()` SQL function, indexes |

---

## 19. Testing

### 19.1 Unit Tests (Vitest)
**File**: `vitest.config.ts`

| Test File | Tests |
|-----------|-------|
| `src/__tests__/api-error.test.ts` | API error handling |
| `src/__tests__/auth-flow.test.ts` | Auth flow logic |
| `src/__tests__/credits-service.test.ts` | Credit operations |
| `src/__tests__/csrf.test.ts` | CSRF protection |
| `src/__tests__/generation-store.test.ts` | Generation store |
| `src/__tests__/middleware.test.ts` | Middleware logic |
| `src/__tests__/rate-limit.test.ts` | Rate limiting |
| `src/__tests__/schema-generator.test.ts` | Schema generation |
| `src/__tests__/session-store.test.ts` | Session store |
| `src/__tests__/validation-schemas.test.ts` | Zod schemas |
| `src/__tests__/workspace-store.test.ts` | Workspace store |
| Visual editor tests | component-palette, property-panel, visual-editor-canvas, visual-editor-root |

### 19.2 E2E Tests (Playwright)
**File**: `playwright.config.ts`
- End-to-end browser tests
- Playwright test reporter
- Test results in `test-results/`, `playwright-report/`

---

## 20. State Management Stores

All stores use **Zustand** with persistence where noted.

| Store | File | Persisted | Key State |
|-------|------|-----------|-----------|
| generation-store | `src/store/generation-store.ts` | Yes | currentCode, activeFile, virtualFiles, previewNonce, versions, runtimeErrors, accumulated text |
| session-store | `src/store/session-store.ts` | Yes | user, isAuthenticated, isLoading, credits, plan |
| debug-store | `src/store/debug-store.ts` | Yes | language, code, error, result, sessions |
| workspace-store | `src/store/workspace-store.ts` | Yes | mode (build/debug), selectedProject, projectKey |
| visual-editor-store | `src/store/visual-editor-store.ts` | Yes | pages, components, globalCSS, libraries |
| shell-store | `src/store/shell-store.ts` | No | Shell UI state |
| code-blocks-store | `src/store/code-blocks-store.ts` | No | Code block extraction state |

---

## 21. Custom Hooks

### 21.1 Feature Hooks
| Hook | File | Purpose |
|------|------|---------|
| `useGeneration` | `src/hooks/use-generation.ts` | AI code generation + debugging with SSE streaming, file extraction, version saving |
| `useSandbox` | `src/hooks/use-sandbox.ts` | Docker sandbox lifecycle (create, logs SSE, stop, export) |
| `useSession` | `src/hooks/use-session.ts` | Supabase session management |
| `useReferrals` | `src/hooks/use-referrals.ts` | Referral code, tracking, stats |
| `useUndoRedo` | `src/hooks/use-undo-redo.ts` | Undo/redo with snapshot history |
| `useDashboardShell` | `src/hooks/use-dashboard-shell.ts` | Dashboard shell state |

### 21.2 Query Hooks (TanStack React Query)
| Hook | File | Query Key |
|------|------|-----------|
| `useMe` | `src/hooks/queries/use-me.ts` | Current user profile |
| `useMyProjects` | `src/hooks/queries/use-my-projects.ts` | User's projects |
| `useProject` | `src/hooks/queries/use-project.ts` | Single project |
| `useProjectVersions` | `src/hooks/queries/use-project-versions.ts` | Version history |
| `useMyRuns` | `src/hooks/queries/use-my-runs.ts` | User's runs |
| `useRunDetails` | `src/hooks/queries/use-run-details.ts` | Single run |
| `useMyThreads` | `src/hooks/queries/use-my-threads.ts` | Chat threads |
| `useMyDebugSessions` | `src/hooks/queries/use-my-debug-sessions.ts` | Debug history |
| `useMyTransactions` | `src/hooks/queries/use-my-transactions.ts` | Transactions |
| `useAdminUsers` | `src/hooks/queries/use-admin-users.ts` | Admin: users |
| `useAdminCredits` | `src/hooks/queries/use-admin-credits.ts` | Admin: credits |
| `useAdminAnalytics` | `src/hooks/queries/use-admin-analytics.ts` | Admin: analytics |
| `useAdminAuth` | `src/hooks/queries/use-admin-auth.ts` | Admin: auth |

---

## File Structure Reference

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (ThemeProvider, QueryProvider, Toaster)
│   ├── page.tsx                  # Landing page
│   ├── sitemap.ts                # Dynamic sitemap
│   ├── robots.ts                 # Robots.txt
│   ├── login/                    # /login
│   ├── signup/                   # /signup
│   ├── reset-password/           # /reset-password
│   ├── verify-email/             # /verify-email
│   ├── auth/                     # Auth callback + signin route
│   ├── pricing/                  # /pricing
│   ├── features/                 # /features
│   ├── about/                    # /about
│   ├── contact/                  # /contact
│   ├── docs/                     # /docs
│   ├── faq/                      # /faq
│   ├── languages/                # /languages
│   ├── terms/                    # /terms
│   ├── privacy/                  # /privacy
│   ├── careers/                  # /careers
│   ├── demo/                     # /demo walkthrough
│   ├── preview/[id]/[...slug]/   # Sandbox preview proxy
│   ├── dashboard/                # Protected dashboard
│   │   ├── page.tsx              # Workspace root / ProjectsHub
│   │   ├── home/                 # Dashboard home (stats, recent items)
│   │   ├── debug/                # AI debugger + history
│   │   ├── web-builder/          # Web builder (redirects to workspace)
│   │   ├── pricing/              # Dashboard pricing
│   │   ├── referrals/            # Referral program
│   │   ├── runs/                 # Run history
│   │   ├── branches/             # Git branches
│   │   ├── settings/             # Account settings
│   │   ├── projects/[id]/        # Project settings
│   │   ├── admin/                # Admin panel
│   │   └── layout.tsx            # Dashboard layout
│   └── api/                      # API routes
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── auth/                     # Auth forms & session
│   ├── dashboard/                # Dashboard components
│   ├── workspace/                # Workspace/IDE components
│   ├── web-builder/              # Chat panel, code editor, preview
│   ├── visual-editor/            # Drag-and-drop builder
│   ├── schema-generator/         # DB schema generator
│   ├── project/                  # Project settings sections
│   ├── admin/                    # Admin panel components
│   ├── referrals/                # Referral components
│   ├── pricing/                  # Pricing components
│   ├── docs/                     # Docs page
│   ├── navigation.tsx            # Site navigation
│   ├── footer.tsx                # Site footer
│   ├── public-layout.tsx         # Public page layout
│   ├── logo.tsx                  # App logo
│   ├── theme-provider.tsx        # Theme context
│   ├── theme-toggle.tsx          # Dark/light toggle
│   ├── theme-init-script.tsx     # Flash prevention
│   ├── query-provider.tsx        # TanStack Query provider
│   ├── supabase-lock-handler.tsx # Auth lock handler
│   ├── loading-skeleton.tsx      # Loading skeletons
│   └── animations.tsx            # Framer Motion helpers
├── hooks/                        # Custom React hooks
│   ├── queries/                  # TanStack Query hooks
│   ├── use-generation.ts
│   ├── use-sandbox.ts
│   ├── use-session.ts
│   ├── use-referrals.ts
│   ├── use-undo-redo.ts
│   └── use-dashboard-shell.ts
├── lib/
│   ├── server/                   # Server-only modules
│   ├── ai/                       # AI provider router
│   ├── agent/                    # Agent tools & bridges
│   ├── sandbox/                  # Docker sandbox manager
│   ├── project/                  # Virtual files, file tree, file ops
│   ├── collaboration/            # Real-time collaboration provider
│   ├── validations/              # Zod schemas
│   ├── supabase.ts               # Supabase client
│   ├── auth.ts                   # Auth server actions
│   ├── client-auth.ts            # Client auth helpers
│   ├── admin-auth.ts             # Admin auth
│   ├── constants.ts              # App constants
│   ├── utils.ts                  # General utilities
│   ├── seo.ts                    # Metadata builder
│   ├── analytics.ts              # Analytics helpers
│   ├── extract-code.ts           # Code extraction
│   ├── sse-parser.ts             # SSE parser
│   ├── credits-service.ts        # Credit operations
│   └── csrf-client.ts            # CSRF helpers
├── store/                        # Zustand stores
├── services/                     # (empty — logic in API routes & lib/)
├── proxy.ts                      # Sandbox proxy
└── __tests__/                    # Unit tests
```

---

*This document was generated from codebase exploration. Last updated: 2026-06-04.*
