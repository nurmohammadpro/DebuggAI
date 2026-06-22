/**
 * POST /api/compile
 *
 * Compiles generated code for in-browser preview.
 * Accepts project files and returns a compiled HTML document
 * that can be rendered in a sandboxed iframe.
 *
 * Uses dynamic import for esbuild to avoid Turbopack tracing native binaries.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as null | {
    files?: Record<string, string>;
    entryPoint?: string;
    routePath?: string;
  };
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const files: Record<string, string> | undefined = body.files;
  const entryPoint: string | undefined = body.entryPoint;

  if (!files || typeof files !== 'object') {
    return NextResponse.json({ error: 'files object is required' }, { status: 400 });
  }

  const startTime = performance.now();

  // Dynamic import to avoid Turbopack bundling esbuild native binaries
  const { bundlePreview, buildPreviewHtml, entryPointToRoutePattern, entryPointToPreviewPath } = await import('@/lib/preview/compile');

  const { js, css, errors } = await bundlePreview(files, entryPoint);

  if (errors.length > 0 && !js) {
    return NextResponse.json({
      error: 'Compilation failed',
      errors,
      durationMs: Math.round(performance.now() - startTime),
    }, { status: 422 });
  }

  const routePath = typeof body.routePath === 'string' && body.routePath.trim()
    ? body.routePath.trim()
    : entryPointToPreviewPath(entryPoint || 'app/page.tsx');
  const routePattern = entryPointToRoutePattern(entryPoint || 'app/page.tsx');
  const html = buildPreviewHtml(js, css, routePath, routePattern);

  return NextResponse.json({
    html,
    errors,
    hasComponent: !!js,
    durationMs: Math.round(performance.now() - startTime),
  });
}
