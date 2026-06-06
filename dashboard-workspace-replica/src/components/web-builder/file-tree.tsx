'use client';

import { useState } from 'react';
import {
  File,
  Folder,
  ChevronRight,
  ChevronDown,
  Plus,
  FileCode,
  FileText,
  FileJson,
  Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VirtualProjectFiles } from '@/lib/project/virtual-files';

interface FileTreeProps {
  files: VirtualProjectFiles | null;
  activePath: string | null;
  onSelect: (path: string) => void;
  className?: string;
}

export function FileTree({
  files,
  activePath,
  onSelect,
  className
}: FileTreeProps) {
  if (!files) return null;

  const structure = buildTree(Object.keys(files.files));

  return (
    <div className={cn("flex flex-col h-full bg-[var(--app-panel-2)] select-none", className)}>
      <div className="px-4 h-12 flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface)]">
        <div className="flex items-center gap-2">
          <Folder className="h-3.5 w-3.5 text-[var(--app-text-dim)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-dim)]">Explorer</span>
        </div>
        <button className="p-1.5 rounded-[6px] hover:bg-[var(--app-surface)] transition-colors group">
          <Plus className="h-3.5 w-3.5 text-[var(--app-text-dim)] group-hover:text-[var(--app-text)] transition-colors" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        {structure.map((item) => (
          <TreeItem
            key={item.path}
            item={item}
            files={files}
            activePath={activePath}
            onSelect={onSelect}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}

interface Node {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children: Node[];
}

function buildTree(paths: string[]): Node[] {
  const root: Node[] = [];

  for (const path of paths) {
    const parts = path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]!;
      const fullPath = parts.slice(0, i + 1).join('/');
      const isFolder = i < parts.length - 1;

      let node = current.find(n => n.name === name);

      if (!node) {
        node = {
          name,
          path: fullPath,
          type: isFolder ? 'folder' : 'file',
          children: []
        };
        current.push(node);
      }

      current = node.children;
    }
  }

  const sortNodes = (nodes: Node[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => sortNodes(n.children));
  };

  sortNodes(root);
  return root;
}

function TreeItem({
  item,
  files,
  activePath,
  onSelect,
  depth
}: {
  item: Node;
  files: VirtualProjectFiles;
  activePath: string | null;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const isActive = activePath === item.path;
  const file = files.files[item.path];

  const statusColor = {
    added: 'text-[var(--app-success)]',
    modified: 'text-[var(--app-warning)]',
    deleted: 'text-[var(--app-danger)] line-through opacity-40',
    unchanged: ''
  }[file?.status || 'unchanged'];

  const Icon = item.type === 'folder'
    ? (isOpen ? ChevronDown : ChevronRight)
    : getFileIcon(item.name);

  return (
    <div className="animate-in fade-in slide-in-from-left-1 duration-300">
      <div
        className={cn(
          "group flex items-center gap-2.5 px-3 py-1.5 cursor-pointer transition-colors border-l-2",
          isActive
            ? "bg-[var(--app-accent-soft)] border-[var(--app-accent)] text-[var(--app-text)]"
            : "border-transparent text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]",
        )}
        style={{ paddingLeft: `${(depth + 1) * 14}px` }}
        onClick={() => {
          if (item.type === 'folder') {
            setIsOpen(!isOpen);
          } else if (file?.status !== 'deleted') {
            onSelect(item.path);
          }
        }}
      >
        <span className="shrink-0">
          {item.type === 'folder' ? (
            <Folder className={cn("h-3.5 w-3.5", isOpen ? "text-[var(--app-accent)]" : "text-[var(--app-text-dim)]")} />
          ) : (
            <Icon className={cn("h-3.5 w-3.5", statusColor || "text-[var(--app-text-dim)]")} />
          )}
        </span>
        <span className={cn(
          "text-[12px] font-medium truncate flex-1 tracking-tight",
          isActive && "font-semibold"
        )}>
          {item.name}
        </span>
        {file?.status && file.status !== 'unchanged' && (
          <div className={cn(
            "flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-semibold uppercase",
            file.status === 'added' && "bg-[var(--app-success-soft)] text-[var(--app-success)]",
            file.status === 'modified' && "bg-[var(--app-warning-soft)] text-[var(--app-warning)]",
            file.status === 'deleted' && "bg-[var(--app-danger-soft)] text-[var(--app-danger)]"
          )}>
            {file.status[0]}
          </div>
        )}
      </div>
      {item.type === 'folder' && isOpen && (
        <div className="relative">
          <div className="absolute top-0 bottom-0 w-px bg-[var(--app-border)]" style={{ left: `${(depth + 1) * 14 + 6}px` }} />
          {item.children.map((child) => (
            <TreeItem
              key={child.path}
              item={child}
              files={files}
              activePath={activePath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
      return FileCode;
    case 'jsx':
    case 'js':
      return FileCode;
    case 'json':
      return FileJson;
    case 'css':
      return Hash;
    case 'html':
      return FileCode;
    case 'md':
      return FileText;
    default:
      return File;
  }
}
