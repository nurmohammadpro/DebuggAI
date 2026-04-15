---
name: context
description: Project overview, tech stack, architecture, and key files for DeBuggAI - multi-language debugging and web builder platform
type: context
---

# DeBuggAI Project Context

## Project Overview

DeBuggAI is an AI-powered debugging and web application building platform that supports multiple programming languages and technology stacks. Users can debug code from various languages (JavaScript, PHP, Python, Go, Ruby, etc.) and generate complete web applications using frameworks like MERN, MEAN, Laravel, Django, and more.

**Core Value Proposition**: Debug any code 10x faster and build production-ready web apps in minutes with AI-powered analysis and code generation.

**Key Technical Insight**: The debugger is NOT a separate system. It reuses the same streaming pipeline, iframe sandbox, and chat UI as the code generator. The only additions are:
1. A `/debug` edge function with a different system prompt
2. Error capture via `window.onerror` in the iframe
3. Error console UI with "Debug this" button

---

## Streaming Architecture

### Three-Layer Flow

**Layer 1: Browser → AI → Browser (Top-Level Flow)**
```
User types prompt → useGeneration fetches /generate
→ Edge function authenticates, fetches last 10-20 messages from DB
→ Builds full messages array, calls AI with stream: true
→ AI's ReadableStream body piped into HTTP response
→ Browser reads chunk by chunk, buffering until newlines
→ Each data: {...} line parsed for delta text
→ Delta appended to accumulated
→ When data: [DONE] arrives, onDone() fires
→ extractCode() runs regex to pull code block
→ Zustand currentCode updated (triggers debounced iframe rebuild)
→ Generation saved to DB with incremented version
→ Version selector gains new chip
```

**Layer 2: SSE Streaming Layer**
```
Raw bytes arrive → Buffered into lines
→ Each "data: {...}" line parsed for delta content
→ [DONE] sentinel caught BEFORE any JSON parse attempt
→ Critical: Must check for [DONE] before JSON.parse()
→ Common bug: Forgetting [DONE] check crashes the parser
```

**Layer 3: Code Extraction & Save Flow**
```
onDone() fires → Big markdown string from AI
→ extractCode() regex patterns try tsx, jsx, typescript, any fence
→ Pull TSX component out of markdown
→ Zustand currentCode updated
→ Debounced iframe rebuild triggered (NOT on every delta!)
→ Save to DB with version number
```

### Code Extraction Implementation

```typescript
// src/lib/preview-builder.ts
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

### Debugger Integration

**The debugger adds three things on top of the existing pipeline:**

1. **`/debug` edge function** (built alongside `/generate`)
   - Same SSE streaming boilerplate
   - Different system prompt: "Receive broken code + error message, return corrected component with explanation"
   - 1-2 hours to implement

2. **Error capture in iframe** (Phase 4 sandbox)
   - `window.onerror` listener injected into iframe HTML template
   - Runtime errors fire `postMessage` to parent
   - Parent stores `lastError` in Zustand
   - Under 1 hour to implement

3. **Error console UI** (Phase 5)
   - Reads `lastError` from Zustand
   - Shows "Debug this" button when error present
   - Calls `/debug` with current code + error message
   - Response streams into chat (same `useGeneration` hook)
   - 2-3 hours to implement

**Timeline impact**: +4-6 hours total on original estimate

---

## Tech Stack

### Frontend
- **Framework**: React (Next.js for SEO and performance)
- **Language**: TypeScript
- **State Management**: Zustand (lightweight, simple)
- **Routing**: Next.js App Router
- **HTTP**: Fetch API with SSE streaming
- **Code Editor**: Monaco Editor (VS Code's editor)
- **UI Components**: shadcn/ui / Tailwind CSS
- **Forms**: React Hook Form + Zod validation
- **Live Preview**: Iframe sandbox with Babel standalone

### Backend
- **Platform**: Supabase (Postgres database, Auth, Storage, Edge Functions)
- **Edge Runtime**: Deno
- **AI Provider**: Groq (Llama 3.3 70B) or OpenAI (GPT-4)
- **Payments**: Stripe (subscriptions, webhooks)
- **File Storage**: Supabase Storage

### Deployment
- **Frontend**: Vercel (production)
- **Backend**: Supabase (managed)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (errors), Plausible (analytics)

---

## Architecture

### Frontend Structure

```
app/
├── (auth)/
│   ├── login/
│   ├── signup/
│   └── reset-password/
├── (dashboard)/
│   ├── page.tsx                    # Dashboard/home
│   ├── debug/
│   │   ├── page.tsx                # Debug interface
│   │   └── components/
│   ├── web-builder/
│   │   ├── page.tsx                # Web builder interface
│   │   ├── components/
│   │   │   ├── chat-panel.tsx      # Chat UI with streaming
│   │   │   ├── code-editor.tsx     # Monaco Editor
│   │   │   ├── preview-pane.tsx    # Iframe sandbox
│   │   │   └── error-console.tsx   # Error capture + debug button
│   │   └── lib/
│   │       ├── preview-builder.ts  # Code extraction, iframe builder
│   │       └── use-generation.ts   # SSE streaming hook
│   ├── pricing/
│   ├── settings/
│   └── referrals/
├── api/                             # API route handlers
├── layout.tsx
└── page.tsx                         # Landing page

