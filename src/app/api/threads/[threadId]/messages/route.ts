/**
 * Thread Messages API
 *
 * Provides thread-scoped chat history (not global per-user).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

const MAX_MESSAGE_CHARS = 60_000;

export async function GET(req: NextRequest, ctx: { params: Promise<{ threadId: string }> }) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { threadId } = await ctx.params;
  if (!threadId) return NextResponse.json({ error: 'threadId is required' }, { status: 400 });

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 50)));

  const { data, error } = await auth.supabase
    .from('thread_messages')
    .select('id, thread_id, role, content, model, tokens_in, tokens_out, metadata, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data || [] });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ threadId: string }> }) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { threadId } = await ctx.params;
  if (!threadId) return NextResponse.json({ error: 'threadId is required' }, { status: 400 });

  const body = await req.json().catch(() => null) as null | {
    role?: 'user' | 'assistant' | 'system' | 'tool';
    content?: string;
    model?: string;
    tokensIn?: number;
    tokensOut?: number;
    metadata?: Record<string, unknown>;
    projectId?: string | null;
  };

  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  if (!body.role || !['user', 'assistant', 'system', 'tool'].includes(body.role)) {
    return NextResponse.json({ error: 'role must be user|assistant|system|tool' }, { status: 400 });
  }

  const content = (body.content || '').trim();
  if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 });
  if (content.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: `content too large (max ${MAX_MESSAGE_CHARS} chars)` }, { status: 413 });
  }

  const { data: thread } = await auth.supabase
    .from('threads')
    .select('id, project_id')
    .eq('id', threadId)
    .eq('user_id', auth.user!.id)
    .maybeSingle();

  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });

  const projectId =
    typeof body.projectId === 'string'
      ? body.projectId
      : thread.project_id || null;

  const metadata = {
    ...(body.metadata || {}),
    ...(projectId ? { project_id: projectId } : {}),
  };

  const insertPayload = {
    thread_id: threadId,
    project_id: projectId,
    user_id: auth.user!.id,
    role: body.role,
    content,
    model: body.model || null,
    tokens_in: typeof body.tokensIn === 'number' ? body.tokensIn : null,
    tokens_out: typeof body.tokensOut === 'number' ? body.tokensOut : null,
    metadata,
  };

  const insertMessage = (payload: Record<string, unknown>) => auth.supabase
    .from('thread_messages')
    .insert(payload)
    .select('id, thread_id, role, content, model, tokens_in, tokens_out, metadata, created_at')
    .single();

  let { data, error } = await insertMessage(insertPayload);
  if (error && /project_id/i.test(error.message)) {
    const { project_id, ...fallbackPayload } = insertPayload;
    void project_id;
    const retry = await insertMessage(fallbackPayload);
    data = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data }, { status: 201 });
}
