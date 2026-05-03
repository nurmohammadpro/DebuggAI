'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronDown, Mic, Plus, X, Paperclip } from 'lucide-react';

import { Button } from '@/components/ui/button';
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

    // Reset input so the same file can be re-attached
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
    <div className="w-full max-w-[560px]">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
        What do you want to create?
      </h1>

      <div className="mt-6 rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden focus-within:border-primary/50 transition-colors">
        <div className="p-4">
          <textarea
            data-dashboard-composer
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Ask DeBuggAI to build…"
            className="w-full min-h-[72px] resize-none bg-transparent outline-none text-sm"
          />
        </div>

        <div
          className={`border-t border-border/40 px-3 py-2 flex items-center gap-2 transition-opacity ${prompt.trim() ? 'opacity-100' : 'opacity-70'}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ALLOWED_EXTENSIONS.join(',')}
            onChange={handleFileChange}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            type="button"
            title="Attach file"
            aria-label="Attach file"
            onClick={handleAttach}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger className="text-xs text-muted-foreground px-2 py-1 rounded-md border border-border/40 hover:bg-muted/30">
              {selectedModelLabel} <ChevronDown className="inline-block ml-1 h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {MODELS.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                >
                  <div className="flex flex-col">
                    <span className={selectedModel === model.id ? 'text-primary font-medium' : ''}>
                      {model.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{model.description}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="text-xs text-muted-foreground px-2 py-1 rounded-md border border-border/40 hover:bg-muted/30">
                Project <ChevronDown className="inline-block ml-1 h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  Recent projects
                </DropdownMenuItem>
                {projects.slice(0, 8).length === 0 && (
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    No projects yet
                  </DropdownMenuItem>
                )}
                {projects.slice(0, 8).map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    className="text-xs truncate"
                    onClick={() => {
                      // Could set a target project context in the future
                    }}
                  >
                    {(p.description || p.prompt || 'Untitled').slice(0, 50)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="default"
              size="icon"
              className={`h-9 w-9 transition-shadow ${prompt.trim() ? 'shadow-glow' : ''}`}
              style={prompt.trim() ? { boxShadow: '0 0 12px rgba(0,200,83,0.2)' } : undefined}
              type="button"
              title="Create"
              aria-label="Create project"
              disabled={!prompt.trim() || submitting}
              onClick={onSubmit}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!dismissed && (
          <div className="border-t border-border/40 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2 bg-muted/25">
            <span className="truncate">Upgrade to Pro for more credits</span>
            <button className="ml-auto text-primary hover:underline" type="button" onClick={onBuyCredits}>
              Buy credits
            </button>
            <button
              className="btn btn-ghost h-7 w-7 px-0"
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
