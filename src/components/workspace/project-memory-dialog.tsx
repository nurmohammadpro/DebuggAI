'use client';

import { useState, useEffect, useCallback } from 'react';
import { Brain, X, Save, RotateCcw, Loader2 } from 'lucide-react';
import { useGenerationStore } from '@/store/generation-store';
import { cn } from '@/lib/utils';

interface ProjectMemoryDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ProjectMemoryDialog({ open, onClose }: ProjectMemoryDialogProps) {
  const projectId = useGenerationStore((s) => s.currentProjectId);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const isDirty = content !== savedContent;

  useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/projects/${projectId}/memory`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setContent(d.content ?? '');
        setSavedContent(d.content ?? '');
        setUpdatedAt(d.updatedAt ?? null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, projectId]);

  const handleSave = useCallback(async () => {
    if (!projectId) return;
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/memory`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      setSavedContent(content);
      setUpdatedAt(new Date().toISOString());
    }
    setSaving(false);
  }, [projectId, content]);

  const handleReset = useCallback(() => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    setContent(savedContent);
  }, [isDirty, savedContent]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[80vh] flex flex-col bg-[var(--app-panel)] rounded-xl shadow-2xl border border-[var(--app-border)]">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--app-border)] shrink-0">
          <Brain className="h-5 w-5 text-[var(--ds-green)]" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-[var(--app-text)]">Project Memory</h2>
            <p className="text-[10px] text-[var(--app-text-dim)]">
              The agent reads this file to maintain context across turns. Use markdown.
            </p>
          </div>
          {updatedAt && !isDirty && (
            <span className="text-[9px] text-[var(--app-text-dim)] shrink-0">
              Saved {new Date(updatedAt).toLocaleString()}
            </span>
          )}
          {isDirty && (
            <span className="text-[9px] font-medium text-amber-400 shrink-0">Unsaved changes</span>
          )}
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--app-text-dim)]" />
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full min-h-[300px] resize-none rounded-lg bg-[var(--app-bg)] border border-[var(--app-border)] p-4 text-[13px] font-mono text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--ds-green)]/50 focus:ring-1 focus:ring-[var(--ds-green)]/20 transition-colors"
              placeholder="# Project Memory&#10;&#10;Add context the AI should remember across turns..."
              spellCheck={false}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-[var(--app-border)] shrink-0">
          <button
            onClick={handleReset}
            disabled={!isDirty}
            className="h-9 px-3 rounded-[7px] flex items-center gap-1.5 text-[11px] font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors disabled:opacity-30 disabled:cursor-default"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-[7px] text-[11px] font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className={cn(
              'h-9 px-4 rounded-[7px] flex items-center gap-1.5 text-[11px] font-semibold transition-colors',
              isDirty
                ? 'bg-[var(--ds-green)] text-white hover:bg-[var(--ds-green-bright)]'
                : 'bg-[var(--app-surface)] text-[var(--app-text-dim)] cursor-default',
            )}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
