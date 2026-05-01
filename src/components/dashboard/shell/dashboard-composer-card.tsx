'use client';

import { ChevronDown, Mic, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

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
  return (
    <div className="w-full max-w-[560px]">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
        What do you want to create?
      </h1>

      <div className="mt-6 rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
        <div className="p-4">
          <textarea
            data-dashboard-composer
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Ask DeBuggAI to build…"
            className="w-full min-h-[72px] resize-none bg-transparent outline-none text-sm"
          />
        </div>

        <div className="border-t border-border/40 px-3 py-2 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            type="button"
            title="Attach"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <button
            type="button"
            className="text-xs text-muted-foreground px-2 py-1 rounded-md border border-border/40 hover:bg-muted/30"
            title="Model"
          >
            DeBuggAI Max <ChevronDown className="inline-block ml-1 h-3.5 w-3.5" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="text-xs text-muted-foreground px-2 py-1 rounded-md border border-border/40 hover:bg-muted/30"
              title="Project"
            >
              Project <ChevronDown className="inline-block ml-1 h-3.5 w-3.5" />
            </button>
            <Button
              variant="default"
              size="icon"
              className="h-9 w-9"
              type="button"
              title="Create"
              disabled={!prompt.trim() || submitting}
              onClick={onSubmit}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="border-t border-border/40 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2 bg-muted/25">
          <span className="truncate">Upgrade to Pro for more credits</span>
          <button className="ml-auto text-primary hover:underline" type="button" onClick={onBuyCredits}>
            Buy credits
          </button>
          <button
            className="btn btn-ghost h-7 w-7 px-0"
            type="button"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
