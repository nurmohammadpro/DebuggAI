'use client';

import { Plus, FolderKanban } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function NewSplitButton({
  collapsed,
  onNewChat,
  onNewProject,
}: {
  collapsed: boolean;
  onNewChat: () => void;
  onNewProject: () => void;
}) {
  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="w-full flex justify-center px-2 h-10 rounded-[8px] bg-[var(--app-accent)] hover:opacity-90 text-black transition-colors"
            title="New"
            aria-label="New"
          >
            <Plus className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52 rounded-[8px] border-[var(--app-border)] bg-[var(--app-panel-2)]">
          <DropdownMenuItem onClick={onNewChat} className="cursor-pointer gap-2 text-[13px]">
            <Plus className="h-4 w-4" />
            New Chat
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onNewProject} className="cursor-pointer gap-2 text-[13px]">
            <FolderKanban className="h-4 w-4" />
            New Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex gap-1.5">
      <button
        className="flex-1 flex justify-start items-center gap-2.5 h-10 rounded-[8px] bg-[var(--app-accent)] hover:opacity-90 text-black transition-colors px-4"
        onClick={onNewChat}
      >
        <Plus className="h-4 w-4 shrink-0" />
        <span className="truncate text-[13px] font-medium">New Chat</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="h-10 w-10 rounded-[8px] flex items-center justify-center bg-[var(--app-accent)] hover:opacity-90 text-black shrink-0 transition-colors"
            aria-label="More new options"
            title="More new options"
          >
            <FolderKanban className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52 rounded-[8px] border-[var(--app-border)] bg-[var(--app-panel-2)]">
          <DropdownMenuItem onClick={onNewProject} className="cursor-pointer gap-2 text-[13px]">
            <FolderKanban className="h-4 w-4" />
            New Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
