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
import type { VirtualProjectFiles, VirtualFile } from '@/lib/project/virtual-files';

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

  // Build folder structure
  const structure = buildTree(Object.keys(files.files));

  return (
    <div className={cn("flex flex-col h-full bg-black/20 backdrop-blur-md select-none", className)}>
      <div className="px-4 h-12 flex items-center justify-between border-b border-white/[0.05] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Folder className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Explorer</span>
        </div>
        <button className="p-1.5 hover:bg-white/[0.05] rounded-md transition-all group">
          <Plus className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-3 scrollbar-thin scrollbar-thumb-white/[0.05]">
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

  // Sort: folders first, then files
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
    added: 'text-emerald-400',
    modified: 'text-amber-400',
    deleted: 'text-rose-400 line-through opacity-40',
    unchanged: ''
  }[file?.status || 'unchanged'];

  const Icon = item.type === 'folder' 
    ? (isOpen ? ChevronDown : ChevronRight)
    : getFileIcon(item.name);

  return (
    <div className="animate-in fade-in slide-in-from-left-1 duration-300">
      <div 
        className={cn(
          "group flex items-center gap-2.5 px-3 py-1.5 cursor-pointer transition-all border-l-2",
          isActive 
            ? "bg-emerald-500/10 border-emerald-500 text-foreground" 
            : "border-transparent text-muted-foreground/70 hover:bg-white/[0.03] hover:text-foreground",
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
        <span className="shrink-0 transition-transform duration-200 group-hover:scale-110">
          {item.type === 'folder' ? (
            <Folder className={cn("h-3.5 w-3.5", isOpen ? "text-emerald-500/60" : "text-muted-foreground/40")} />
          ) : (
            <Icon className={cn("h-3.5 w-3.5", statusColor || "text-muted-foreground/40")} />
          )}
        </span>
        <span className={cn(
          "text-[12px] font-medium truncate flex-1 tracking-tight",
          isActive && "font-bold"
        )}>
          {item.name}
        </span>
        {file?.status && file.status !== 'unchanged' && (
          <div className={cn(
            "flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold uppercase ring-1 ring-inset",
            file.status === 'added' && "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
            file.status === 'modified' && "bg-amber-500/10 text-amber-400 ring-amber-500/20",
            file.status === 'deleted' && "bg-rose-500/10 text-rose-400 ring-rose-500/20"
          )}>
            {file.status[0]}
          </div>
        )}
      </div>
      {item.type === 'folder' && isOpen && (
        <div className="relative">
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-white/[0.03]" style={{ left: `${(depth + 1) * 14 + 6}px` }} />
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
