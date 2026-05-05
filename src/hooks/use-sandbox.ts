/**
 * useSandbox Hook
 *
 * Manages sandbox lifecycle: create, stream logs, stop, export.
 * Connects to the SSE logs endpoint for real-time build output.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

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

  const eventSourceRef = useRef<EventSource | null>(null);
  const logsRef = useRef<string[]>([]);

  const update = useCallback((partial: Partial<SandboxState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const appendLog = useCallback((text: string) => {
    logsRef.current = [...logsRef.current, text];
    setState((prev) => ({ ...prev, logs: [...prev.logs, text] }));
  }, []);

  const connectLogs = useCallback(
    (id: string) => {
      // Close any existing connection
      eventSourceRef.current?.close();

      const es = new EventSource(`/api/sandbox/${id}/logs`);
      eventSourceRef.current = es;

      es.addEventListener('log', (e: MessageEvent) => {
        try {
          const { text } = JSON.parse(e.data);
          appendLog(text);
        } catch {}
      });

      es.addEventListener('status', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);

          if (data.status === 'installing') {
            update({ status: 'installing' });
            options.onStatusChange?.('installing');
          } else if (data.status === 'install_done') {
            update({ status: 'installing' });
          } else if (data.status === 'starting') {
            update({ status: 'installing', framework: data.framework || null });
          } else if (data.status === 'running') {
            update({ status: 'running', previewUrl: `/preview/${id}` });
            options.onStatusChange?.('running');
          } else if (data.status === 'exited') {
            update({ status: 'error', error: `Process exited with code ${data.code}` });
            options.onStatusChange?.('error');
          }
        } catch {}
      });

      es.addEventListener('ping', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.status === 'running') {
            update({ status: 'running', previewUrl: `/preview/${id}` });
            options.onStatusChange?.('running');
          }
        } catch {}
      });

      es.addEventListener('close', () => {
        es.close();
        eventSourceRef.current = null;
      });

      es.onerror = () => {
        // EventSource auto-reconnects
      };
    },
    [appendLog, update, options],
  );

  const createSandbox = useCallback(
    async (files: Record<string, string>) => {
      update({ status: 'creating', error: null, logs: [] });
      logsRef.current = [];
      options.onStatusChange?.('creating');

      try {
        const res = await fetch('/api/sandbox/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create sandbox');
        }

        const data = await res.json();
        update({ id: data.id, status: 'installing', port: data.port });
        options.onStatusChange?.('installing');

        // Start listening to logs
        connectLogs(data.id);

        return data.id;
      } catch (err: any) {
        update({ status: 'error', error: err.message });
        options.onStatusChange?.('error');
        return null;
      }
    },
    [update, connectLogs, options],
  );

  const stopSandbox = useCallback(async () => {
    if (!state.id) return;
    try {
      await fetch(`/api/sandbox/${state.id}/stop`, { method: 'POST' });
    } catch {}
    eventSourceRef.current?.close();
    update({ status: 'stopped', previewUrl: null });
    options.onStatusChange?.('stopped');
  }, [state.id, update, options]);

  const exportZip = useCallback(async () => {
    if (!state.id) return;
    try {
      const res = await fetch(`/api/sandbox/${state.id}/export`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${state.id}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      update({ error: err.message });
    }
  }, [state.id, update]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
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
