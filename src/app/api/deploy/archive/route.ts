/**
 * Deploy Archive API
 *
 * Creates a project archive (zip) for deployment to Vercel/Netlify.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';
import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ARCHIVE_DIR = path.join(process.cwd(), '.deploy-archives');

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Prevent path traversal
    const sanitized = path.basename(filename);
    const zipPath = path.join(ARCHIVE_DIR, sanitized);

    try {
      await fs.access(zipPath);
    } catch {
      return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
    }

    const stat = await fs.stat(zipPath);
    const stream = createReadStream(zipPath);

    return new Response(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${sanitized}"`,
        'Content-Length': String(stat.size),
      },
    });
  } catch (error) {
    console.error('Deploy archive download error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const auth = await requireUser(request);
    if (auth.errorResponse) return auth.errorResponse;

    // Parse request
    const body = await request.json();
    const { projectId, deploymentId, files, config } = body as {
      projectId: string;
      deploymentId: string;
      files: Record<string, string>;
      config: {
        framework: string;
        buildCommand: string;
        outputDir: string;
        installCommand: string;
        env: Record<string, string>;
        region: string;
      };
    };

    if (!projectId || !deploymentId || !files) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify project ownership
    const adminClient = createSupabaseAdmin();
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.user_id !== auth.user!.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create archive directory
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });
    const archiveName = `${projectId}_${deploymentId.substring(0, 8)}_${Date.now()}`;
    const workDir = path.join(ARCHIVE_DIR, archiveName);

    // Write project files to disk
    await fs.mkdir(workDir, { recursive: true });
    for (const [filePath, content] of Object.entries(files)) {
      const sanitized = path.normalize(filePath).replace(/^(\..(\/|\\|$))+/, '');
      const fullPath = path.join(workDir, sanitized);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }

    // Write .env file (local build only; for platform it stays in config)
    if (config.env && Object.keys(config.env).length > 0) {
      const envContent = Object.entries(config.env)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
      await fs.writeFile(path.join(workDir, '.env.local'), envContent, 'utf-8');
    }

    // Write vercel.json or netlify.toml for framework detection
    if (config.buildCommand || config.installCommand) {
      const vercelConfig = {
        framework: null,
        buildCommand: config.buildCommand || undefined,
        outputDirectory: config.outputDir || undefined,
        installCommand: config.installCommand || undefined,
      };
      await fs.writeFile(
        path.join(workDir, 'vercel.json'),
        JSON.stringify(vercelConfig, null, 2),
        'utf-8'
      );
    }

    // Create archive
    const zipPath = path.join(ARCHIVE_DIR, `${archiveName}.zip`);
    execSync(
      `cd "${ARCHIVE_DIR}" && zip -r "${zipPath}" "${archiveName}" -x "*/node_modules/*" "*/.next/*" "*/dist/*"`,
      { stdio: 'ignore', timeout: 30000 }
    );

    // Clean up working directory
    await fs.rm(workDir, { recursive: true, force: true });

    // Read archive for response
    const stat = await fs.stat(zipPath);

    return NextResponse.json({
      success: true,
      path: zipPath,
      filename: `${archiveName}.zip`,
      size: stat.size,
    });
  } catch (error) {
    console.error('Deploy archive error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create archive' },
      { status: 500 }
    );
  }
}
