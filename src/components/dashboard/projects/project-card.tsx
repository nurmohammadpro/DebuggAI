'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Copy, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';
import { RenameProjectDialog } from '@/components/dashboard/projects/rename-project-dialog';
import { DeleteProjectDialog } from '@/components/dashboard/projects/delete-project-dialog';

export function ProjectCard({
  project,
  onDuplicate,
  onDeleted,
  onRenamed,
}: {
  project: GenerationRow;
  onDuplicate: (project: GenerationRow) => Promise<void>;
  onDeleted: () => void;
  onRenamed: () => void;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const title =
    project.description ||
    (project.prompt ? truncate(project.prompt, 60) : 'Untitled project');

  return (
    <Card className="p-3 sm:p-4 gap-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <div className="font-semibold truncate text-sm sm:text-base">{title}</div>
              {project.stack && (
                <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                  {project.stack.toUpperCase()}
                </Badge>
              )}
            </div>
            {project.prompt && (
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2 sm:line-clamp-3">
                {project.prompt}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
          <Link href={`/dashboard?project=${project.id}`} className="flex-1">
            <Button variant="default" size="sm" className="w-full h-9 sm:h-8">
              <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
              <span className="text-xs sm:text-sm">Open</span>
            </Button>
          </Link>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 sm:h-8 sm:w-8"
              title="Duplicate"
              onClick={() => onDuplicate(project)}
            >
              <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 sm:h-8 sm:w-8"
              title="Rename"
              onClick={() => setRenameOpen(true)}
            >
              <span className="text-[10px] sm:text-xs font-semibold">Aa</span>
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
              title="Delete"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </div>

      <RenameProjectDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        projectId={project.id}
        initialName={title}
        onRenamed={onRenamed}
      />

      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        projectId={project.id}
        projectName={title}
        onDeleted={onDeleted}
      />
    </Card>
  );
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}
