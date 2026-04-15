---
name: todo
description: Implementation task list for DeBuggAI - multi-language debugging and web builder platform with SSE streaming
type: project
---

# DeBuggAI Implementation Todo

## Priority Legend
- **P0**: Blocks production - critical fixes
- **P1**: High priority - core features
- **P2**: Medium priority - important but not blocking
- **P3**: Nice to have - polish and enhancements

---

## Build Order & Phases

### Phase 0: Project Setup (P0)

- [ ] **T001** - Initialize Next.js project with TypeScript
  - Create new Next.js 14+ project with App Router
  - Configure TypeScript strict mode
  - Set up project structure
  - **Priority**: P0 | **Time**: 30 min

- [ ] **T002** - Install and configure dependencies
  - Install: zustand, @tanstack/react-query, axios
  - Install: tailwindcss, shadcn/ui components
  - Install: @monaco-editor/react
  - Install: @supabase/supabase-js
  - Configure environment variables
  - **Priority**: P0 | **Time**: 1 hr

- [ ] **T003** - Set up Supabase project
  - Create Supabase project
  - Configure local development: `supabase start`
  - Set up environment variables
  - **Priority**: P0 | **Time**: 30 min

---

### Phase 1: Database & Auth (P0-P1)

- [ ] **T004** - Create database schema migrations
  - `profiles` table (user data, plan, credits)
  - `generations` table (web builder code, versions)
  - `debug_sessions` table (language, code, error)
  - `credit_wallets` table
  - `credit_transactions` table
  - `messages` table (chat context)
  - `referrals` table
  - **Priority**: P0 | **Time**: 2 hr

- [ ] **T005** - Implement authentication flow
  - Login screen with email/password
  - Registration with email verification
  - Password reset via email
  - Session persistence with JWT
  - **Priority**: P0 | **Time**: 3 hr

- [ ] **T006** - Create Zustand session store
  - User state (id, email, plan)
  - Credits balance with real-time updates
  - Authentication state
  - **Priority**: P1 | **Time**: 1 hr

---

### Phase 2: Credit System & Stripe (P0)

- [ ] **T007** - Implement credit wallet system
  - Display credits on all screens
  - Real-time credit updates via Supabase realtime
  - Credit deduction after each action
  - Low credit warnings
  - **Priority**: P0 | **Time**: 2 hr

- [ ] **T008** - Stripe subscription integration
  - Create checkout session endpoint
  - Configure Stripe price IDs (Free, Pro, Enterprise)
  - Webhook handler for subscription events
  - Plan upgrade/downgrade logic
  - **Priority**: P0 | **Time**: 3 hr

---

### Phase 3: SSE Streaming Infrastructure (P0) ⭐ CRITICAL

- [ ] **T009** - Create `/generate` edge function with SSE
  - Edge function: `supabase/functions/generate/index.ts`
  - Authenticate user
  - Fetch last 10-20 messages from DB for context
  - Call AI API with `stream: true`
  - Pipe ReadableStream to HTTP response
  - **CRITICAL**: Must check for `[DONE]` before JSON.parse
  - **Priority**: P0 | **Time**: 2 hr

- [ ] **T010** - Create `useGeneration` hook for SSE streaming
  - File: `lib/hooks/use-generation.ts`
  - Fetch with streaming reader
  - Buffer chunks until complete lines
  - Parse `data: {...}` lines for delta content
  - Accumulate response text
  - Call `onDone()` when `[DONE]` received
  - **Priority**: P0 | **Time**: 2 hr

- [ ] **T011** - Implement `extractCode()` utility
  - File: `lib/utils/extract-code.ts`
  - Regex patterns: tsx, jsx, typescript, any fence
  - Fallback: detect component-like code
  - Return `null` if no code found
  - **Priority**: P0 | **Time**: 1 hr

- [ ] **T012** - Create generation Zustand store with debouncing
  - File: `lib/store/generation-store.ts`
  - State: `currentCode`, `versions`, `accumulated`
  - **CRITICAL**: Debounce iframe rebuild (500ms)
  - NOT on every delta chunk (prevents hundreds of compiles)
  - **Priority**: P0 | **Time**: 1 hr

---

### Phase 4: Web Builder Sandbox (P0) ⭐ ADD ERROR CAPTURE HERE

- [ ] **T013** - Create iframe sandbox with Babel
  - File: `lib/preview-builder.ts`
  - Inject Babel standalone for JSX transformation
  - Create iframe with proper sandbox attributes
  - Render generated code safely
  - Handle React hydration
  - **Priority**: P0 | **Time**: 2 hr

