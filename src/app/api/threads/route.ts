/**
 * Threads API
 *
 * Threads are the durable chat containers (Codex/v0-style) that hold messages and runs.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  const workspaceId = url.searchParams.get('workspaceId');

  let q = auth.supabase
    .from('threads')
    .select('id, title, project_id, workspace_id, created_at, updated_at, metadata')
    .order('updated_at', { ascending: false })
    .eq('user_id', auth.user!.id);

  if (projectId) q = q.eq('project_id', projectId);
  if (workspaceId) q = q.eq('workspace_id', workspaceId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ threads: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null) as null | {
    title?: string;
    projectId?: string | null;
    workspaceId?: string | null;
    metadata?: Record<string, unknown>;
  };

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const title = (body.title || '').trim();

  const { data, error } = await auth.supabase
    .from('threads')
    .insert({
      user_id: auth.user!.id,
      title: title || null,
      project_id: body.projectId || null,
      workspace_id: body.workspaceId || null,
      metadata: body.metadata || {},
    })
    .select('id, title, project_id, workspace_id, created_at, updated_at, metadata')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ thread: data }, { status: 201 });
}

