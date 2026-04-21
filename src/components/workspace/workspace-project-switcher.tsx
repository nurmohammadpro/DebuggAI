'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMyProjects } from '@/hooks/queries/use-my-projects';

export function WorkspaceProjectSwitcher({
  selectedProjectId,
}: {
  selectedProjectId: string | null;
}) {
  const router = useRouter();
  const { data } = useMyProjects(50, true);

  const selected = useMemo(() => {
    if (!selectedProjectId) return null;
    return (data || []).find((p) => p.id === selectedProjectId) || null;
  }, [data, selectedProjectId]);

  const label =
    selected?.description ||
    (selected?.prompt ? truncate(selected.prompt, 36) : null) ||
    'Select project';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-8 px-3 rounded-full border border-border bg-transparent hover:bg-muted/40 text-xs"
        >
          <span className="max-w-[220px] truncate">{label}</span>
          <ChevronDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuItem
          onClick={() => router.push('/dashboard/home')}
          className="cursor-pointer"
        >
          Browse projects…
        </DropdownMenuItem>
        <div className="h-px my-1 bg-border/60" />
        {(data || []).slice(0, 12).map((p) => {
          const name =
            p.description ||
            (p.prompt ? truncate(p.prompt, 48) : 'Untitled');
          return (
            <DropdownMenuItem
              key={p.id}
              onClick={() => router.push(`/dashboard?project=${p.id}`)}
              className="cursor-pointer"
            >
              <span className="truncate">{name}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

