/**
 * GET /api/sandbox/[id]/logs  (SSE)
 *
 * Streams Docker container logs in real-time via Server-Sent Events.
 * Also returns periodic status pings so the client knows when install/dev are done.
 */

import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { sandboxManager } from '@/lib/sandbox/sandbox';
import { spawn } from 'child_process';
import { withRateLimit } from '@/lib/server/plan-enforcement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, errorResponse } = await requireUser(req);
  if (!user) return errorResponse;

  const rateLimit = await withRateLimit(user.id, 'web_builder');
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify(rateLimit.body), {
      status: rateLimit.status,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const { id } = await params;
  const sandbox = await sandboxManager.get(id);
  if (!sandbox) {
    return new Response('Sandbox not found', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {}
      };

      // Follow docker logs
      const docker = spawn('docker', [
        'logs', '-f', sandbox.containerName,
      ]);

      docker.stdout.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          send('log', { text: line });

          // Detect markers from the startup script
          if (line.includes('---SANDBOX_INSTALL_START---')) {
            send('status', { status: 'installing' });
          } else if (line.includes('---SANDBOX_INSTALL_DONE---')) {
            send('status', { status: 'install_done' });
          } else if (line.includes('---SANDBOX_DETECTED:')) {
            const framework = line.split(':')[1]?.replace('---', '') || 'unknown';
            send('status', { status: 'starting', framework });
          }
        }
      });

      docker.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        if (text.trim()) {
          send('log', { text });
        }
      });

      docker.on('close', (code) => {
        if (!closed) {
          send('status', { status: 'exited', code });
          send('close', {});
          try { controller.close(); } catch {}
          closed = true;
        }
      });

      // Periodic status check + health probe for running detection
      const interval = setInterval(async () => {
        try {
          const s = await sandboxManager.get(id);
          if (!s) return;

          // Health check: try to reach the dev server
          if (s.status === 'installing') {
            try {
              const probe = await fetch(`http://127.0.0.1:${s.port}`);
              if (probe.ok || probe.status < 500) {
                s.status = 'running';
                sandboxManager.updateStatus(id, 'running');
                send('status', { status: 'running' });
              }
            } catch {}
          }

          send('ping', { status: s.status, port: s.port });
        } catch {}
      }, 2000);

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        docker.kill();
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
