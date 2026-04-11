---
name: workflows
description: Complete workflow documentation for DeBuggAI development, deployment, and operations
type: reference
---

# DeBuggAI Workflows

## Development Workflows

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/nurmohammadpro/DebuggAI.git
cd DebuggAI

# 2. Install Flutter
# Download from https://flutter.dev/docs/get-started/install
flutter --version  # Should be 3.24.0+

# 3. Install dependencies
flutter pub get

# 4. Set up Supabase locally
supabase init
supabase start

# 5. Configure environment
cp .env.example .env
# Edit .env with your Supabase local credentials

# 6. Run web app
flutter run -d chrome

# 7. Run mobile app
flutter run  # Connect device or emulator
```

### Database Development Workflow

```bash
# Create new migration
supabase migration new add_new_table

# Edit migration file in supabase/migrations/
# Edit: supabase/migrations/025_add_new_table.sql

# Apply to local database
supabase db reset

# Test migration locally
supabase db diff --schema public

# Push to production (when ready)
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --linked
```

### Edge Function Development

```bash
# Create new function
supabase functions new my-function

# Develop locally (hot reload)
supabase functions serve --env-file .env

# Test function
curl -X POST 'http://localhost:54321/functions/v1/my-function' \
  -H 'Content-Type: application/json' \
  -d '{"test": "data"}'

# Deploy to production
supabase functions deploy my-function
```

## User Workflows

### New User Onboarding

```
1. User lands on home page
   ↓
2. Clicks "Get Started" or "Sign Up"
   ↓
3. Creates account (email/password or Google OAuth)
   ↓
4. Email verification sent
   ↓
5. User verifies email
   ↓
6. Auto-logged in with 30 free credits
   ↓
7. Onboarding tutorial shows key features
   ↓
8. Redirected to Debug screen
```

### Debug Session Flow

```
1. User navigates to Debug screen
   ↓
2. Enters Flutter error/stack trace/code
   ↓
3. Selects options:
   - Analyze bug
   - Generate fix
   - Explain code
   ↓
4. Clicks "Analyze" (1 credit deducted)
   ↓
5. AI streams response in real-time
   ↓
6. User reviews analysis
   ↓
7. Optional: Save session (50 credits)
   ↓
8. Session saved to history
```

### Subscription Upgrade Flow

```
1. User clicks "Upgrade" in pricing or settings
   ↓
2. PricingPage shows plan comparison
   ↓
3. User selects Pro or Enterprise
   ↓
4. Clicks "Upgrade" button
   ↓
5. create_subscription_checkout edge function called
   ↓
6. Stripe Checkout URL returned
   ↓
7. User redirected to Stripe hosted checkout
   ↓
8. User enters payment details
   ↓
9. Payment successful
   ↓
10. Stripe webhook fires: customer.subscription.created
   ↓
11. Webhook updates profiles.plan_type
   ↓
12. User redirected back to app with success screen
   ↓
13. Credits updated (300 for Pro, unlimited for Enterprise)
```

### Credit Purchase Flow (Not Yet Implemented)

```
1. User runs low on credits (< 20% threshold)
   ↓
2. Low-credit warning banner appears
   ↓
3. User clicks "Top Up"
   ↓
4. Credit purchase modal shows options:
   - 100 credits - $4.99
   - 500 credits - $19.99
   - 1000 credits - $34.99
   ↓
5. User selects package
   ↓
6. Stripe Checkout session created
   ↓
7. Payment processed
   ↓
8. Credits added to wallet immediately
   ↓
9. Transaction recorded in credit_transactions
```

### Referral Program Flow

```
Referrer Side:
1. User finds unique referral link in Settings/Referrals
   ↓
2. Shares link via copy, email, or social
   ↓
3. Referee clicks link

Referee Side:
1. Lands on app with ?ref=CODE parameter
   ↓
2. Creates account (email/password)
   ↓
3. Referral relationship recorded
   ↓
