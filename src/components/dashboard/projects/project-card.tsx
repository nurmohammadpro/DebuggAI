'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Copy, ExternalLink, Trash2, GripVertical } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Button } from '@/components/ui/button';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';
import { RenameProjectDialog } from '@/components/dashboard/projects/rename-project-dialog';
import { DeleteProjectDialog } from '@/components/dashboard/projects/delete-project-dialog';

// Stack-based color themes for visual thumbnails
const STACK_THEMES: Record<string, { gradient: string; icon: string; color: string }> = {
  nextjs: { gradient: 'from-gray-900 via-gray-800 to-black', icon: 'N', color: '#000' },
  react: { gradient: 'from-cyan-400 via-blue-500 to-blue-600', icon: '⚛', color: '#61DAFB' },
  vue: { gradient: 'from-emerald-400 via-green-500 to-green-600', icon: 'V', color: '#4FC08D' },
  svelte: { gradient: 'from-orange-400 via-red-500 to-pink-500', icon: 'S', color: '#FF3E00' },
  angular: { gradient: 'from-red-500 via-red-600 to-red-700', icon: 'A', color: '#DD0031' },
  default: { gradient: 'from-purple-400 via-indigo-500 to-blue-500', icon: '◆', color: '#6366F1' },
};

function getStackTheme(stack: string | null) {
  return STACK_THEMES[stack || ''] || STACK_THEMES.default;
}

// Mini code preview component
function CodePreviewSnippet({ code }: { code?: string }) {
  if (!code) return null;
  
  // Extract first meaningful lines of code
  const lines = code.split('\n')
    .filter(line => line.trim() && !line.startsWith('//') && !line.startsWith('/*'))
    .slice(0, 6)
    .join('\n');
  
  if (!lines.trim()) return null;
  
  return (
    <div className="mt-2 p-2 rounded bg-gray-900/5 font-mono text-[10px] leading-relaxed text-gray-600 overflow-hidden max-h-16">
      <pre className="whitespace-pre-wrap line-clamp-3">{lines}</pre>
    </div>
  );
}