lib/
├── store/
│   ├── generation-store.ts          # Zustand: code, versions, lastError
│   ├── session-store.ts             # Credits, plan, user
│   └── debug-store.ts               # Debug state
├── services/
│   ├── debug-service.ts
│   ├── web-builder-service.ts
│   └── credit-service.ts
└── utils/
    ├── extract-code.ts              # Code extraction patterns
    └── sse-parser.ts                # SSE stream parser
```

### Backend Structure

```
supabase/
├── migrations/                      # SQL schema changes
├── functions/
│   ├── generate/                    # Web builder generator (SSE streaming)
│   │   └── index.ts
│   ├── debug/                       # Debugger (SSE streaming, same pattern)
│   │   └── index.ts
│   ├── detect-language/
│   │   └── index.ts
│   ├── save-debug-session/
│   │   └── index.ts
│   └── stripe_webhook/
│       └── index.ts
```

### Database Tables

```
profiles                  # User profiles, plan type, settings
generations               # Web builder generations (code, versions)
debug_sessions            # Debugging sessions (language, code, error)
credit_wallets            # Credit balance tracking
credit_transactions       # Transaction ledger
referrals                 # Referral relationships
messages                  # Chat messages (for context window)
```

---

## Critical Implementation Details

### SSE Streaming Gotchas

**1. Always check for [DONE] before JSON.parse**
```typescript
// WRONG - will crash on [DONE]
const data = JSON.parse(line.substring(6));

// RIGHT
const data = line.substring(6);
if (data === '[DONE]') return;
const parsed = JSON.parse(data);
```

**2. Debounce Zustand updates (NOT on every delta)**
```typescript
// WRONG - triggers hundreds of Babel compilations
useEffect(() => {
  setState({ code: accumulated });
}, [accumulated]);

// RIGHT - debounced iframe rebuild
const debouncedUpdate = useMemo(
  () => debounce((code) => setState({ code }), 500),
  []
);
```

**3. Buffer chunks until complete lines**
```typescript
// SSE streams arrive in chunks, not lines
let buffer = '';
reader.read().then(({ done, value }) => {
  buffer += decoder.decode(value);
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line in buffer
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      // Process line
    }
  }
});
```

### Error Capture in Iframe

```typescript
// Injected into iframe HTML
window.onerror = function(message, source, lineno, colno, error) {
  window.parent.postMessage({
    type: 'runtime-error',
    payload: { message, source, lineno, colno }
  }, '*');
};

// Parent component
useEffect(() => {
  const handler = (event) => {
    if (event.data.type === 'runtime-error') {
      setError(event.data.payload);
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}, []);
```

---

## Build Order

**Phase 0**: Setup (Next.js, Supabase, Tailwind, shadcn/ui)
**Phase 1**: Database & Auth (migrations, auth flow)
**Phase 2**: Credit System (wallet, transactions, Stripe)
**Phase 3**: SSE Streaming Infrastructure (`/generate` edge function, `useGeneration` hook)
**Phase 4**: Web Builder Sandbox (iframe, Babel, error capture) ← Add `window.onerror` here
**Phase 5**: Chat UI + Error Console (chat panel, debug button) ← Build error console here
**Phase 6**: `/debug` edge function (same pattern as `/generate`, different prompt)
**Phase 7+: Polish, deployment, monitoring

---

## Supported Languages & Stacks

### Debugging Languages
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

### Web Builder Stacks
- **MERN**: MongoDB, Express, React, Node.js
- **MEAN**: MongoDB, Express, Angular, Node.js
- **Laravel**: PHP, Laravel, MySQL/PostgreSQL
- **Django**: Python, Django, PostgreSQL
- **Flask**: Python, Flask, SQLAlchemy
- **Rails**: Ruby, Rails, PostgreSQL
- **Go Stack**: Go, Gin/Echo, PostgreSQL

---

## Environment Variables Required

### Production
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://XXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# AI Provider
AI_API_KEY=gsk_XXX (Groq) or sk-XXX (OpenAI)
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile

# Stripe
STRIPE_SECRET_KEY=sk_live_XXX
STRIPE_WEBHOOK_SECRET=whsec_XXX
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_XXX

# Stripe Price IDs
PRICE_PRO_MONTHLY=price_XXX
PRICE_ENTERPRISE_MONTHLY=price_XXX
```

### Local Development
```bash
# Supabase local
supabase start

# Next.js
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## Deployment Priorities

**P0** (Blocks production):
- SSE streaming infrastructure (`useGeneration`, `/generate`)
- Code extraction (`extractCode()`)
- Iframe sandbox with error capture
- Credit system
- Stripe integration

**P1** (High impact):
- `/debug` edge function
- Error console UI
- Authentication flow
- Session management

**P2** (Nice to have):
- UI polish and animations
- Referral program
- Additional language/stack support

---

## Security Considerations

1. **API Keys**: Never commit hardcoded API keys
2. **Rate Limiting**: Implement per-user rate limits
3. **Input Sanitization**: Sanitize all code inputs before processing
4. **Auth**: Secure JWT token handling
5. **CORS**: Configure proper CORS policies
6. **Webhook Verification**: Verify Stripe webhook signatures
7. **Iframe Sandbox**: Use sandbox attribute to restrict iframe capabilities

---

*Last updated: 2026-04-16*
