/**
 * useSandbox Hook
 *
 * Manages sandbox lifecycle: create, stream logs, stop, export.
 * Connects to the SSE logs endpoint for real-time build output.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { getSession } from '@/hooks/use-session';
import { csrfHeader } from '@/lib/csrf-client';

export interface SandboxState {
  id: string | null;
  status: 'idle' | 'creating' | 'installing' | 'running' | 'error' | 'stopped';
  previewUrl: string | null;
  logs: string[];
  error: string | null;
  framework: string | null;
  port: number | null;
}

interface UseSandboxOptions {
  onStatusChange?: (status: SandboxState['status']) => void;
}

export function useSandbox(options: UseSandboxOptions = {}) {
  const [state, setState] = useState<SandboxState>({
    id: null,
    status: 'idle',
    previewUrl: null,
    logs: [],
    error: null,
    framework: null,
    port: null,
  });

  // In React Strict Mode, effects can run twice in dev.
  // Guard against concurrent create requests from the same component instance.
  const createInFlightRef = useRef(false);
  const logsRef = useRef<string[]>([]);
  const logsAbortRef = useRef<AbortController | null>(null);

  const update = useCallback((partial: Partial<SandboxState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const appendLog = useCallback((text: string) => {
    logsRef.current = [...logsRef.current, text];
    setState((prev) => ({ ...prev, logs: [...prev.logs, text] }));
  }, []);

  const connectLogs = useCallback(
    async (id: string) => {
      // Abort any existing stream
      logsAbortRef.current?.abort();

      const { session } = await getSession();
      const token = session?.access_token;
      if (!token) {
        update({ status: 'error', error: 'Not authenticated' });
        options.onStatusChange?.('error');
        return;
      }

      const controller = new AbortController();
      logsAbortRef.current = controller;

      try {
        const res = await fetch(`/api/sandbox/${id}/logs`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Failed to stream logs (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        let buffer = '';
        let eventName = 'message';
        let dataLines: string[] = [];

        const flushEvent = () => {
          if (!dataLines.length) return;
          const dataRaw = dataLines.join('\n');
          dataLines = [];

          try {
            const parsed = JSON.parse(dataRaw);

            if (eventName === 'log') {
              const text = typeof parsed?.text === 'string' ? parsed.text : '';
              if (text) appendLog(text);
              return;
            }

            if (eventName === 'status') {
              const status = parsed?.status as string | undefined;
              if (status === 'installing') {
                update({ status: 'installing' });
                options.onStatusChange?.('installing');
              } else if (status === 'install_done') {
                update({ status: 'installing' });
              } else if (status === 'starting') {
                update({ status: 'installing', framework: parsed?.framework || null });
              } else if (status === 'running') {
                update({ status: 'running', previewUrl: `/preview/${id}` });
                options.onStatusChange?.('running');
              } else if (status === 'exited') {
                update({
                  status: 'error',
                  error: `Process exited with code ${parsed?.code ?? 'unknown'}`,
                });
                options.onStatusChange?.('error');
              }
              return;
            }

            if (eventName === 'ping') {
              if (parsed?.status === 'running') {
                update({ status: 'running', previewUrl: `/preview/${id}` });
                options.onStatusChange?.('running');
              }
              if (typeof parsed?.port === 'number') update({ port: parsed.port });
              return;
            }

            if (eventName === 'close') {
              controller.abort();
              return;
            }
          } catch {
            // ignore bad JSON
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const rawLine of lines) {
            const line = rawLine.replace(/\r$/, '');
            if (!line) {
              flushEvent();
              eventName = 'message';
              continue;
            }
            if (line.startsWith('event:')) {
              eventName = line.slice('event:'.length).trim() || 'message';
              continue;
            }
            if (line.startsWith('data:')) {
              dataLines.push(line.slice('data:'.length).trimStart());
              continue;
            }
          }
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Failed to stream logs';
        update({ status: 'error', error: message });
        options.onStatusChange?.('error');
      }
    },
    [appendLog, update, options],
  );

  const createSandbox = useCallback(
    async (files: Record<string, string>) => {
      if (createInFlightRef.current) return null;
      createInFlightRef.current = true;
      update({ status: 'creating', error: null, logs: [] });
      logsRef.current = [];
      options.onStatusChange?.('creating');

      try {
        const { session } = await getSession();
        const token = session?.access_token;
        if (!token) throw new Error('Not authenticated');

        const res = await fetch('/api/sandbox/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...csrfHeader(),
          },
          body: JSON.stringify({ files }),
        });

        if (!res.ok) {
          // In production, upstreams (edge/CDN) sometimes return non-JSON error bodies.
          // Prefer parsing JSON, but fall back to plain text so callers can still
          // detect known messages like "Docker is required" / "Live preview is temporarily disabled".
          let message = 'Failed to create sandbox';
          try {
            const err = await res.json();
            if (err && typeof err.error === 'string' && err.error.trim()) message = err.error.trim();
          } catch {
            const text = await res.text().catch(() => '');
            if (text.trim()) message = text.trim();
          }
          throw new Error(message);
        }

        const data = await res.json();
        update({ id: data.id, status: 'installing', port: data.port });
        options.onStatusChange?.('installing');

        // Start listening to logs
        connectLogs(data.id);

        return data.id;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create sandbox';
        // Graceful fallback: if Docker isn't available, don't show error —
        // the preview pane will fall through to Sandpack in-browser preview.
        if (message.includes('Docker') || message.includes('docker')) {
          update({ status: 'error', error: null, previewUrl: null });
        } else {
          update({ status: 'error', error: message });
        }
        options.onStatusChange?.('error');
        return null;
      } finally {
        createInFlightRef.current = false;
      }
    },
    [update, connectLogs, options],
  );

  const stopSandbox = useCallback(async () => {
    if (!state.id) return;
    try {
      const { session } = await getSession();
      const token = session?.access_token;
      await fetch(`/api/sandbox/${state.id}/stop`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}`, ...csrfHeader() } : { ...csrfHeader() },
      });
    } catch {}
    logsAbortRef.current?.abort();
    update({ status: 'stopped', previewUrl: null });
    options.onStatusChange?.('stopped');
  }, [state.id, update, options]);

  const exportZip = useCallback(async () => {
    if (!state.id) return;
    try {
      const { session } = await getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/sandbox/${state.id}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${state.id}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed';
      update({ error: message });
    }
  }, [state.id, update]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      logsAbortRef.current?.abort();
    };
  }, []);

  const clearError = useCallback(() => {
    update({ error: null });
  }, [update]);

  return {
    ...state,
    createSandbox,
    stopSandbox,
    exportZip,
    clearError,
  };
}
