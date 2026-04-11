---
name: edge-function-debugger
description: Track 3 - Backend/Edge Functions (B01-B10). Fix 2 live bugs, add SSE streaming to all AI functions, create save/history endpoints, and add performance optimizations. P0-P2 priority.
type: skill
---

# Edge Function Debugger

**Purpose**: Fix critical live bugs, add SSE streaming for AI responses, and create new persistence endpoints.

**Priority**: P0-P2 - Two live bugs are P0. SSE streaming is P1 for UX.

---

## B01 - Fix debug-ai-reverse: Double req.json() Call

**Time**: 30 min | **Priority**: P0

**What's broken**: `req.json()` is called twice. Second call throws because body stream is consumed.

**File**: `supabase/functions/debug-ai-reverse/index.ts` lines ~45 and ~55

**Fix**:
```typescript
// BEFORE (BAD - crashes)
const { prompt } = await req.json();
// ... later ...
const { isZeroKnowledge } = await req.json(); // THROWS!

// AFTER (GOOD)
const { prompt, isZeroKnowledge } = await req.json();
// Parse once, destructure both fields
```

**Verification**:
```bash
# Deploy and test
supabase functions deploy debug-ai-reverse
curl -X POST \
  "$(supabase status | grep 'API URL' | awk '{print $3}')/functions/v1/debug-ai-reverse" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","isZeroKnowledge":true}'
# Should return response, not 500 error
```

---

## B02 - Fix generate-web-code: Race Condition in Credit Deduction

**Time**: 1 hr | **Priority**: P0

**What's broken**: `read -> check >= 50 -> update` pattern allows double-spend.

**File**: `supabase/functions/generate-web-code/index.ts`

**Fix**:
```typescript
// BEFORE (BAD - race condition)
const { data: wallet } = await supabaseClient
  .from('credit_wallets')
  .select('balance')
  .eq('owner_id', user.id)
  .single();

if (wallet.balance < 50) {
  return new Response(JSON.stringify({ error: 'Insufficient credits' }), { status: 402 });
}

await supabaseClient
  .from('credit_wallets')
  .update({ balance: wallet.balance - 50 })
  .eq('owner_id', user.id);

// AFTER (GOOD - atomic)
const { data, error } = await supabaseClient
  .rpc('deduct_credits', {
    p_owner_id: user.id,
    p_amount: 50
  });

if (error || !data) {
  return new Response(JSON.stringify({ error: 'Insufficient credits' }), { status: 402 });
}
```

**Also create RPC function** (add to migrations):
```sql
CREATE OR REPLACE FUNCTION deduct_credits(p_owner_id uuid, p_amount int)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance int;
BEGIN
  UPDATE credit_wallets
  SET balance = balance - p_amount
  WHERE owner_id = p_owner_id AND balance >= p_amount
  RETURNING balance INTO v_balance;

  RETURN FOUND;
END;
$$;
```

**Verification**: Run two concurrent requests - only one should succeed.

---

## B03 - Convert debug-ai-analyze to SSE Streaming

**Time**: 1 hr | **Priority**: P1

**What's needed**: Stream AI responses so user sees text appear live.

**File**: `supabase/functions/debug-ai-analyze/index.ts`

**Implementation**:
```typescript
// Add stream:true to Groq API call
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    stream: true, // Enable streaming
  }),
});

// Transform stream to SSE format
const stream = response.body;
const reader = stream.getReader();
const decoder = new TextDecoder();

const transformStream = new ReadableStream({
  async start(controller) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              break;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      controller.close();
    }
  },
});

return new Response(transformStream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
});
```

**Verification**:
```bash
# Test with curl
curl -N "$(supabase status | grep 'API URL' | awk '{print $3}')/functions/v1/debug-ai-analyze" \
  -d '{"prompt":"test"}' \
  -H "Content-Type: application/json"
# Should see multiple "data:" lines appear over time
```

---

## B04 - Convert debug-ai-reverse to SSE Streaming

**Time**: 1 hr | **Priority**: P1

**Prerequisites**: B01 must be done first.

**File**: `supabase/functions/debug-ai-reverse/index.ts`

**Implementation**: Same pattern as B03.

**Verification**: Stream delivers chunks, not single response.

---

## B05 - Convert generate-web-code to SSE Streaming

**Time**: 1 hr | **Priority**: P1

**Prerequisites**: B02 must be done first (atomic credit deduction).

**File**: `supabase/functions/generate-web-code/index.ts`

**Key difference**: Deduct credits BEFORE starting stream.

**Implementation**:
```typescript
// 1. Atomic credit deduction (from B02)
const creditResult = await supabaseClient.rpc('deduct_credits', {
  p_owner_id: user.id,
  p_amount: 50,
});

if (!creditResult.data) {
  return new Response(JSON.stringify({ error: 'Insufficient credits' }), { status: 402 });
}

// 2. Then stream the response
// ... same streaming pattern as B03 ...
```

**Verification**: Credits deducted once, HTML streams live.

---

## B06 - Create /save-debug-session Edge Function

