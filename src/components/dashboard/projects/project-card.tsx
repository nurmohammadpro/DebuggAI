'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Copy, ExternalLink, Trash2 } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
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
    <div className="min-w-0 bg-[var(--app-panel)]">
      <div className="p-3 hover:bg-[var(--bg-tertiary)] transition-colors">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {/* Stack Icon */}
          <div className="w-10 h-10 sm:w-8 sm:h-8 rounded bg-gray-50 flex items-center justify-center shrink-0">
            {project.stack === 'react' ? (
              <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            ) : project.stack === 'nextjs' ? (
              <span className="text-[11px] font-black tracking-[-0.08em] text-gray-900">N</span>
            ) : (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">{title}</h3>
              {project.stack && (
                <span className="px-1.5 py-0.5 rounded bg-gray-200 text-[10px] font-medium text-gray-800 shrink-0">
                  {project.stack.toUpperCase()}
                </span>
              )}
            </div>
            {project.prompt && (
              <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                {project.prompt}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-gray-400">
                {formatDistanceToNowStrict(new Date(project.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-4 gap-1 sm:flex sm:items-center sm:gap-1 shrink-0">
            <button
              className="min-h-11 sm:min-h-0 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-800 transition-colors touch-manipulation"
              title="Duplicate"
              onClick={() => onDuplicate(project)}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              className="min-h-11 sm:min-h-0 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-800 transition-colors touch-manipulation"
              title="Rename"
              onClick={() => setRenameOpen(true)}
            >
              <span className="text-[10px] font-semibold">Aa</span>
            </button>
            <button
              className="min-h-11 sm:min-h-0 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded hover:bg-red-200 text-gray-400 hover:text-red-800 transition-colors touch-manipulation"
              title="Delete"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <Link href={`/dashboard?project=${project.id}`} className="min-h-11 sm:min-h-0 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-800 transition-colors touch-manipulation" aria-label={`Open ${title}`}>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
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
