/**
 * POST /api/sandbox/[id]/stop
 *
 * Stops the Docker container and marks the sandbox as stopped.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { sandboxManager } from '@/lib/sandbox/sandbox';
import { withRateLimit } from '@/lib/server/plan-enforcement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, errorResponse } = await requireUser(req);
  if (!user) return errorResponse;

  const { id } = await params;

  try {
    const rateLimit = await withRateLimit(user.id, 'web_builder', { req });
    if (!rateLimit.allowed) {
      return NextResponse.json(rateLimit.body, {
        status: rateLimit.status,
        headers: { 'Retry-After': '60' },
      });
    }

    await sandboxManager.stop(id);
    return NextResponse.json({ status: 'stopped' });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to stop sandbox' },
      { status: 500 },
    );
  }
}
