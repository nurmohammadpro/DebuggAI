/**
 * GET /api/projects/[id]/download
 *
 * Downloads the project as a zip file containing all files from project_files.
 * Excludes node_modules and .next patterns.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { withRateLimit } from '@/lib/server/plan-enforcement';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOWNLOAD_DIR = path.join(os.tmpdir(), 'debuggai-downloads');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, errorResponse } = await requireUser(req);
  if (!user) return errorResponse;

  const { id: projectId } = await params;

  const rateLimit = await withRateLimit(user.id, 'web_builder', { req });
  if (!rateLimit.allowed) {
    return NextResponse.json(rateLimit.body, {
      status: rateLimit.status,
      headers: { 'Retry-After': '60' },
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Verify project ownership
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id, name')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  if (project.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all files from project_files
  const { data: files, error: filesError } = await supabase
    .from('project_files')
    .select('path, content')
    .eq('project_id', projectId)
    .order('path', { ascending: true });

  if (filesError) {
    return NextResponse.json({ error: 'Failed to fetch project files' }, { status: 500 });
  }
  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files in project' }, { status: 404 });
  }

  try {
    await fs.mkdir(DOWNLOAD_DIR, { recursive: true });

    const safeName = (project.name || projectId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const archiveName = `${safeName}_${Date.now()}`;
    const workDir = path.join(DOWNLOAD_DIR, archiveName);

    // Write all files to temp directory
    await fs.mkdir(workDir, { recursive: true });
    for (const file of files) {
      const resolved = path.resolve(workDir, file.path);
      const resolvedWork = path.resolve(workDir);
      if (!resolved.startsWith(resolvedWork + path.sep) && resolved !== resolvedWork) {
        continue; // path traversal guard
      }
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      await fs.writeFile(resolved, file.content, 'utf-8');
    }

    // Create zip archive
    const zipPath = path.join(DOWNLOAD_DIR, `${archiveName}.zip`);
    execSync(
      `cd "${DOWNLOAD_DIR}" && zip -r "${zipPath}" "${archiveName}" -x "*/node_modules/*" "*/node_modules/**" "*/.next/*" "*/.next/**" "*/dist/*" "*/dist/**"`,
      { stdio: 'ignore', timeout: 30_000 },
    );

    // Clean up working directory
    await fs.rm(workDir, { recursive: true, force: true });

    // Stream the zip back
    const stat = await fs.stat(zipPath);
    const buffer = await fs.readFile(zipPath);

    // Clean up zip after reading
    fs.unlink(zipPath).catch(() => {});

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${archiveName}.zip"`,
        'Content-Length': stat.size.toString(),
      },
    });
  } catch (err: unknown) {
    console.error('Project download error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Download failed' },
      { status: 500 },
    );
  }
}
