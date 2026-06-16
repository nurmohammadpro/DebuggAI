'use client';

import { useCallback, useState } from 'react';
import { useGenerationStore } from '@/store/generation-store';

export function useProjectDownload() {
  const [downloading, setDownloading] = useState(false);
  const currentProjectId = useGenerationStore((s) => s.currentProjectId);

  const downloadProject = useCallback(
    async (projectName?: string) => {
      if (!currentProjectId) return;
      setDownloading(true);

      try {
        const res = await fetch(`/api/projects/${currentProjectId}/download`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Download failed' }));
          throw new Error(err.error || 'Download failed');
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = projectName
          ? `${projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`
          : `project-${currentProjectId}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        // errors surface via the downloading state
      } finally {
        setDownloading(false);
      }
    },
    [currentProjectId],
  );

  return { downloadProject, downloading, currentProjectId };
}
