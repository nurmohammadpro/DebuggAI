/**
 * GET /preview/[id]/[...slug]
 *
 * Proxies all requests to the sandbox's Docker container.
 * This avoids CORS issues when embedding the preview iframe.
 * Handles all sub-paths: /_next/static/*, /api/*, pages, etc.
 *
 * For production VPS, replace this with Nginx:
 *   location /preview/ {
 *     rewrite ^/preview/([^/]+)(/.*)$ /$2 break;
 *     proxy_pass http://127.0.0.1:$PORT;
 *   }
 *   (PORT is determined dynamically based on the sandbox ID)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sandboxManager } from '@/lib/sandbox/sandbox';
import { getThrottleFlag } from '@/lib/server/throttle-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; slug?: string[] }> },
) {
  const sandboxEnabled = await getThrottleFlag('sandbox_enabled', true);
  if (!sandboxEnabled) {
    return new NextResponse('Sandbox not available', { status: 503 });
  }

  const { id, slug } = await params;
  const sandbox = await sandboxManager.get(id);

  if (!sandbox || sandbox.status !== 'running' || !sandbox.containerName) {
    return new NextResponse('Sandbox not available', { status: 404 });
  }

  // Keep sandbox alive while it's actively being viewed.
  sandboxManager.touch(id).catch(() => {});

  // Build the target path
  const subPath = slug?.length ? '/' + slug.join('/') : '/';
  const search = req.nextUrl.search;
  const targetUrl = `http://127.0.0.1:${sandbox.port}${subPath}${search}`;

  try {
    const response = await fetch(targetUrl);

    const contentType = response.headers.get('content-type') || '';

    // For HTML documents, rewrite asset paths to go through the proxy
    if (contentType.includes('text/html')) {
      let body = await response.text();

      // Rewrite asset references to go through our proxy
      const publicHost = `/preview/${id}`;
      body = body
        .replace(/\/_next\//g, `${publicHost}/_next/`)
        .replace(/\/__nextjs_original-stack-frame/g, `${publicHost}/__nextjs_original-stack-frame`)
        // Generic catch for common asset path patterns
        .replace(/(?<=(?:src|href|srcSet|action)\s*=\s*["'])\/(?=[^/])/g, `${publicHost}/`);

      return new NextResponse(body, {
        headers: {
          'Content-Type': contentType,
          'X-Robots-Tag': 'noindex',
          'X-Frame-Options': 'SAMEORIGIN',
        },
      });
    }

    // For non-HTML (JS, CSS, images, etc.), stream directly
    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (err) {
    return new NextResponse('Proxy error', { status: 502 });
  }
}