4. Both referrer and referee get +10 credits

Ambassador Flow:
1. User applies for ambassador program
   ↓
2. Admin reviews application
   ↓
3. Admin approves/rejects
   ↓
4. If approved: ambassador flag set to true
   ↓
5. User appears on leaderboard
   ↓
6. Monthly payouts calculated for top performers
```

## Deployment Workflows

### Web Deployment (Netlify)

```bash
# Build for production
flutter build web --release \
  --dart-define=SUPABASE_URL=https://YOUR.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJ... \
  --dart-define=STRIPE_PUBLISHABLE_KEY=pk_live_XXX

# Deploy to Netlify
netlify deploy --prod --dir=build/web

# Or via GitHub Actions (auto-deploy on push to main)
git push origin main
```

### Backend Deployment (Supabase)

```bash
# Link to production project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push --linked

# Deploy all edge functions
supabase functions deploy --all

# Set production secrets
supabase secrets set AI_API_KEY=gsk_XXX
supabase secrets set STRIPE_SECRET_KEY=sk_live_XXX
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_XXX

# Verify deployment
supabase status
supabase functions list
```

### iOS Deployment

```bash
# 1. Configure signing in Xcode
open ios/Runner.xcworkspace
# Set: Bundle ID, Team, Provisioning Profile

# 2. Build IPA
flutter build ipa --release

# 3. Upload to TestFlight (via Xcode Organizer)
# Open Xcode > Organizer > Archive > Distribute App

# 4. Add internal testers
# In App Store Connect > TestFlight

# 5. Submit to App Store
# App Store Connect > App > Prepare for Submission
```

### Android Deployment

```bash
# 1. Build AAB (Android App Bundle)
flutter build appbundle --release

# 2. Upload to Play Console
# Go to https://play.google.com/console
# Create app or select existing
# Upload AAB file

# 3. Fill store listing
# - Description, screenshots, icon
# - Content rating questionnaire
# - Data safety form

# 4. Submit to internal testing
# Then roll out to production
```

## Incident Response Workflows

### API Key Exposed

```
1. Detection: Security scan or user report
   ↓
2. Immediate action:
   - Generate new API key in provider dashboard
   - Update in Supabase secrets: supabase secrets set AI_API_KEY=gsk_NEW
   - Redeploy affected functions
   ↓
3. Investigation:
   - Check usage logs for abuse
   - Review access patterns
   ↓
4. Post-incident:
   - Document in incident log
   - Update security procedures
   - Scan codebase for other exposed keys
```

### Payment Failure Spike

```
1. Detection: Stripe webhook failures spike
   ↓
2. Investigation:
   - Check Stripe dashboard for errors
   - Review webhook logs in Supabase
   - Check recent code changes
   ↓
3. Mitigation:
   - Pause subscription features if needed
   - Communicate with affected users
   ↓
4. Resolution:
   - Fix root cause (code or config)
   - Replay failed webhooks if safe
   - Resume normal operations
```

### Database Migration Failure

```
1. Detection: supabase db push fails
   ↓
2. Assessment:
   - Which migration failed?
   - Is it data loss risk?
   ↓
3. Rollback (if needed):
   - supabase db reset --linked
   - Restore from backup if necessary
   ↓
4. Fix migration:
   - Edit SQL to fix issue
   - Test locally first
   - Apply to production
   ↓
5. Verification:
   - Check data integrity
   - Test application functionality
```

## Monitoring Workflows

### Daily Health Check

```bash
# Check Supabase status
supabase status

# Check function logs
supabase functions logs debug-ai-analyze

# Check database connections
supabase db inspect --schema public

# Monitor credit usage (via dashboard)
# Check: profiles table, credit_wallets, credit_transactions
```

### Weekly Review

```
1. Review metrics:
   - Active users (DAU/WAU/MAU)
   - Debug sessions per day
   - Credit consumption rate
   - Subscription conversions
   - Churn rate
   ↓
