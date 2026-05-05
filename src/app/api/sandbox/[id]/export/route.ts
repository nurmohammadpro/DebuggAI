/**
 * GET /api/sandbox/[id]/export
 *
 * Downloads the project as a zip file (excludes node_modules and .next).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { sandboxManager } from '@/lib/sandbox/sandbox';
import { promises as fs } from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, errorResponse } = await requireUser(req);
  if (!user) return errorResponse;

  const { id } = await params;

  try {
    const zipPath = await sandboxManager.exportZip(id);
    const buffer = await fs.readFile(zipPath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="project-${id}.zip"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to export project' },
      { status: 500 },
    );
  }
}
