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
    <Card className="p-4 gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="font-semibold truncate">{title}</div>
            {project.stack && (
              <Badge variant="outline" className="text-xs">
                {project.stack.toUpperCase()}
              </Badge>
            )}
          </div>
          {project.prompt && (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {project.prompt}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Link href={`/dashboard?project=${project.id}`}>
            <Button size="icon" variant="outline" className="h-8 w-8" title="Open in workspace">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            title="Duplicate"
            onClick={() => onDuplicate(project)}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            title="Rename"
            onClick={() => setRenameOpen(true)}
          >
            <span className="text-xs font-semibold">Aa</span>
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            title="Delete"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
