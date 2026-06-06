'use client';

import { useState, useCallback } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  url: string;
}

export function ShareDialog({ open, onOpenChange, projectName, url }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.message(url);
    }
  }, [url]);

  const handleInputClick = useCallback(() => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  }, [url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] text-[var(--app-text)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[16px] font-medium">
            <Share2 className="h-5 w-5 text-[var(--app-accent)]" />
            Share Project
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[var(--app-text-muted)]">
            Share &quot;{projectName}&quot; with others using this link.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 pt-2 pb-4">
          <input
            readOnly
            value={url}
            onClick={handleInputClick}
            className="flex-1 h-10 rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] px-3 text-[12px] text-[var(--app-text)] font-mono outline-none focus:border-[var(--app-accent)] cursor-pointer select-all"
          />
          <button
            onClick={handleCopy}
            className="h-10 px-3 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-[12px] font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity shrink-0"
          >
            {copied ? (
              <><Check className="h-4 w-4" /> Copied</>
            ) : (
              <><Copy className="h-4 w-4" /> Copy</>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
