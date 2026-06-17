/**
 * POST /api/preview/report
 *
 * Receives browser console and network error events from the preview iframe
 * and stores them in the server-side ring buffer so the agent's
 * read_dev_logs and read_network_requests tools can access real browser
 * runtime diagnostics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { pushConsole, pushNetwork } from '@/lib/preview/log-buffer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const projectId: string | undefined = body.projectId;
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const consoleEntries: Array<{
    type: 'log' | 'warn' | 'error' | 'info' | 'debug';
    args: string[];
    timestamp: number;
  }> | undefined = body.console;

  const networkEntries: Array<{
    url: string;
    method: string;
    status: number;
    statusText: string;
    error?: string;
    timestamp: number;
  }> | undefined = body.network;

  if (consoleEntries?.length) {
    pushConsole(projectId, consoleEntries);
  }

  if (networkEntries?.length) {
    pushNetwork(projectId, networkEntries);
  }

  return NextResponse.json({ ok: true });
}
