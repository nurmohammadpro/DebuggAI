# Mobile-first QA — Dashboard, Workspace, Debug Session

Date: 2026-06-06
Viewport: 390×844, touch enabled
Auth: authenticated test session, credentials redacted
Base URL: http://localhost:3000

## Summary

Mobile health improved from rough to usable on the tested core surfaces.

| Route | Final result |
| --- | --- |
| `/dashboard/home` | No horizontal overflow, 0 viewport-small targets, 0 console errors |
| `/dashboard?create=1` | No horizontal overflow, 1 minor select caret/input artifact, 2 transaction 400s |
| `/dashboard/debug` | No horizontal overflow, 0 viewport-small targets, 0 console errors |
| `/dashboard/debug/history` | No horizontal overflow, 1 minor select input artifact, 0 console errors |
| `/dashboard/settings` | No horizontal overflow, 4 remaining sub-40px targets in settings form |

## Key Findings

### Fixed in this pass

1. Workspace/project hub had mobile horizontal overflow.
   - Before: `scrollWidth/clientWidth = 485/390`.
   - After: `390/390`.
   - Cause: project rows kept icon actions in a fixed right-side cluster.
   - Fix: mobile card stack with full-width 44px action row.

2. Dashboard and debug shell controls were too small for touch.
   - Dashboard after: 0 viewport-small targets.
   - Debug after: 0 viewport-small targets.
   - Fix: header/menu/help/account controls and debug toolbar controls use 40–44px targets.

3. Hidden mobile sidebar leaked a bottom-left account bubble in dev screenshots.
   - Cause: nested fixed mobile drawer wrapper in inline shell.
   - Fix: render the drawer directly; note the remaining black `N` bubble in local screenshots is the Next.js dev portal indicator, not app UI.

4. Project cards emitted SVG path console errors for Next.js icons.
   - Before: repeated `<path> attribute d: Expected number` console errors.
   - Fix: replaced malformed Next.js SVG path with a simple `N` mark.

5. Debug session overpromised real debugging.
   - Finding: `EnhancedDebugTracer` is currently simulated client state, not AI/sandbox-backed debugging.
   - Fix: page subtitle and in-page banner now explicitly say “Prototype mode” / “Local simulated trace preview”.

### Still Open

1. `/dashboard?create=1` still gets two `400` responses from Supabase `credit_transactions`.
   - This is not a mobile layout bug; it is a data/API/query issue in recent transactions.

2. Settings page still has four sub-40px targets.
   - Remaining targets: Change Avatar, Display Name input, Email input, Save Changes.
   - Deferred because the user asked to focus on dashboard/workspace/debug session.

3. Debug session is not a real debugger yet.
   - Current behavior: local `setInterval` stepping, mock variables, mock console logs, save only shows toast.
   - Next product step: connect debug session to a real analyzer/execution API, persist sessions, and make code editable/importable.

## Evidence

Screenshots and JSON metrics:

- `.gstack/qa-reports/screenshots/mobile-first-2026-06-06-auth/`
- `.gstack/qa-reports/screenshots/mobile-first-2026-06-06-after/`
- `.gstack/qa-reports/screenshots/mobile-first-2026-06-06-final/`

Validation commands:

- `npx tsc -p tsconfig.json --noEmit`
- `npx eslint src/components/ui/dialog.tsx src/components/dashboard/sidebar/unified-layout.tsx src/components/dashboard/sidebar/unified-header.tsx src/components/workspace/workspace-account-menu.tsx src/components/workspace/workspace-sidebar.tsx src/components/dashboard/home/enhanced-dashboard-home.tsx src/components/dashboard/home/recent-runs.tsx src/components/dashboard/home/recent-debug-sessions.tsx src/components/dashboard/home/recent-transactions.tsx src/components/dashboard/projects/create-project-dialog.tsx src/components/dashboard/projects/projects-filters.tsx src/components/dashboard/projects/projects-hub.tsx src/components/dashboard/projects/project-card.tsx src/components/dashboard/client-dashboard-shell.tsx src/components/dashboard/debug/enhanced-debug-tracer.tsx src/components/dashboard/debug/debug-history.tsx`

Lint status: 0 errors, existing unused-code warnings remain.
