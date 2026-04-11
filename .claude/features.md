---
name: features
description: Complete feature list and specifications for DeBuggAI
type: reference
---

# DeBuggAI Features

## Core Features

### 1. AI-Powered Debugging (v2.1)

**Debug AI Analyze** (`/debug-ai-analyze`)
- Accepts Flutter error messages, stack traces, or code snippets
- Returns detailed analysis with:
  - Root cause identification
  - Suggested fixes with code examples
  - Related concepts to learn
  - Prevention strategies

**Debug AI Reverse** (`/debug-ai-reverse`)
- Input: Working Flutter code
- Output: Potential bugs and edge cases that could occur
- Use case: Code review, proactive debugging

**Generate Web Code** (`/generate-web-code`)
- Generates complete Flutter web code from description
- Supports widgets, layouts, animations
- Includes copy-paste ready code with explanations

### 2. Session Management

**Save Debug Session** (`/save-debug-session`)
- Saves debugging session to Supabase
- Stores: prompt, AI response, timestamp, tags
- Credits: 50 credits per save

**Get Debug History** (`/get-debug-history`)
- Retrieves user's past debugging sessions
- Pagination support
- Filter by date range, tags

### 3. Web Builder (In Development)

**Web Builder Screen**
- Interactive web builder interface
- Drag-and-drop UI components
- Live preview
- Export to Flutter web code
- Session persistence (auto-save)

### 4. Credits System

**Credit Wallet**
- New users: 30 free credits
- Pro plan: 300 credits/month
- Enterprise: Unlimited credits
- Usage:
  - Debug analysis: 1 credit
  - Generate web code: 5 credits
  - Save session: 50 credits

**Credit Transactions**
- Full ledger of all credit transactions
- Filters: date, type (earned/spent), amount
- Export to CSV

### 5. Subscription Plans

**Free Plan**
- 30 credits/month
- Basic debugging features
- 7-day session history

**Pro Plan - $9/month**
- 300 credits/month
- Priority AI processing
- 90-day session history
- Priority support

**Enterprise Plan - $49/month**
- Unlimited credits
- Dedicated AI model
- Unlimited history
- SLA guarantee

### 6. Referral Program

**Refer & Earn**
- Unique referral link per user
- 10 credits for each successful referral
- Referee gets 10 credits too

**Ambassador Program**
- Top 10 ambassadors leaderboard
- Bonus credits for top performers
- Monthly payouts for high-volume referrers
- Ambassador review queue for approval

### 7. Authentication

**Email/Password**
- Standard email/password auth
- Password reset via email
- Email verification required

**Google OAuth** (Planned)
- One-click Google sign-in
- Automatic profile creation

**Session Persistence**
- Stay logged in across app restarts
- Secure token storage
- Auto-refresh on expiry

### 8. User Profile

**Profile Settings**
- Display name
- Email address
- Profile picture
- Plan type display

**Settings Screen**
- Manage subscription
- View credit balance
- Referral dashboard access
- Logout

### 9. Admin Dashboard (Protected)

**Admin Features**
- View all users
- Manage credit allocations
- Review ambassador applications
- Monitor system health
- View analytics

**Admin Routes**
- `/admin/users` - User management
- `/admin/credits` - Credit administration
- `/admin/referrals` - Referral program oversight
- `/admin/analytics` - System metrics

## Upcoming Features (Planned)

### V2.2
- [ ] Real-time collaborative debugging
- [ ] Team workspaces
- [ ] Code snippet library
- [ ] Integration with GitHub repositories

### V2.3
- [ ] Mobile app (iOS/Android)
- [ ] Offline mode
- [ ] Dark/light theme toggle
- [ ] Custom AI model selection

### V3.0
- [ ] Multi-language support (beyond Flutter)
- [ ] IDE extensions (VS Code, IntelliJ)
- [ ] API for third-party integrations
- [ ] White-label solution for enterprises

## Technical Specifications

### Rate Limiting
- Free users: 10 requests/minute
- Pro users: 30 requests/minute
- Enterprise: Unlimited

### Data Retention
- Free: 7 days
- Pro: 90 days
- Enterprise: 1 year

### API Endpoints

#### Edge Functions
```
POST  /functions/v1/debug-ai-analyze
POST  /functions/v1/debug-ai-reverse
POST  /functions/v1/generate-web-code
POST  /functions/v1/save-debug-session
GET   /functions/v1/get-debug-history
POST  /functions/v1/create_subscription_checkout
POST  /functions/v1/stripe_webhook
```

#### Database Tables
```
profiles                  # User profiles
debug_sessions            # Debugging sessions
web_builder_sessions      # Web builder state
credit_wallets            # Credit balances
credit_transactions       # Transaction ledger
referrals                 # Referral relationships
referral_payouts          # Payout tracking
notifications             # User notifications
```

## Feature Dependencies

| Feature | Depends On |
|---------|-----------|
| Credit deductions | Credit wallet row exists |
| Save session | Credits >= 50 |
| Subscription flow | Stripe price IDs |
| Referral payouts | Ambassador approval |
| Admin access | Admin flag in profiles |
| Web builder | Session persistence |
| History search | Saved sessions exist |
