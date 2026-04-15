---
name: features
description: Complete feature specifications for DeBuggAI - multi-language debugging and web builder platform with SSE streaming
type: reference
---

# DeBuggAI Features

## Project Overview

DeBuggAI is an AI-powered debugging and web application building platform that supports multiple programming languages and technology stacks. Users can debug code from various languages and generate complete web applications using frameworks like MERN, MEAN, Laravel, Django, and more.

**Core Value Proposition**: Debug any code 10x faster and build production-ready web apps in minutes with AI-powered analysis and code generation.

**Key Technical Insight**: The debugger is NOT a separate system. It reuses the same streaming pipeline, iframe sandbox, and chat UI as the code generator. The debugger is the web builder with three additions:
1. A `/debug` edge function with a different system prompt
2. Error capture via `window.onerror` in the iframe
3. Error console UI with "Debug this" button

---

## Core Features

### 1. SSE Streaming Infrastructure ⭐ FOUNDATIONAL

**Architecture**: Three-layer streaming flow

**Layer 1: Browser → AI → Browser**
```
User prompt → useGeneration hook → /generate endpoint
→ Auth + fetch context from DB → Call AI with stream: true
→ ReadableStream piped to HTTP response
→ Browser buffers chunks into lines
→ Parse data: {...} for delta content
→ Accumulate response → [DONE] arrives
→ extractCode() regex → Zustand update
→ Debounced iframe rebuild → Save to DB
```

**Layer 2: SSE Parsing**
```typescript
// lib/utils/sse-parser.ts
export async function parseSSEResponse(response: Response) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    buffer += decoder.decode(value);
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6);
        if (data === '[DONE]') return accumulated; // CHECK BEFORE PARSE
        const parsed = JSON.parse(data);
        accumulated += parsed.choices[0]?.delta?.content || '';
      }
    }
  }
  return accumulated;
}
```

**Layer 3: Code Extraction**
```typescript
// lib/utils/extract-code.ts
export function extractCode(markdown: string): string | null {
  const patterns = [
    /```tsx\n([\s\S]*?)```/,
    /```jsx\n([\s\S]*?)```/,
    /```typescript\n([\s\S]*?)```/,
    /```\n([\s\S]*?)```/,
  ];

  for (const pattern of patterns) {
    const match = markdown.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  if (markdown.includes('export default') && markdown.includes('return (')) {
    return markdown.trim();
  }

  return null;
}
```

**Critical Gotchas**:
- ⚠️ Always check `[DONE]` before `JSON.parse()`
- ⚠️ Debounce iframe updates (500ms) - NOT on every delta
- ⚠️ Buffer chunks until complete lines

---

### 2. Web Builder with Integrated Debugger ⭐ CORE

**Components**:
1. Monaco Editor - Code editing with TypeScript/JSX support
2. Iframe Sandbox - Live preview with Babel transformation
3. Chat Panel - Natural language interface with streaming
4. Error Console - Runtime error capture + "Debug this" button

**Web Builder Flow**:
```
User types: "Create a login form with email validation"
→ Chat panel sends to /generate
→ SSE streams response
→ extractCode() pulls TSX from markdown
→ Zustand updates currentCode (debounced)
→ Iframe rebuilds with Babel
→ Live preview shows login form
→ Version saved to DB
```

**Debugger Flow** (built into web builder):
```
User clicks a button → Runtime error occurs
→ window.onerror captures in iframe
→ postMessage fires to parent
→ Error console shows: "TypeError: validateEmail is not defined"
→ User clicks "Debug this"
→ /debug endpoint receives: currentCode + errorMessage
→ SSE streams fixed code
→ extractCode() pulls corrected TSX
→ Zustand updates currentCode
→ Iframe rebuilds with fix
→ Error clears
```

**Stack Selection**:
- MERN (MongoDB, Express, React, Node.js)
- MEAN (MongoDB, Express, Angular, Node.js)
- Laravel (PHP, Laravel, MySQL)
- Django (Python, Django, PostgreSQL)
- Flask (Python, Flask, SQLAlchemy)
- Rails (Ruby, Rails, PostgreSQL)
- Go (Go, Gin/Echo, PostgreSQL)

**Feature Templates**:
- Authentication (JWT, OAuth, Session)
- Database models and migrations
- API routes with validation
- Frontend components with routing
- Admin panels
- File upload handling

---

### 3. Multi-Language Debugging

