/**
 * Debug API Route
 *
 * Calls AI API directly with SSE streaming for code debugging.
 * Client expects: data: {"content":"..."}\n\n chunks + data: [DONE]\n\n sentinel
 */

import { requireUser } from '@/lib/server/auth';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireUser(req);
  if (!user) return errorResponse;

  try {
    const body = await req.json();
    const { code, errorMessage, prompt, history = [], language } = body as {
      code?: string;
      errorMessage?: string;
      prompt?: string;
      history?: Array<{ role: string; content: string }>;
      language?: string;
    };

    if (!code) {
      return new Response(JSON.stringify({ error: 'Code is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!errorMessage) {
      return new Response(JSON.stringify({ error: 'Error message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1';
    const model = process.env.AI_MODEL || 'llama-3.3-70b-versatile';

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
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return new Response(JSON.stringify({ error: `AI API error: ${text}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reader = aiResponse.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: 'No response body from AI' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.substring(6);
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch { /* skip invalid JSON */ }
              }
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
