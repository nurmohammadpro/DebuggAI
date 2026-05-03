'use client';

import { Plus, FolderKanban } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

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
          <Button
            className="w-full justify-center px-2 h-10 rounded-lg bg-foreground hover:bg-foreground/90 text-background"
            size="icon"
            title="New"
            aria-label="New"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem onClick={onNewChat} className="cursor-pointer gap-2">
            <Plus className="h-4 w-4" />
            New Chat
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onNewProject} className="cursor-pointer gap-2">
            <FolderKanban className="h-4 w-4" />
            New Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex gap-1.5">
      <Button
        className="flex-1 justify-start gap-2.5 h-10 rounded-lg bg-foreground hover:bg-foreground/90 text-background active:scale-[0.98] transition-all duration-200"
        onClick={onNewChat}
      >
        <Plus className="h-4 w-4 shrink-0" />
        <span className="truncate font-medium">New Chat</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="h-10 w-10 px-0 rounded-lg bg-foreground hover:bg-foreground/90 text-background shrink-0"
            aria-label="More new options"
            title="More new options"
          >
            <FolderKanban className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem onClick={onNewProject} className="cursor-pointer gap-2">
            <FolderKanban className="h-4 w-4" />
            New Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