// Visual thumbnail with stack gradient and icon
function ProjectThumbnail({ stack, hasCode }: { stack: string | null; hasCode: boolean }) {
  const theme = getStackTheme(stack);
  
  return (
    <div className={`relative w-full h-24 sm:h-20 rounded-t-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center overflow-hidden`}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0%, transparent 50%)`
        }} />
      </div>
      
      {/* Stack icon */}
      <div className="relative z-10 text-3xl font-bold text-white/90 drop-shadow-lg">
        {theme.icon}
      </div>
      
      {/* Code indicator */}
      {hasCode && (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/30 text-[9px] font-medium text-white/80">
          CODE
        </div>
      )}
    </div>
  );
}

export function ProjectCard({
  project,
  onDuplicate,
  onDeleted,
  onRenamed,
  viewMode = 'grid',
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: {
  project: GenerationRow;
  onDuplicate: (project: GenerationRow) => Promise<void>;
  onDeleted: () => void;
  onRenamed: () => void;
  viewMode?: 'grid' | 'list';
  onDragStart?: (e: React.DragEvent, projectId: string) => void;
  onDragOver?: (e: React.DragEvent, projectId: string) => void;
  onDrop?: (e: React.DragEvent, projectId: string) => void;
  isDragging?: boolean;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const actionsVisible = isHovered || showActions;
  
  const title = project.description || 
    (project.prompt ? truncate(project.prompt, 60) : 'Untitled project');
  
  const hasCode = Boolean(project.code && project.code.length > 100);
  const theme = getStackTheme(project.stack);

  if (viewMode === 'grid') {
    return (
      <div
        className={`group relative bg-[var(--app-panel)] rounded-xl border border-[var(--app-border)] overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-black/10 hover:border-[var(--app-accent)]/30 hover:-translate-y-0.5 ${isDragging ? 'opacity-50 scale-95' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setShowActions(false); }}
        onClick={() => setShowActions(!showActions)}
        draggable={!!onDragStart}
        onDragStart={(e) => onDragStart?.(e, project.id)}
        onDragOver={(e) => { e.preventDefault(); onDragOver?.(e, project.id); }}
        onDrop={(e) => onDrop?.(e, project.id)}
      >
        {/* Thumbnail */}
        <ProjectThumbnail stack={project.stack} hasCode={hasCode} />
        
        {/* Content */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[var(--app-text)] truncate group-hover:text-[var(--app-accent)] transition-colors">
                {title}
              </h3>
              {project.prompt && (
                <p className="text-xs text-[var(--app-text-muted)] line-clamp-2 mt-1">
                  {project.prompt}
                </p>
              )}
            </div>
            
            {/* Drag handle */}
            {onDragStart && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                <GripVertical className="h-4 w-4 text-[var(--app-text-dim)]" />
              </div>
            )}
          </div>
          
          {/* Stack badge + timestamp */}
          <div className="flex items-center justify-between mt-3">
            {project.stack && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider" 
                style={{ backgroundColor: `${theme.color}20`, color: theme.color }}>
                {project.stack}
              </span>
            )}
            <span className="text-[10px] text-[var(--app-text-dim)]">
              {formatDistanceToNowStrict(new Date(project.created_at), { addSuffix: true })}
            </span>
          </div>
          
          {/* Code preview */}
          {hasCode && <CodePreviewSnippet code={project.code} />}
        </div>
        
        {/* Hover/tap actions overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-200 ${actionsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
            <Link
              href={`/dashboard?project=${project.id}`}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white text-gray-900 text-xs font-semibold hover:bg-gray-100 transition-colors min-h-11"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.preventDefault(); onDuplicate(project); }}
              className="bg-white/20 text-white hover:bg-white/30 touch-target"
              title="Duplicate"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.preventDefault(); setRenameOpen(true); }}
              className="bg-white/20 text-white hover:bg-white/30 touch-target"
              title="Rename"
            >
              <span className="text-[10px] font-bold">Aa</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.preventDefault(); setDeleteOpen(true); }}
              className="bg-white/20 text-white hover:bg-red-500/80 touch-target"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
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
      </div>
    );
  }

  // List view (enhanced from original)
  return (
    <div className={`min-w-0 bg-[var(--app-panel)] transition-all duration-150 ${isDragging ? 'opacity-50' : ''}`}>
      <div className="p-3 hover:bg-[var(--bg-tertiary)] transition-colors">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Drag handle */}
          {onDragStart && (
            <div className="hidden sm:flex items-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4 text-[var(--app-text-dim)]" />
            </div>
          )}
          
          {/* Stack Icon */}
          <div className={`w-10 h-10 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center shrink-0`}>
            <span className="text-lg font-bold text-white/90">{theme.icon}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">{title}</h3>
              {project.stack && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
                  style={{ backgroundColor: `${theme.color}20`, color: theme.color }}>
                  {project.stack.toUpperCase()}
                </span>
              )}
            </div>
            {project.prompt && (
              <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                {project.prompt}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] text-gray-400">
                {formatDistanceToNowStrict(new Date(project.created_at), { addSuffix: true })}
              </span>
              {hasCode && (
                <span className="text-[10px] text-[var(--app-accent)] font-medium">Has code</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-4 gap-1 sm:flex sm:items-center sm:gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="touch-target"
              title="Duplicate"
              onClick={() => onDuplicate(project)}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="touch-target"
              title="Rename"
              onClick={() => setRenameOpen(true)}
            >
              <span className="text-[10px] font-semibold">Aa</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="touch-target"
              title="Delete"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Link href={`/dashboard?project=${project.id}`} className="inline-flex items-center justify-center touch-target rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors touch-manipulation" aria-label={`Open ${title}`}>
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
