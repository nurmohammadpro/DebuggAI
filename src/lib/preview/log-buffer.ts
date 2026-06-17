/**
 * Server-side ring buffer for browser preview logs.
 *
 * Stores console output and network errors reported from the preview iframe
 * so the agent's read_dev_logs and read_network_requests tools can access
 * real browser runtime diagnostics — not just Docker sandbox build logs.
 */

interface ConsoleEntry {
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  args: string[];
  timestamp: number;
}

interface NetworkEntry {
  url: string;
  method: string;
  status: number;
  statusText: string;
  error?: string;
  timestamp: number;
}

interface ProjectLogBuffer {
  console: ConsoleEntry[];
  network: NetworkEntry[];
}

const MAX_CONSOLE = 200;
const MAX_NETWORK = 50;
const TTL_MS = 30 * 60 * 1000; // 30 minutes

const buffers = new Map<string, ProjectLogBuffer>();

function getBuffer(projectId: string): ProjectLogBuffer {
  let buf = buffers.get(projectId);
  if (!buf) {
    buf = { console: [], network: [] };
    buffers.set(projectId, buf);
  }
  return buf;
}

function prune(buf: ConsoleEntry[] | NetworkEntry[], max: number) {
  while (buf.length > max) buf.shift();
  const cutoff = Date.now() - TTL_MS;
  while (buf.length > 0 && (buf[0]?.timestamp ?? 0) < cutoff) buf.shift();
}

export function pushConsole(
  projectId: string,
  entries: { type: ConsoleEntry['type']; args: string[]; timestamp: number }[],
) {
  const buf = getBuffer(projectId);
  for (const e of entries) {
    buf.console.push({ type: e.type, args: e.args, timestamp: e.timestamp });
  }
  prune(buf.console, MAX_CONSOLE);
}

export function pushNetwork(
  projectId: string,
  entries: { url: string; method: string; status: number; statusText: string; error?: string; timestamp: number }[],
) {
  const buf = getBuffer(projectId);
  for (const e of entries) {
    buf.network.push({
      url: e.url,
      method: e.method,
      status: e.status,
      statusText: e.statusText,
      error: e.error,
      timestamp: e.timestamp,
    });
  }
  prune(buf.network, MAX_NETWORK);
}

export function getConsoleLogs(
  projectId: string,
  filter?: string,
  lines?: number,
): string {
  const buf = buffers.get(projectId);
  if (!buf || buf.console.length === 0) return '';

  let entries = buf.console;
  if (filter) {
    const f = filter.toLowerCase();
    entries = entries.filter(
      (e) => e.args.some((a) => a.toLowerCase().includes(f)),
    );
  }

  const recent = entries.slice(-(lines ?? 50));
  if (recent.length === 0) return '';

  return recent
    .map((e) => {
      const prefix = `[browser.${e.type}]`;
      const body = e.args.join(' ');
      const time = new Date(e.timestamp).toISOString().slice(11, 23);
      return `${time} ${prefix} ${body}`;
    })
    .join('\n');
}

export function getNetworkLogs(
  projectId: string,
  filter?: string,
  statusCode?: number,
): string {
  const buf = buffers.get(projectId);
  if (!buf || buf.network.length === 0) return '';

  let entries = buf.network;
  if (filter) {
    const f = filter.toLowerCase();
    entries = entries.filter((e) => e.url.toLowerCase().includes(f));
  }
  if (statusCode) {
    entries = entries.filter((e) => e.status === statusCode);
  }

  const recent = entries.slice(-20);
  if (recent.length === 0) return '';

  return recent
    .map((e) => {
      const time = new Date(e.timestamp).toISOString().slice(11, 23);
      const status = e.error ? `ERROR: ${e.error}` : `${e.status} ${e.statusText}`;
      return `${time} ${e.method} ${e.url} → ${status}`;
    })
    .join('\n');
}

export function clearProjectLogs(projectId: string) {
  buffers.delete(projectId);
}
