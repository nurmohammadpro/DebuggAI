/**
 * useSandboxPreview Hook
 *
 * Bridges the Docker sandbox lifecycle (useSandbox) with the generation store.
 * Auto-creates a sandbox when project files are ready, exposes the preview URL,
 * and syncs sandbox state for the UI.
 */
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSandbox, type SandboxState } from '@/hooks/use-sandbox';
import { useGenerationStore } from '@/store/generation-store';

export interface SandboxPreviewState {
  sandboxId: string | null;
  previewUrl: string | null;
  status: SandboxState['status'];
  logs: string[];
  error: string | null;
  buildErrors: string[];
  isReady: boolean;
}

export function useSandboxPreview() {
  const { currentProjectId, files } = useGenerationStore();
  const sandbox = useSandbox();
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const createdForProjectRef = useRef<string | null>(null);
  const filesHashRef = useRef<string>('');

  // Derive a stable hash of current files to detect meaningful changes
  const computeFilesHash = useCallback(() => {
    if (!files) return '';
    const paths = Object.keys(files.files).sort();
    return paths.map(p => `${p}:${files.files[p]?.content?.length ?? 0}`).join('|');
  }, [files]);

  // Auto-create sandbox when project files are ready
  useEffect(() => {
    if (!currentProjectId) return;
    if (!files || Object.keys(files.files).length === 0) return;

    const hasSubstantiveFiles = Object.values(files.files).some(
      (f) => f.status !== 'deleted' && (f.content?.trim().length ?? 0) > 20,
    );
    if (!hasSubstantiveFiles) return;

    const newHash = computeFilesHash();
    if (createdForProjectRef.current === currentProjectId && filesHashRef.current === newHash) return;
    if (sandbox.status === 'running' && sandboxId) return;
    if (sandbox.status === 'installing' || sandbox.status === 'creating') return;

    // Build flat file record
    const flatFiles: Record<string, string> = {};
    for (const [path, file] of Object.entries(files.files)) {
      if (file.status === 'deleted') continue;
      flatFiles[path] = file.content;
    }

    createdForProjectRef.current = currentProjectId;
    filesHashRef.current = newHash;

    sandbox.createSandbox(flatFiles).then((id) => {
      if (id) setSandboxId(id);
    });
  }, [currentProjectId, files, computeFilesHash, sandbox, sandboxId]);

  // Reset when project changes
  useEffect(() => {
    if (currentProjectId !== createdForProjectRef.current) {
      createdForProjectRef.current = null;
      filesHashRef.current = '';
      setSandboxId(null);
    }
  }, [currentProjectId]);

  return {
    sandboxId,
    previewUrl: sandbox.previewUrl,
    status: sandbox.status,
    logs: sandbox.logs,
    error: sandbox.error,
    buildErrors: sandbox.buildErrors,
    isReady: sandbox.status === 'running' && !!sandbox.previewUrl,
    stopSandbox: sandbox.stopSandbox,
  } satisfies SandboxPreviewState & { stopSandbox: () => Promise<void> };
}
