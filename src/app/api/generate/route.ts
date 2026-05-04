/**
 * Generate API Route
 *
 * Calls AI API directly with SSE streaming.
 * Client expects: data: {"content":"..."}\n\n chunks + data: [DONE]\n\n sentinel
 */

import { requireUser } from '@/lib/server/auth';
import type { NextRequest } from 'next/server';

const SYSTEM_PROMPT = `You are DeBuggAI, an expert code generator. Generate clean, production-ready code based on user requirements.

Rules:
1. Always respond with a code block in the appropriate language
2. Include helpful comments in the code
3. Follow best practices for the requested framework/language
4. If the request is for React/Next.js, provide complete, working components
5. Keep explanations concise and focus on the code
6. Use markdown format with \`\`\`language code fences`;

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireUser(req);
  if (!user) return errorResponse;

  try {
    const body = await req.json();
    const { prompt, history = [] } = body as { prompt?: string; history?: Array<{ role: string; content: string }> };

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
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

    const aiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: prompt },
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
        temperature: 0.7,
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
    console.error('Generate API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
