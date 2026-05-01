'use client';

import { ChevronDown, Plus } from 'lucide-react';

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
            className="w-full justify-center px-2"
            variant="outline"
            size="icon"
            title="New"
            aria-label="New"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem onClick={onNewChat} className="cursor-pointer">
            New Chat
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onNewProject} className="cursor-pointer">
            New Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex w-full">
      <Button
        className={cn('flex-1 justify-start gap-2 rounded-r-none')}
        variant="outline"
        onClick={onNewChat}
      >
        <Plus className="h-4 w-4" />
        New Chat
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="w-10 px-0 rounded-l-none"
            variant="outline"
            aria-label="More new options"
            title="More new options"
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem onClick={onNewProject} className="cursor-pointer">
            New Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

