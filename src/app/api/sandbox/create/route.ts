/**
 * POST /api/sandbox/create
 *
 * Creates a new sandbox: writes project files to disk and starts a Docker container.
 * Body: { files: Record<string, string> }
 * Returns: { id, port, status, previewUrl }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { sandboxManager } from '@/lib/sandbox/sandbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireUser(req);
  if (!user) return errorResponse;

  try {
    const body = await req.json();
    const { files } = body as { files?: Record<string, string> };

    if (!files || Object.keys(files).length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 },
      );
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
