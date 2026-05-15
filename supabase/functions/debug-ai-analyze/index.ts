/**
 * Debug AI Analyze Edge Function
 *
 * Multi-language code debugging with AI.
 * Supports JavaScript, TypeScript, Python, PHP, Go, Ruby, Java, C#, Rust.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DebugAnalyzeRequest {
  threadId?: string;
  code: string;
  errorMessage?: string;
  language?: string;
  history?: Array<{ role: string; content: string }>;
  idempotencyKey?: string;
}

// Language-specific error patterns and hints
const languageHints: Record<string, string> = {
  javascript: `Common JavaScript errors:
- TypeError: Cannot read property 'X' of undefined - null/undefined access
- ReferenceError: X is not defined - missing variable/declaration
- SyntaxError: Unexpected token - syntax issue
- Promise rejection - unhandled async error
- this is undefined - arrow function or binding issue`,

  typescript: `Common TypeScript errors:
- Type 'X' is not assignable to type 'Y' - type mismatch
- Property 'X' does not exist on type 'Y' - missing type definition
- Cannot find name 'X' - missing import/declaration
- Type 'X' is not generic - missing generic type parameter`,

  python: `Common Python errors:
- IndentationError - incorrect indentation
- NameError: name 'X' is not defined - variable not defined
- TypeError - wrong type for operation
- AttributeError - object has no such attribute
- KeyError - dictionary key not found
- ImportError - module not found or path issue`,

  php: `Common PHP errors:
- Fatal Error: Call to undefined function - function doesn't exist
- Notice: Undefined variable - variable not declared
- Warning: Invalid argument supplied - wrong type
- Parse error: syntax error - syntax mistake`,

  go: `Common Go errors:
- panic: runtime error - program crash
- nil pointer dereference - accessing nil pointer
- cannot use X (type Y) as type Z - type mismatch
- undefined: X - identifier not declared
- import cycle - circular import`,

  ruby: `Common Ruby errors:
- NoMethodError: undefined method - method doesn't exist
- NameError: undefined local variable - variable not defined
- ArgumentError: wrong number of arguments - argument count mismatch
- SyntaxError - syntax issue`,

  java: `Common Java errors:
- NullPointerException - accessing null object
- ClassNotFoundException - class not found
- NoSuchMethodError - method doesn't exist
- IncompatibleClassChangeError - version mismatch`,

  csharp: `Common C# errors:
- NullReferenceException - accessing null object
- IndexOutOfRangeException - array index out of bounds
- InvalidOperationException - invalid operation for current state
- ArgumentException - invalid argument passed`,

  rust: `Common Rust errors:
- use of moved value - value used after move
- borrow checker error - lifetime/ownership issue
- mismatched types - type mismatch
- cannot find X - item not in scope`,
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request
    const {
      threadId,
      code,
      errorMessage,
      language,
      history = [],
      idempotencyKey,
    }: DebugAnalyzeRequest = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Spend credits (basic analyze)
    const creditsToSpend = 1;
    const { error: spendError } = await supabase.rpc('spend_credits', {
      p_user_id: user.id,
      p_amount: creditsToSpend,
      p_source: 'debug_analyze',
      p_description: 'Debug analyze',
      p_idempotency_key: idempotencyKey || null,
      p_metadata: { language: language || null },
    });

    if (spendError) {
      const msg = spendError.message || 'Failed to spend credits';
      const status = msg.toLowerCase().includes('insufficient') ? 402 : 500;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Auto-detect language if not provided
    let detectedLanguage = language;
    if (!detectedLanguage) {
      try {
        const detectResponse = await fetch(`${supabaseUrl}/functions/v1/detect-language`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (detectResponse.ok) {
          const detectData: { language: string; confidence: number } = await detectResponse.json();
          if (detectData.confidence > 0.5) {
            detectedLanguage = detectData.language;
          }
        }
      } catch (e) {
        console.error('Language detection failed:', e);
      }
    }

    // Default to unknown if still not detected
    detectedLanguage = detectedLanguage || 'unknown';

    // 4. Build system prompt with language-specific hints
    const languageHint = languageHints[detectedLanguage] || '';

    const systemPrompt = `You are DeBuggAI, an expert code debugger specializing in ${detectedLanguage.toUpperCase()}.

Your task is to analyze broken code and provide:
1. Root cause identification - What is causing the error?
2. Suggested fixes - How to fix the error with code examples
3. Best practices - How to avoid this error in the future
4. Related concepts - What to learn to prevent similar errors

Format your response with clear sections:
**Root Cause:** [explanation]
**Fix:** [corrected code in markdown code block]
**Explanation:** [what was wrong and how the fix works]
**Best Practices:** [how to avoid this error]
**Related Concepts:** [what to learn]

${languageHint ? `\nCommon ${detectedLanguage} errors to check for:\n${languageHint}\n` : ''}`;

    // 5. Build messages array
    const userMessage = errorMessage
      ? `**Code:**\n\`\`\`\n${code}\n\`\`\`\n\n**Error Message:**\n${errorMessage}`
      : `**Code:**\n\`\`\`\n${code}\n\`\`\`\n\nPlease analyze this code for potential bugs and edge cases.`;

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage },
    ];

    // 6. Call AI API
    const apiKey = Deno.env.get('AI_API_KEY');
    const baseUrl = Deno.env.get('AI_BASE_URL') || 'https://api.groq.com/openai/v1';
    const model = Deno.env.get('AI_MODEL') || 'llama-3.3-70b-versatile';

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: aiMessages,
        stream: false, // No streaming for analyze (complex response)
        temperature: 0.5,
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return new Response(
        JSON.stringify({ error: `AI API error: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Parse response
    const aiData = await aiResponse.json();
    const analysis = aiData.choices?.[0]?.message?.content || '';

    if (!analysis) {
      return new Response(
        JSON.stringify({ error: 'No analysis generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If we have a threadId, create a run + persist messages for Codex/v0-style history.
    let runId: string | null = null;
    if (threadId) {
      const { data: run } = await supabase
        .from('runs')
        .insert({
          thread_id: threadId,
          user_id: user.id,
          status: 'succeeded',
          objective: 'debug_analyze',
          idempotency_key: idempotencyKey || null,
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          metadata: { detectedLanguage, credits: creditsToSpend },
        })
        .select('id')
        .single();
      runId = run?.id || null;

      await supabase.from('thread_messages').insert([
        {
          thread_id: threadId,
          user_id: user.id,
          role: 'user',
          content: userMessage,
          metadata: { source: 'debug_analyze', detectedLanguage },
        },
        {
          thread_id: threadId,
          user_id: user.id,
          role: 'assistant',
          content: analysis,
          model,
          metadata: { source: 'debug_analyze', detectedLanguage, run_id: runId },
        },
      ]);

      await supabase
        .from('threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', threadId);

      await supabase.from('ai_usage_ledger').insert({
        user_id: user.id,
        run_id: runId,
        model,
        input_tokens: null,
        output_tokens: null,
        cost_usd: null,
        credits_charged: creditsToSpend,
        metadata: { source: 'debug_analyze', detectedLanguage },
      });
    }

    // 8. Save debug session to database (legacy history + admin analytics)
    const { data: sessionData, error: sessionError } = await supabase
      .from('debug_sessions')
      .insert({
        user_id: user.id,
        language: detectedLanguage,
        code: code.substring(0, 10000), // Limit code length
        error_message: errorMessage || null,
        fix: analysis.substring(0, 10000), // Limit analysis length
        explanation: analysis.substring(0, 5000),
        tags: [detectedLanguage, errorMessage ? 'error' : 'review'],
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('Failed to save debug session:', sessionError);
    }

    // 9. Return response
    return new Response(
      JSON.stringify({
        analysis,
        language: detectedLanguage,
        sessionId: sessionData?.id,
        runId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Debug analyze error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
