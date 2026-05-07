'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Copy, ExternalLink, Trash2 } from 'lucide-react';
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
    <div className="rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <div className="text-[16px] font-medium text-[var(--app-text)]">{title}</div>
              {project.stack && (
                <span className="inline-flex rounded-[6px] bg-[var(--app-surface)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-text-muted)] shrink-0">
                  {project.stack.toUpperCase()}
                </span>
              )}
            </div>
            {project.prompt && (
              <div className="text-[13px] text-[var(--app-text-muted)] mt-1 line-clamp-2">
                {project.prompt}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <Link href={`/dashboard?project=${project.id}`} className="flex-1">
            <button className="w-full inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-[var(--app-accent)] px-3 py-1.5 text-[13px] font-medium text-black transition-colors hover:opacity-90">
              <ExternalLink className="h-4 w-4" />
              Open
            </button>
          </Link>
          <div className="flex items-center gap-1">
            <button
              className="h-8 w-8 rounded-[8px] inline-flex items-center justify-center text-[var(--app-text-dim)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
              title="Duplicate"
              onClick={() => onDuplicate(project)}
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              className="h-8 w-8 rounded-[8px] inline-flex items-center justify-center text-[var(--app-text-dim)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
              title="Rename"
              onClick={() => setRenameOpen(true)}
            >
              <span className="text-xs font-semibold">Aa</span>
            </button>
            <button
              className="h-8 w-8 rounded-[8px] inline-flex items-center justify-center text-[var(--app-text-dim)] transition-colors hover:bg-[var(--app-danger-soft)] hover:text-[var(--app-danger)]"
              title="Delete"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
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
    </div>
  );
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}...`;
}
