'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronDown, Mic, Plus, X, Paperclip } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { toast } from 'sonner';

const MODELS = [
  { id: 'debuggai-max', label: 'DeBuggAI Max', description: 'Best for complex debugging' },
  { id: 'debuggai-fast', label: 'DeBuggAI Fast', description: 'Quick responses' },
] as const;

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
  const [selectedModel, setSelectedModel] = useState<string>(MODELS[0].id);
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

  const selectedModelLabel = MODELS.find((m) => m.id === selectedModel)?.label || MODELS[0].label;

  return (
    <div className="w-full max-w-[620px]">
      <h1 className="text-4xl md:text-[44px] font-semibold tracking-tight text-center text-[var(--app-text)]">
        What do you want to create?
      </h1>

      <div className="mt-6 rounded-[10px] bg-[var(--app-panel)] border border-[var(--app-border)] backdrop-blur-xl">
        <div className="p-4">
          <textarea
            data-dashboard-composer
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Ask DeBuggAI to build..."
            className="w-full min-h-[80px] resize-none bg-transparent outline-none text-[16px] text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]"
          />
        </div>

        <div
          className={`px-3 py-3 flex items-center gap-2 ${prompt.trim() ? 'opacity-100' : 'opacity-70'}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ALLOWED_EXTENSIONS.join(',')}
            onChange={handleFileChange}
          />
          <button
            className="h-10 w-10 rounded-[8px] inline-flex items-center justify-center text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
            type="button"
            title="Attach file"
            aria-label="Attach file"
            onClick={handleAttach}
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="text-[13px] text-[var(--app-text-muted)] px-2 py-1 rounded-[6px] hover:bg-[var(--app-surface)] transition-colors">
              {selectedModelLabel} <ChevronDown className="inline-block ml-1 h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 rounded-[8px] border-[var(--app-border)] bg-[var(--app-panel-2)]">
              {MODELS.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className="text-[13px]"
                >
                  <div className="flex flex-col">
                    <span className={selectedModel === model.id ? 'text-[var(--app-accent)] font-medium' : 'text-[var(--app-text)]'}>
                      {model.label}
                    </span>
                    <span className="text-[13px] text-[var(--app-text-muted)]">{model.description}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex items-center gap-2">
            <button
              className="h-10 w-10 rounded-[8px] inline-flex items-center justify-center bg-[var(--app-accent)] text-black hover:opacity-90 transition-colors disabled:opacity-50"
              type="button"
              title="Create"
              aria-label="Create project"
              disabled={!prompt.trim() || submitting}
              onClick={onSubmit}
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!dismissed && (
          <div className="px-3 py-2 text-[13px] text-[var(--app-text-muted)] flex items-center gap-2 bg-[var(--app-panel-2)] rounded-b-[10px]">
            <span className="truncate">Upgrade to Pro for more credits</span>
            <button className="ml-auto text-[var(--app-accent)] hover:underline text-[13px]" type="button" onClick={onBuyCredits}>
              Buy credits
            </button>
            <button
              className="h-7 w-7 rounded-[8px] inline-flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
              type="button"
              title="Dismiss"
              aria-label="Dismiss upgrade banner"
              onClick={handleDismiss}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
