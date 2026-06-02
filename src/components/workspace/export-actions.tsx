/**
 * GitHub + Export actions for the workspace toolbar.
 * Minimal: connect GitHub, select repo, push code. Or download as ZIP.
 */

'use client';

import { useState, useCallback } from 'react';
import { GitBranch, Download, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useGenerationStore } from '@/store/generation-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import { getSession } from '@/hooks/use-session';
import { serializeVirtualFiles } from '@/lib/project/virtual-files';
import { cn } from '@/lib/utils';

/** Simple GitHub logo SVG icon (not in this lucide version) */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

export function ExportActions() {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pushing, setPushing] = useState<'idle' | 'loading' | 'done'>('idle');
  const [repos, setRepos] = useState<Array<{ id: number; full_name: string }>>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const { selectedProjectId } = useWorkspaceStore();

  const handleDownloadZip = useCallback(async () => {
    setExporting(true);
    try {
      const { session } = await getSession();
      const token = session?.access_token;
      if (!token) { toast.error('Please sign in'); return; }

      const { files, currentProjectId } = useGenerationStore.getState();
      if (!currentProjectId || !files || Object.keys(files.files).length === 0) {
        toast.error('No code to export'); return;
      }

      const flatFiles: Record<string, string> = {};
      for (const [p, f] of Object.entries(files.files)) {
        if (f.status !== 'deleted') flatFiles[p] = f.content;
      }

      const res = await fetch('/api/deploy/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ files: flatFiles, projectId: currentProjectId, format: 'zip' }),
      });
      if (!res.ok) throw new Error('Export failed');

      const { filename } = await res.json();
      const dlRes = await fetch(`/api/deploy/archive?filename=${encodeURIComponent(filename)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!dlRes.ok) throw new Error('Download failed');
      const blob = await dlRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Project downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }, []);

  const handlePushToGithub = useCallback(async () => {
    if (!selectedProjectId) { toast.error('No project selected'); return; }
    setPushing('loading');
    try {
      const { session } = await getSession();
      const token = session?.access_token;
      if (!token) { toast.error('Please sign in'); return; }

      const state = useGenerationStore.getState();
      // Build flat files from the virtual files
      const flatFiles: Record<string, string> = {};
      if (state.files) {
        for (const [p, f] of Object.entries(state.files.files)) {
          if (f.status !== 'deleted') flatFiles[p] = f.content;
        }
      }
      if (Object.keys(flatFiles).length === 0) {
        toast.error('No code to push');
        setPushing('idle');
        return;
      }

      const res = await fetch(`/api/projects/${selectedProjectId}/git/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          files: flatFiles,
          repoFullName: selectedRepo,
          commitMessage: 'Update from DeBuggAI',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Push failed');
      }
      setPushing('done');
      toast.success('Pushed to GitHub');
      setTimeout(() => { setPushing('idle'); setOpen(false); }, 2000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Push failed');
      setPushing('idle');
    }
  }, [selectedProjectId, selectedRepo]);

  const loadRepos = useCallback(async () => {
    if (repos.length > 0) return;
    setLoadingRepos(true);
    try {
      const { session } = await getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/github/repos?projectId=${selectedProjectId}&perPage=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load repos');
      const j = await res.json();
      setRepos(j.repositories || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load repos');
    } finally {
      setLoadingRepos(false);
    }
  }, [selectedProjectId, repos.length]);

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleDownloadZip}
          disabled={exporting}
          className="h-7 px-2 rounded-[6px] flex items-center gap-1.5 text-[11px] font-medium border border-[var(--app-border)] bg-transparent text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors disabled:opacity-40"
          title="Download ZIP"
        >
          {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          <span className="hidden sm:inline">Export</span>
        </button>

        <button
          onClick={() => { setOpen(!open); if (!open) loadRepos(); }}
          className="h-7 px-2 rounded-[6px] flex items-center gap-1.5 text-[11px] font-medium border border-[var(--app-border)] bg-transparent text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
          title="Push to GitHub"
        >
          {pushing === 'done' ? <Check className="h-3 w-3 text-green-400" /> : <GitBranch className="h-3 w-3" />}
          <span className="hidden sm:inline">{pushing === 'done' ? 'Pushed' : 'GitHub'}</span>
        </button>
      </div>

      {/* Repo selector dropdown */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div
            className="absolute top-12 right-4 w-72 bg-[var(--app-panel)] border border-[var(--app-border)] rounded-[10px] shadow-2xl overflow-hidden z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 h-10 border-b border-[var(--app-border)]">
              <span className="text-[11px] font-semibold text-[var(--app-text)] uppercase tracking-[0.1em]">Push to GitHub</span>
              <button onClick={() => setOpen(false)} className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]">
                <X className="h-3 w-3" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto p-1.5">
              {loadingRepos ? (
                <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-[var(--app-text-dim)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading repos...
                </div>
              ) : repos.length === 0 ? (
                <div className="py-6 text-center text-[12px] text-[var(--app-text-dim)]">
                  <GitHubIcon className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  <p>No repos found</p>
                  <p className="text-[10px] mt-1">Connect GitHub in Settings</p>
                </div>
              ) : (
                repos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => setSelectedRepo(repo.full_name)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-2 rounded-[6px] text-left text-[12px] transition-colors',
                      selectedRepo === repo.full_name
                        ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
                        : 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]'
                    )}
                  >
                    <GitHubIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">{repo.full_name}</span>
                    {selectedRepo === repo.full_name && <Check className="h-3 w-3 shrink-0" />}
                  </button>
                ))
              )}
            </div>

            {selectedRepo && (
              <div className="border-t border-[var(--app-border)] p-2.5">
                <button
                  onClick={handlePushToGithub}
                  disabled={pushing === 'loading'}
                  className="w-full h-8 rounded-[6px] bg-[var(--app-accent)] text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {pushing === 'loading' ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Pushing...</>
                  ) : pushing === 'done' ? (
                    <><Check className="h-3 w-3" /> Pushed</>
                  ) : (
                    <><GitHubIcon className="h-3 w-3" /> Push to {selectedRepo.split('/')[1]}</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