**Supported Languages**:
- JavaScript / TypeScript
- PHP
- Python
- Go
- Ruby
- Java
- C#
- Rust
- Swift
- Kotlin

**Debug AI Analyze** (`/debug-ai-analyze`)
- Accepts: error message, stack trace, or code snippet
- Auto-detects programming language
- Returns:
  - Root cause identification
  - Suggested fixes with code examples
  - Related concepts to learn
  - Prevention strategies
  - Language-specific best practices
- Credit cost: 1 credit

**Language Detection** (`/detect-language`)
- Analyzes code to determine language
- Uses file extension, syntax patterns, or AI detection
- Returns: language + confidence score
- Credit cost: Free

**Language-Specific Error Patterns**:

| Language | Common Errors | Patterns |
|----------|--------------|----------|
| JavaScript | TypeError, ReferenceError, Promise rejection | `console.log`, `async/await`, `import` |
| PHP | Fatal errors, exceptions, warnings | `$variable`, `function`, `class` |
| Python | Traceback, IndentationError, ImportError | `def`, `class`, `import` |
| Go | panic, nil pointer, compile errors | `func`, `package`, `go` |
| Ruby | NoMethodError, nil issues | `def`, `class`, `module` |

---

### 4. Session Management

**Save Debug Session** (`/save-debug-session`)
- Saves to: `debug_sessions` table
- Stores: language, prompt, AI response, timestamp, tags
- Credit cost: 10 credits

**Get Debug History** (`/get-debug-history`)
- Retrieves user's past sessions
- Pagination support
- Filter by: language, date range, tags
- Search functionality
- Credit cost: Free

**Generations History** (Web Builder)
- Stores in: `generations` table
- Tracks: code, versions, timestamp, stack type
- Version selector in UI
- Revert to previous version
- Credit cost: Free to view

---

### 5. Credits System

**Credit Wallet**:
- New users: 30 free credits
- Pro plan: 300 credits/month
- Enterprise: Unlimited credits
- Real-time balance via Supabase realtime
- Low credit warnings

**Credit Costs**:
| Action | Cost |
|--------|------|
| Debug analysis | 1 credit |
| Reverse debugging | 2 credits |
| Web builder (small) | 20 credits |
| Web builder (medium) | 50 credits |
| Web builder (large) | 100 credits |
| Save session | 10 credits |

**Credit Transactions**:
- Full ledger of all transactions
- Filters: date, type (earned/spent), amount
- Export to CSV
- Real-time balance updates

---

### 6. Subscription Plans

**Free Plan**
- 30 credits/month
- All debugging features
- 7-day session history
- Basic web builder templates
- Rate limit: 10 requests/minute

**Pro Plan - $9/month**
- 300 credits/month
- Priority AI processing
- 90-day session history
- Full web builder access
- Priority support
- Rate limit: 30 requests/minute

**Enterprise Plan - $49/month**
- Unlimited credits
- Dedicated AI model
- Unlimited history
- Custom stack templates
- SLA guarantee
- No rate limiting

---

### 7. Referral Program

**Refer & Earn**
- Unique referral link per user
- 10 credits for each successful referral
- Referee gets 10 credits too
- Track clicks and conversions

**Ambassador Program**
- Top 10 ambassadors leaderboard
- Bonus credits for top performers
- Monthly payouts for high-volume referrers
- Ambassador review queue for approval
- Custom referral dashboard

---

### 8. Authentication

**Email/Password**
- Standard email/password auth
- Password reset via email
- Email verification required
- Session persistence with JWT
- Logout from all devices

**Google OAuth**
- One-click Google sign-in
- Automatic profile creation
- Link to existing account
- Profile picture sync

**Session Security**
- JWT token authentication
- Auto-refresh on expiry
- Secure token storage (httpOnly cookies)
- CSRF protection

---

### 9. User Profile

**Profile Settings**
- Display name
- Email address
- Profile picture upload
- Plan type display
- Preferred languages/stacks

**Settings Screen**
- Manage subscription
- View credit balance and transactions
- Referral dashboard access
- API key management
- Logout

---

### 10. Admin Dashboard

**Admin Features**
- View all users with filtering
- Manage credit allocations
- Review ambassador applications
- Monitor system health
- View analytics and metrics
- Bulk user operations

**Admin Routes**
- `/admin/users` - User management
- `/admin/credits` - Credit administration
- `/admin/referrals` - Referral program oversight
- `/admin/analytics` - System metrics
- `/admin/ambassadors` - Ambassador approvals

---

## API Endpoints

### Edge Functions

