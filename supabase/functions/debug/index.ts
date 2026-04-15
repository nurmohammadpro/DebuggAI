/**
 * Debug Edge Function
 *
 * Debugs broken code with error message using AI with SSE streaming.
 * Uses same streaming pattern as /generate but with debug-focused system prompt.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DebugRequest {
  prompt?: string;
  code: string;
  errorMessage: string;
  history?: Array<{ role: string; content: string }>;
  language?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    // 2. Parse request body
    const { code, errorMessage, prompt, history = [], language }: DebugRequest = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!errorMessage) {
      return new Response(
        JSON.stringify({ error: 'Error message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Build messages array for AI with debug-focused system prompt
    const languageHint = language
      ? `The code is written in ${language}.`
      : 'The code language will be apparent from the syntax.';

    const systemPrompt = `You are DeBuggAI, an expert code debugger. You receive broken code and an error message, then provide a corrected version.

Rules:
1. Analyze the error message and identify the root cause
2. Provide the corrected code in a markdown code block
3. Include a brief explanation of what was wrong and how it was fixed
4. Follow the same code style and patterns as the original
5. Only fix the specific error - don't refactor unless necessary
6. If the error is a simple typo or missing import, just fix it
7. If the error indicates a logic problem, explain the issue
8. Always return complete, working code

${languageHint}`;

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...history,
      {
        role: 'user',
        content: prompt || 'Debug this code',
      },
      {
        role: 'user',
        content: `**Code:**\n\`\`\`\n${code}\n\`\`\`\n\n**Error:**\n${errorMessage}`,
      },
    ];

    // 4. Call AI API with streaming
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
        stream: true,
        temperature: 0.3, // Lower temperature for debugging (more precise)
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

    // 5. Stream the response
    const reader = aiResponse.body?.getReader();
    if (!reader) {
      return new Response(
        JSON.stringify({ error: 'No response body from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Send [DONE] sentinel
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              break;
            }

            // Decode chunk
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.substring(6); // Remove 'data: ' prefix

                // Check for [DONE] before parsing
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  // Extract delta content
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  if (content) {
                    // Send SSE format
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch (e) {
                  // Skip invalid JSON
                  console.error('Failed to parse SSE data:', data);
                }
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    // 6. Return SSE stream
    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Debug function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
