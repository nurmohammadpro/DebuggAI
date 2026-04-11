---
name: context
description: Project overview, tech stack, architecture, and key files for DeBuggAI
type: context
---

# DeBuggAI Project Context

## Project Overview

DeBuggAI is an AI-powered Flutter debugging assistant that helps developers analyze, fix, and understand Flutter code issues. Users can paste error messages, code snippets, or describe bugs, and the AI provides actionable solutions.

**Core Value Proposition**: Debug Flutter apps 10x faster with AI-powered analysis and code generation.

## Tech Stack

### Frontend
- **Flutter**: 3.24.0 (Web, iOS, Android)
- **State Management**: Riverpod/Provider (`flutter_riverpod`)
- **Routing**: `go_router`
- **HTTP**: Supabase Flutter client
- **Local Storage**: SharedPreferences for session persistence

### Backend
- **Supabase**: Postgres database, Auth, Storage, Edge Functions
- **Edge Functions**: Deno runtime
- **AI Provider**: Groq (Llama 3.3 70B)
- **Payments**: Stripe (subscriptions, webhooks)

### Deployment
- **Web**: Netlify (production) + Vercel (CI/CD)
- **Mobile**: iOS App Store, Android Play Store
- **CI/CD**: GitHub Actions

## Architecture

### Frontend Structure

```
lib/
├── main.dart                    # App entry point
├── src/
    ├── features/
    │   ├── auth/               # Login, signup, password reset
    │   ├── home/               # Dashboard/home screen
    │   ├── debug/              # Core debugging features
    │   ├── pricing/            # Subscription plans
    │   ├── settings/           # User settings
    │   └── referrals/          # Referral program
    ├── widgets/                # Reusable UI components
    ├── services/               # API services
    └── utils/                  # Helpers, constants
```

### Backend Structure

```
supabase/
├── migrations/                 # SQL schema changes
├── functions/
│   ├── debug-ai-analyze/      # Main AI analysis endpoint
│   ├── debug-ai-reverse/      # Bug-to-solution endpoint
│   ├── generate-web-code/     # Code generation endpoint
│   ├── stripe_webhook/        # Stripe event handling
│   └── save-debug-session/    # Session persistence
```

### Database Tables

- `profiles`: User data, plan type, credits, Stripe customer ID
- `debug_sessions`: Debugging session history
- `web_builder_sessions`: Web builder state
- `credit_wallets`: Credit balance tracking
- `credit_transactions`: Transaction ledger
- `referrals`: Referral relationships
- `referral_payouts`: Payout tracking

## Key Files to Know

### Environment Configuration
- `lib/src/utils/env.dart` - Supabase URL, anon key, Stripe publishable key
- `.env` - Local development secrets (NEVER commit)

### State Management
- `lib/src/services/session_store.dart` - Global session state (credits, plan type)

### API Services
- `lib/src/services/debug_ai_service.dart` - Main AI debugging service
- `lib/src/services/web_builder_service.dart` - Web builder state management

### Routing
- `lib/src/router/app_router.dart` - Route configuration, guards

### Edge Functions (Critical)
- `supabase/functions/debug-ai-analyze/index.ts` - Bug analysis endpoint
- `supabase/functions/debug-ai-reverse/index.ts` - Solution-to-bug endpoint
- `supabase/functions/generate-web-code/index.ts` - Web code generation
- `supabase/functions/stripe_webhook/index.ts` - Subscription lifecycle

## Current Issues & Known Bugs

1. **Hardcoded API Keys**: Groq API key exposed in multiple edge functions (S01)
2. **Wrong Stripe Price IDs**: `pricing_page.dart` passes product IDs instead of price IDs (P01)
3. **Double JSON Parse**: `debug-ai-reverse` calls `req.json()` twice (B01)
4. **Missing Credit Wallet**: First generation fails if wallet row doesn't exist (P06)
5. **Admin Routes Unguarded**: `/admin` endpoints accessible without auth (S04)
6. **Streaming Not Implemented**: AI responses should stream via SSE (B06)

## Development Workflow

1. **Local Dev**: `flutter run -d chrome` (web) or `flutter run` (mobile)
2. **Supabase Local**: `supabase start` (Docker required)
3. **Test**: `flutter test`
4. **Build**: `flutter build web --release`
5. **Deploy**: `netlify deploy --prod` (web) or `supabase functions deploy --all` (backend)

## Environment Variables Required

### Production
```bash
AI_API_KEY=gsk_XXX (Groq)
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
STRIPE_SECRET_KEY=sk_live_XXX
STRIPE_WEBHOOK_SECRET=whsec_XXX
SUPABASE_URL=https://XXX.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

### Local Development
```bash
# Supabase local
supabase start

# Flutter
--dart-define=SUPABASE_URL=http://localhost:54321
--dart-define=SUPABASE_ANON_KEY=eyJ...
```

## Deployment Priorities

**P0** (Blocks production):
- API key rotation (S01)
- Supabase production setup (DEP01-DEP07)
- Stripe price ID fix (P01)
- Credit wallet bug (P06)

**P1** (High impact):
- Admin route guards (S04)
- Subscription flow (P02-P05)
- iOS/Android store submissions (DEP12-DEP20)

**P2** (Nice to have):
- UI polish (U01-U15)
- Referral program (R01-R06)
- CI/CD automation (DEP21-DEP23)

## Related Skills

See MEMORY.md for complete skill index covering:
- Security fixes (security-fixer.md)
- Database migrations (db-migrator.md)
- Edge function debugging (edge-function-debugger.md)
- Flutter core fixes (flutter-core-fixer.md)
- UI polish (ui-polisher.md)
- Payments integration (payments-integrator.md)
- Referral wiring (referral-wirer.md)
- Deployment automation (deployment-automator.md)
