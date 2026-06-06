/**
 * Save Generated Code API
 *
 * Auto-saves the latest generated code to the generations table
 * so the workspace can restore file tree and preview on project reopen.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await ctx.params;

  const body = await req.json().catch(() => null) as null | {
    code?: string;
    prompt?: string;
    description?: string;
    stack?: string;
    metadata?: Record<string, unknown>;
  };

  if (!body || typeof body.code !== 'string') {
    return NextResponse.json({ error: 'code field is required' }, { status: 400 });
  }

  // Get the current max version
  const { data: latest } = await auth.supabase
    .from('generations')
    .select('version')
    .eq('project_id', id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version || 0) + 1;

  const { error } = await auth.supabase
    .from('generations')
    .insert({
      user_id: auth.user!.id,
      project_id: id,
      code: body.code,
      version: nextVersion,
      description: body.description || null,
      prompt: body.prompt || null,
      stack: body.stack || null,
      metadata: body.metadata || {},
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, version: nextVersion });
}