- [ ] **T014** - Add `window.onerror` to iframe (DEBUGGER ADDITION #1)
  - Inject error listener into iframe HTML template
  - Capture: message, source, line, column, error
  - Fire `postMessage` to parent on runtime error
  - **Priority**: P0 | **Time**: 30 min

- [ ] **T015** - Create Monaco Editor component
  - File: `components/code-editor.tsx`
  - Configure for TypeScript/JSX
  - Syntax highlighting, line numbers
  - Two-way sync with Zustand store
  - **Priority**: P0 | **Time**: 1 hr

- [ ] **T016** - Create preview pane component
  - File: `components/preview-pane.tsx`
  - Iframe with generated code
  - Refresh button
  - Version selector
  - **Priority**: P1 | **Time**: 1 hr

---

### Phase 5: Chat UI & Error Console (P0) ⭐ ADD DEBUG BUTTON HERE

- [ ] **T017** - Create chat panel component
  - File: `components/chat-panel.tsx`
  - Message input with textarea
  - Send button with loading state
  - Message history display
  - Auto-scroll on new messages
  - **Priority**: P0 | **Time**: 2 hr

- [ ] **T018** - Create error console UI (DEBUGGER ADDITION #2)
  - File: `components/error-console.tsx`
  - Read `lastError` from Zustand
  - Display error with details (message, line, column)
  - Show "Debug this" button when error present
  - Clear error button
  - **Priority**: P0 | **Time**: 2 hr

- [ ] **T019** - Wire "Debug this" button to `/debug` endpoint
  - On click: call `/debug` with current code + error
  - Reuse `useGeneration` hook (same streaming)
  - Stream response into chat panel
  - Update code on success
  - **Priority**: P0 | **Time**: 1 hr

---

### Phase 6: `/debug` Edge Function (P0) ⭐ DEBUGGER ADDITION #3

- [ ] **T020** - Create `/debug` edge function (same pattern as `/generate`)
  - File: `supabase/functions/debug/index.ts`
  - Copy SSE streaming boilerplate from `/generate`
  - Change system prompt: "Receive broken code + error, return fixed code"
  - Accept: `code` and `errorMessage` parameters
  - Return: corrected code + explanation
  - **Priority**: P0 | **Time**: 1 hr

---

### Phase 7: Multi-Language Debugging (P0-P1)

- [ ] **T021** - Create language detection service
  - File: `supabase/functions/detect-language/index.ts`
  - Analyze code to determine language
  - Use file extension or syntax patterns
  - Return language + confidence score
  - **Priority**: P1 | **Time**: 1 hr

- [ ] **T022** - Create `/debug-ai-analyze` edge function
  - Accept code + error message
  - Auto-detect or accept language parameter
  - Return: root cause, fixes, best practices
  - Support: JS, PHP, Python, Go, Ruby, Java, C#
  - **Priority**: P0 | **Time**: 2 hr

- [ ] **T023** - Create debug screen UI
  - Code input with language selector
  - Error message input
  - Results display with syntax highlighting
  - Copy fix button
  - **Priority**: P1 | **Time**: 2 hr

---

### Phase 8: Web Builder Templates (P1-P2)

- [ ] **T024** - Create MERN stack template generator
  - MongoDB schema design
  - Express API routes
  - React components with routing
  - Node.js server setup
  - **Priority**: P0 | **Time**: 3 hr

- [ ] **T025** - Create Laravel template generator
  - Laravel project structure
  - Controllers, models, migrations
  - Blade templates
  - Routes configuration
  - **Priority**: P0 | **Time**: 3 hr

- [ ] **T026** - Create Django template generator
  - Django project structure
  - Models, views, templates
  - URLs configuration
  - Admin panel setup
  - **Priority**: P0 | **Time**: 3 hr

- [ ] **T027** - Create Flask template generator
  - Flask app structure
  - Routes and templates
  - SQLAlchemy models
  - **Priority**: P1 | **Time**: 2 hr

- [ ] **T028** - Create Rails template generator
  - Rails scaffold
  - Models, controllers, views
  - Routes configuration
  - **Priority**: P1 | **Time**: 2 hr

- [ ] **T029** - Create Go stack template generator
  - Go project structure
  - Gin/Echo framework setup
  - Handlers and middleware
  - **Priority**: P1 | **Time**: 2 hr

---

### Phase 9: Referral Program (P1-P2)

- [ ] **T030** - Create referral link generation
  - Unique referral code per user
  - Share to social media buttons
  - **Priority**: P1 | **Time**: 1 hr

- [ ] **T031** - Implement referral tracking
  - Track successful referrals
  - Credit rewards (10 for referrer, 10 for referee)
  - Referral statistics dashboard
  - **Priority**: P1 | **Time**: 2 hr

- [ ] **T032** - Create ambassador program
  - Application form
  - Admin approval workflow
  - Monthly leaderboard
  - **Priority**: P2 | **Time**: 3 hr

---

### Phase 10: Admin Dashboard (P1-P2)

- [ ] **T033** - Create admin authentication
  - Admin flag in user profiles
  - Route guards for admin screens
  - **Priority**: P1 | **Time**: 1 hr

- [ ] **T034** - Build user management screen
  - View all users with filtering
  - Edit credits/plans
  - Ban/unban users
  - **Priority**: P1 | **Time**: 2 hr

- [ ] **T035** - Build analytics dashboard
  - Daily active users
  - Credit usage stats
  - Popular languages/stacks
  - Revenue tracking
  - **Priority**: P2 | **Time**: 3 hr

---

### Phase 11: UI/UX Polish (P2-P3)

- [ ] **T036** - Create landing page
  - Hero section with value prop
  - Features showcase
  - Pricing cards
  - CTA buttons
  - **Priority**: P2 | **Time**: 3 hr

- [ ] **T037** - Create dashboard/home screen
  - Quick stats (credits, generations)
  - Recent generations history
  - Quick action buttons
  - **Priority**: P2 | **Time**: 2 hr

- [ ] **T038** - Add loading states and animations
  - Skeleton screens
  - Progress indicators
  - Smooth transitions
  - **Priority**: P3 | **Time**: 2 hr

- [ ] **T039** - Implement dark/light theme toggle
  - Theme persistence
  - System preference detection
  - **Priority**: P3 | **Time**: 1 hr

---

### Phase 12: Security & Performance (P0-P2)

- [ ] **T040** - Implement rate limiting
  - Free: 10 requests/minute
  - Pro: 30 requests/minute
  - Enterprise: Unlimited
  - **Priority**: P1 | **Time**: 2 hr

- [ ] **T041** - Add input sanitization
  - Prevent code injection attacks
  - Sanitize user inputs
  - Content security policy
  - **Priority**: P1 | **Time**: 2 hr

- [ ] **T042** - Optimize database queries
  - Indexes for common queries
  - Query performance monitoring
  - Connection pooling
  - **Priority**: P2 | **Time**: 2 hr

---

### Phase 13: Deployment & DevOps (P0-P1)

- [ ] **T043** - Deploy Supabase to production
  - Run all migrations
  - Deploy edge functions
  - Configure environment variables
  - **Priority**: P0 | **Time**: 1 hr

- [ ] **T044** - Deploy frontend to Vercel
  - Configure Vercel project
  - Set up custom domain
  - Configure SSL
  - **Priority**: P0 | **Time**: 1 hr

- [ ] **T045** - Set up CI/CD pipeline
  - GitHub Actions workflow
  - Automated testing
  - Auto-deploy on merge
  - **Priority**: P1 | **Time**: 2 hr

- [ ] **T046** - Configure monitoring
  - Error tracking (Sentry)
  - Analytics (Plausible)
  - Uptime monitoring
  - **Priority**: P1 | **Time**: 1 hr

---

## Summary

**Total Tasks**: 46
**Critical Path** (P0): T001-T023
**Debugger Timeline**: +4-6 hours on top of base implementation
  - T014: Error capture (30 min)
  - T018: Error console UI (2 hr)
  - T019: Wire debug button (1 hr)
  - T020: `/debug` edge function (1 hr)

**Completion Tracking**
- **Completed**: 0
- **In Progress**: 0
- **Pending**: 46
- **Progress**: 0%

---

## Key Technical Notes

⚠️ **Critical SSE Gotchas**:
1. Always check for `[DONE]` before `JSON.parse()`
2. Debounce Zustand updates (500ms), NOT on every delta
3. Buffer chunks until complete lines

⚠️ **Debugger Integration**:
- Reuses entire `/generate` pipeline
- Only 3 additions: `/debug` endpoint, `window.onerror`, error console UI
- Same `useGeneration` hook for both generation and debugging

---

*Last updated: 2026-04-16*
