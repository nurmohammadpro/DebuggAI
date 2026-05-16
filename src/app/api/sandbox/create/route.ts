/**
 * POST /api/sandbox/create
 *
 * Creates a new sandbox: writes project files to disk and starts a Docker container.
 * Enforces credit charging and plan feature access for web builder.
 * Body: { files: Record<string, string> }
 * Returns: { id, port, status, previewUrl }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';
import { sandboxManager } from '@/lib/sandbox/sandbox';
import { requireFeature, getUserPlan, getActionCost } from '@/lib/server/plan-enforcement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { user, errorResponse, supabase } = await requireUser(req);
  if (!user) return errorResponse;

  try {
    // Enforce web_builder feature access based on plan
    const { allowed } = await requireFeature(user.id, 'web_builder');
    if (!allowed) {
      return NextResponse.json(
        { error: 'Web Builder requires a Pro plan or higher' },
        { status: 402 },
      );
    }

    const body = await req.json();
    const { files, idempotencyKey } = body as { files?: Record<string, string>; idempotencyKey?: string };

    if (!files || Object.keys(files).length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 },
      );
    }

    // Determine cost based on file count
    const fileCount = Object.keys(files).length;
    const cost = fileCount > 20 ? getActionCost('web_builder_large')
      : fileCount > 10 ? getActionCost('web_builder_medium')
      : getActionCost('web_builder_small');

    // Charge credits atomically
    const adminClient = createSupabaseAdmin();
    const { error: spendError } = await adminClient.rpc('spend_credits', {
      p_user_id: user.id,
      p_amount: cost,
      p_source: 'sandbox_create',
      p_description: `Sandbox create (${fileCount} files)`,
      p_idempotency_key: idempotencyKey || null,
      p_metadata: { file_count: fileCount },
    });

    if (spendError) {
      const msg = spendError.message || 'Failed to spend credits';
      const status = msg.toLowerCase().includes('insufficient') ? 402 : 500;
      return NextResponse.json({ error: msg }, { status });
    }

    const sandbox = await sandboxManager.create(user.id, files);

    return NextResponse.json({
      id: sandbox.id,
      port: sandbox.port,
      status: sandbox.status,
      previewUrl: `/preview/${sandbox.id}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create sandbox' },
      { status: 500 },
    );
  }
}