```
POST  /functions/v1/generate              # Web builder generator (SSE streaming)
POST  /functions/v1/debug                 # Debugger (SSE streaming, same pattern)
POST  /functions/v1/detect-language       # Language detection
POST  /functions/v1/debug-ai-analyze      # Multi-language debugging
POST  /functions/v1/save-debug-session    # Save session
GET   /functions/v1/get-debug-history     # Get history
POST  /functions/v1/create-subscription-checkout  # Stripe checkout
POST  /functions/v1/stripe-webhook        # Stripe events
```

### Database Tables

```
profiles                  # User profiles, plan, settings
generations               # Web builder code, versions
debug_sessions            # Debugging sessions (language, code, error)
credit_wallets            # Credit balances
credit_transactions       # Transaction ledger
referrals                 # Referral relationships
referral_payouts          # Payout tracking
messages                  # Chat messages (for context window)
language_templates        # Code snippets by language
stack_templates           # Web builder templates by stack
```

---

## Technical Specifications

### Rate Limiting
- Free users: 10 requests/minute
- Pro users: 30 requests/minute
- Enterprise: Unlimited

### Data Retention
- Free: 7 days
- Pro: 90 days
- Enterprise: 1 year

### Code Editor Features
- Monaco Editor integration
- Syntax highlighting for 10+ languages
- Line numbers and error indicators
- Auto-completion
- Multiple file support
- Theme support (dark/light)
- Keyboard shortcuts

### Iframe Sandbox
- Babel standalone for JSX transformation
- React runtime for component rendering
- `window.onerror` for error capture
- `postMessage` for parent communication
- Sandbox attribute for security

---

## Web Builder Templates

### MERN Stack Template
```
project/
├── backend/
│   ├── config/
│   ├── models/        # Mongoose schemas
│   ├── routes/        # Express routes
│   ├── controllers/   # Business logic
│   └── middleware/    # Auth, validation
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── public/
└── README.md
```

### Laravel Template
```
project/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   └── Middleware/
│   ├── Models/
│   └── Providers/
├── database/
│   ├── migrations/
│   └── seeders/
├── resources/
│   ├── views/
│   └── lang/
├── routes/
│   ├── web.php
│   └── api.php
└── composer.json
```

### Django Template
```
project/
├── manage.py
├── project/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── models.py
│   ├── views.py
│   ├── urls.py
│   └── admin.py
├── templates/
├── static/
└── requirements.txt
```

---

## Feature Dependencies

| Feature | Depends On |
|---------|-----------|
| Credit deductions | Credit wallet row exists |
| Save session | Credits >= 10 |
| Subscription flow | Stripe price IDs |
| Referral payouts | Ambassador approval |
| Admin access | Admin flag in profiles |
| Web builder | Language templates exist |
| History search | Saved sessions exist |
| Debugger | Web builder iframe exists |
| Error console | window.onerror in iframe |

---

## Upcoming Features (Planned)

### V2.2
- [ ] Real-time collaborative debugging
- [ ] Team workspaces
- [ ] Code snippet library
- [ ] Integration with GitHub repositories

### V2.3
- [ ] VS Code extension
- [ ] IntelliJ plugin
- [ ] CLI tool
- [ ] Custom AI model selection

### V3.0
- [ ] Mobile app (React Native)
- [ ] Offline mode
- [ ] White-label solution for enterprises
- [ ] API for third-party integrations

---

## Implementation Status

**Phase 0**: Project Setup - Not started
**Phase 1**: Database & Auth - Not started
**Phase 2**: Credits & Stripe - Not started
**Phase 3**: SSE Streaming - Not started ⭐ CRITICAL PATH
**Phase 4**: Web Builder Sandbox - Not started
**Phase 5**: Chat & Error Console - Not started
**Phase 6**: `/debug` Edge Function - Not started

**Overall Progress**: 0%

---

## Key Technical Learnings

### SSE Streaming Must-Haves
1. Check for `[DONE]` before JSON parsing
2. Buffer chunks until complete lines
3. Debounce iframe updates (prevent hundreds of compiles)

### Debugger Integration
- Not a separate system
- Reuses entire `/generate` pipeline
- Only 3 additions: `/debug` endpoint, `window.onerror`, error console
- Same `useGeneration` hook for both

### Iframe Security
- Use `sandbox` attribute
- Restrict capabilities
- `allow-same-origin` for postMessage
- `allow-scripts` for Babel

---

*Last updated: 2026-04-16*
