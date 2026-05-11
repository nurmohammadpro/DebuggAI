'use client';

import { useRef, useState, useEffect } from 'react';
import { Paperclip } from 'lucide-react';
import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { toast } from 'sonner';

const ALLOWED_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rb', '.java', '.json', '.txt', '.md', '.css', '.html'];
const MAX_FILE_SIZE = 500 * 1024; // 500KB

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function DashboardComposerCard({
  prompt,
  onPromptChange,
  onSubmit,
  submitting,
  onBuyCredits,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  onBuyCredits: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const { data: projects = [] } = useMyProjects(25, true);

  useEffect(() => {
    try {
      if (window.localStorage.getItem('debuggai.composer.banner-dismissed') === '1') {
        setDismissed(true);
      }
    } catch { /* ignore */ }
  }, []);

  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`File type ${ext || 'unknown'} not supported`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large (max 500KB)');
      return;
    }

    try {
      const text = await readFileAsText(file);
      const header = `\n// --- ${file.name} ---\n`;
      onPromptChange(prompt + header + text + '\n// --- end ---\n');
      toast.success(`Attached ${file.name}`);
    } catch {
      toast.error('Failed to read file');
    }

    e.target.value = '';
  };

  const handleDismiss = () => {
    try {
      window.localStorage.setItem('debuggai.composer.banner-dismissed', '1');
    } catch { /* ignore */ }
    setDismissed(true);
  };

  const canSubmit = prompt.trim().length > 0 && !submitting;

  return (
    <div className="w-full">
      <div className="p-4 border border-[var(--border-default)] rounded-[var(--radius-lg)] bg-[var(--bg-primary)]">
        {/* Textarea */}
        <textarea
          data-dashboard-composer
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Describe what you want to build..."
          className="w-full min-h-[100px] resize-none bg-transparent outline-none text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] font-normal leading-relaxed"
          disabled={submitting}
        />

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-default)]">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ALLOWED_EXTENSIONS.join(',')}
            onChange={handleFileChange}
          />
          <button
            className="h-7 w-7 rounded-[var(--radius-md)] inline-flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            type="button"
            title="Attach file"
            aria-label="Attach file"
            onClick={handleAttach}
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center gap-2">
            {!dismissed && (
              <div className="text-[12px] text-[var(--text-tertiary)] flex items-center gap-2">
                <span>Need more credits?</span>
                <button
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline text-[12px]"
                  type="button"
                  onClick={onBuyCredits}
                >
                  Buy credits
                </button>
              </div>
            )}

            <button
              className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 text-[12px] font-medium"
              type="button"
              disabled={!canSubmit}
              onClick={onSubmit}
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