2. Review errors:
   - Edge function error rates
   - Database query performance
   - Client-side crash reports
   ↓
3. Review costs:
   - Supabase usage (compute, storage)
   - Groq API costs
   - Stripe fees
   ↓
4. Action items:
   - Optimize slow queries
   - Fix high-error functions
   - Plan capacity upgrades
```

## Maintenance Workflows

### Credit Balance Top-Up

```
1. Monthly cron job (first of month)
   ↓
2. For all active subscribers:
   - Pro plan: Reset to 300 credits
   - Enterprise: No action (unlimited)
   ↓
3. For free users:
   - Reset to 30 credits
   - Check if they exceeded last month
   - Downgrade if abuse detected
   ↓
4. Log all resets in credit_transactions
```

### Session History Cleanup

```
1. Daily cron job
   ↓
2. Delete old sessions based on plan:
   - Free: Older than 7 days
   - Pro: Older than 90 days
   - Enterprise: Older than 1 year
   ↓
3. Soft delete (mark deleted=true)
   - Keep for 30 days in case of restore
   - Hard delete after 30 days
   ↓
4. Notify users before cleanup (optional)
```

### Referral Payout Processing

```
1. Monthly process (last day of month)
   ↓
2. Calculate ambassador earnings:
   - Count successful referrals
   - Multiply by referral bonus rate
   - Apply performance multipliers
   ↓
3. Review top ambassadors
   - Verify no fraud
   - Approve payouts
   ↓
4. Process payments:
   - Via Stripe Connect or PayPal
   - Record in referral_payouts table
   - Mark status: paid
   ↓
5. Email payout receipts
```

## Troubleshooting Workflows

### User Can't Save Session

```
1. Check credit balance
   ↓
2. If balance < 50: Show insufficient credits message
   ↓
3. If balance >= 50: Check credit_wallet row exists
   ↓
4. If no wallet: Create wallet with default balance
   ↓
5. If wallet exists: Check deduct_credits function
   ↓
6. Check RLS policies on credit_wallets table
   ↓
7. Check save-debug-session function logs
```

### AI Response Slow/Timeout

```
1. Check Groq API status
   ↓
2. Check function logs for errors
   ↓
3. Verify AI_API_KEY is valid
   ↓
4. Check rate limiting
   ↓
5. Consider upgrading AI model tier
   ↓
6. Implement streaming response (SSE)
```

### Mobile App Crashes

```
1. Check crash logs (Firebase Crashlytics/Sentry)
   ↓
2. Identify common crash patterns
   ↓
3. Reproduce in debug mode
   ↓
4. Fix root cause
   ↓
5. Test fix thoroughly
   ↓
6. Release hotfix via TestFlight/Play Console internal testing
   ↓
7. After verification, promote to public
```

## CI/CD Workflows

### Pull Request Flow

```
1. Developer creates feature branch
   ↓
2. Makes changes, commits
   ↓
3. Opens PR to main
   ↓
4. GitHub Actions runs:
   - Flutter analyze (lint check)
   - Flutter test (unit tests)
   - Build web (compile check)
   ↓
5. If all checks pass: PR approved
   ↓
6. Merge to main
   ↓
7. Auto-deploy preview to Netlify
   ↓
8. Comment posted with preview URL
```

### Production Release Flow

```
1. Create release branch from main
   ↓
2. Update version numbers
   ↓
3. Tag release: git tag v2.1.0
   ↓
4. Push tag: git push origin v2.1.0
   ↓
5. GitHub Actions:
   - Run full test suite
   - Build web release
   - Deploy to Netlify production
   - Deploy edge functions to Supabase
   ↓
6. Mobile releases:
   - Build iOS IPA manually
   - Build Android AAB manually
   - Submit to stores for review
   ↓
7. Post-release:
   - Monitor error rates
   - Check user feedback
   - Be ready to hotfix if needed
```