**Time**: 1 hr | **Priority**: P1

**What's needed**: Persist debug sessions after analysis (for U01 history).

**File**: `supabase/functions/save-debug-session/index.ts` (new)

**Implementation**:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')!.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { title, prompt, result, action_type, files_count, credits_spent } = await req.json();

    const { data, error } = await supabase
      .from('debug_sessions')
      .insert({
        user_id: user.id,
        title,
        prompt,
        result,
        action_type,
        files_count,
        credits_spent,
      })
      .select('id')
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ id: data.id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

**Verification**:
```bash
curl -X POST "$(supabase status | grep 'API URL' | awk '{print $3}')/functions/v1/save-debug-session" \
  -H "Authorization: Bearer $JWT" \
  -d '{"title":"test","prompt":"...","result":"...","action_type":"analyze","files_count":3,"credits_spent":5}'
# Should return: {"id":"uuid"}
```

---

## B07 - Create /get-debug-history Edge Function

**Time**: 1 hr | **Priority**: P1

**What's needed**: Retrieve recent sessions for history list.

**File**: `supabase/functions/get-debug-history/index.ts` (new)

**Implementation**:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')!.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { data, error } = await supabase
      .from('debug_sessions')
      .select('id, title, action_type, files_count, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

**Verification**:
```bash
curl "$(supabase status | grep 'API URL' | awk '{print $3}')/functions/v1/get-debug-history" \
  -H "Authorization: Bearer $JWT"
# Should return array of session objects
```

---

## B08 - Add Groq System Prompt Caching Headers

**Time**: 2 hr | **Priority**: P2

**What's needed**: Groq supports Cache-Control on system prompts. Reduces latency ~40%.

**Files**: All AI edge functions

**Implementation**:
```typescript
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Cache-Control': 'max-age=86400', // Cache for 24 hours
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are a debugging assistant...' // Static system prompt
      },
      { role: 'user', content: prompt }
    ],
    stream: true,
  }),
});
```

**Verification**: Measure latency before/after for same prompt.

---

## B09 - Add Model Tiering by Prompt Complexity

**Time**: 2 hr | **Priority**: P2

**What's needed**: Short prompts → faster/cheaper model. Long prompts → powerful model.

**Files**: All AI edge functions

**Implementation**:
```typescript
function selectModel(prompt: string, fileCount: number): string {
  const promptLength = prompt.length;

  // Short, simple prompts → fast model
  if (promptLength < 500 && fileCount === 0) {
    return 'llama-3.1-8b-instant';
  }

  // Long prompts or with files → powerful model
  return 'llama-3.3-70b-versatile';
}

// In handler
const model = selectModel(prompt, files?.length ?? 0);

const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  body: JSON.stringify({
    model, // Use selected model
    messages: [...],
  }),
});
```

**Verification**: Short prompts use 8b, long prompts use 70b.

---

## B10 - Add Error Logging and Alerting

**Time**: 2 hr | **Priority**: P2

**What's needed**: Log AI failures and optionally alert via Slack webhook.

**Migration** (add to migrations):
```sql
CREATE TABLE IF NOT EXISTS ai_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  function_name text NOT NULL,
  error_code int,
  error_message text,
  prompt_preview text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_errors_user ON ai_error_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_errors_func ON ai_error_logs(function_name, created_at DESC);
```

**In edge functions**:
```typescript
try {
  const response = await fetch(groqUrl, options);

  if (!response.ok) {
    // Log error
    await supabase
      .from('ai_error_logs')
      .insert({
        user_id: user?.id,
        function_name: 'debug-ai-analyze',
        error_code: response.status,
        error_message: await response.text(),
        prompt_preview: prompt.slice(0, 200),
      });

    // Optional: Slack alert
    if (response.status >= 500) {
      fetch(Deno.env.get('SLACK_WEBHOOK_URL')!, {
        method: 'POST',
        body: JSON.stringify({
          text: `🚨 AI Error: ${response.status} in debug-ai-analyze`,
        }),
      }).catch(() => {}); // Fire and forget
    }

    throw new Error(`Groq API error: ${response.status}`);
  }
} catch (error) {
  // ... handle error
}
```

**Verification**:
```sql
SELECT * FROM ai_error_logs ORDER BY created_at DESC LIMIT 10;
```

---

## Completion Checklist

- [ ] B01: Double req.json() bug fixed in debug-ai-reverse
- [ ] B02: Race condition fixed with atomic credit deduction
- [ ] B03: debug-ai-analyze converted to SSE streaming
- [ ] B04: debug-ai-reverse converted to SSE streaming
- [ ] B05: generate-web-code converted to SSE streaming
- [ ] B06: /save-debug-session edge function created
- [ ] B07: /get-debug-history edge function created
- [ ] B08: System prompt caching added (P2)
- [ ] B09: Model tiering implemented (P2)
- [ ] B10: Error logging table and alerting (P2)

**Next tracks**: Track 4 (Flutter Core) or Track 5 (Flutter UI/UX).
