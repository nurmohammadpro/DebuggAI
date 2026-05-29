/**
 * Enhanced File Tree with Real File Operations
 *
 * Supports create, edit, delete, rename operations for project files
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import {
  File,
  Folder,
  ChevronRight,
  ChevronDown,
  Plus,
  FileCode,
  FileText,
  FileJson,
  Hash,
  Trash2,
  Edit2,
  FilePlus,
  FolderPlus,
  X,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectFileTree, ProjectFile } from '@/lib/project/file-operations';
import {
  createFile,
  updateFile,
  deleteFile,
  renameFile,
  fileExists,
  listFilesInDirectory,
} from '@/lib/project/file-operations';

interface EnhancedFileTreeProps {
  fileTree: ProjectFileTree;
  activePath: string | null;
  onSelect: (path: string) => void;
  onFileTreeChange: (newTree: ProjectFileTree) => void;
  className?: string;
}

type TreeNode = {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children: TreeNode[];
};

export function EnhancedFileTree({
  fileTree,
  activePath,
  onSelect,
  onFileTreeChange,
  className
}: EnhancedFileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    path: string;
    type: 'file' | 'folder';
  } | null>(null);
  const [newFileType, setNewFileType] = useState<'file' | 'folder' | null>(null);
  const [newFileParentPath, setNewFileParentPath] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const structure = buildTree(Object.keys(fileTree.files).filter(path => fileTree.files[path]?.status !== 'deleted'));

  // Focus input when editing starts
  useEffect(() => {
    if (editingPath && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingPath]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleToggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleCreateNew = (parentPath: string, type: 'file' | 'folder') => {
    const parentName = parentPath.split('/').pop() || 'root';
    const defaultName = type === 'folder' ? 'new-folder' : 'new-file.tsx';
    const newPath = `${parentPath}/${defaultName}`;

    setEditingPath(newPath);
    setEditingValue(defaultName);
    setNewFileType(type);
    setNewFileParentPath(parentPath);
    setContextMenu(null);
  };

  const handleRename = (path: string) => {
    const name = path.split('/').pop() || '';
    setEditingPath(path);
    setEditingValue(name);
    setNewFileType(null);
    setNewFileParentPath(null);
    setContextMenu(null);
  };

  const handleDelete = (path: string) => {
    if (confirm(`Are you sure you want to delete ${path.split('/').pop()}?`)) {
      const newTree = deleteFile(fileTree, path);
      onFileTreeChange(newTree);
      if (activePath === path) {
        onSelect('');
      }
    }
    setContextMenu(null);
  };

  const onEditConfirm = () => {
    if (!editingPath || !editingValue.trim()) {
      handleEditCancel();
      return;
    }

    const pathParts = editingPath.split('/');
    const oldName = pathParts.pop()!;
    const parentPath = pathParts.join('/');
    const newName = editingValue.trim();
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;

    // Check if name already exists
    if (newPath !== editingPath && fileExists(fileTree, newPath)) {
      alert(`A file or folder with the name "${newName}" already exists.`);
      return;
    }

    let newTree = fileTree;

    if (newFileType === 'file') {
      // Creating new file
      newTree = createFile(newTree, newPath, '');
    } else if (newFileType === 'folder') {
      // For folders, we just create it as a "virtual" folder
      // In real implementation, you'd create a directory
      newTree = createFile(newTree, `${newPath}/.gitkeep`, '');
    } else if (editingPath !== newPath) {
      // Renaming existing file
      newTree = renameFile(newTree, editingPath, newPath);
    }

    onFileTreeChange(newTree);

    if (newFileType) {
      // Expand the parent folder to show the new item
      const parentToExpand = newFileParentPath || 'src';
      setExpandedFolders(prev => new Set([...prev, parentToExpand]));
      onSelect(newPath);
    } else if (activePath === editingPath) {
      onSelect(newPath);
    }

    handleEditCancel();
  };

  const handleEditCancel = () => {
    setEditingPath(null);
    setEditingValue('');
    setNewFileType(null);
    setNewFileParentPath(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onEditConfirm();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleContextMenu = (e: React.MouseEvent, path: string, type: 'file' | 'folder') => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path,
      type,
    });
  };

  return (
    <div className={cn("flex flex-col h-full bg-[var(--app-panel-2)] select-none", className)}>
      {/* Header */}
      <div className="px-4 h-12 flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface)]">
        <div className="flex items-center gap-2">
          <Folder className="h-3.5 w-3.5 text-[var(--app-text-dim)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-dim)]">
            Explorer
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleCreateNew('src', 'file')}
            className="p-1.5 rounded-[6px] hover:bg-[var(--app-surface)] transition-colors group"
            title="New File"
          >
            <FilePlus className="h-3.5 w-3.5 text-[var(--app-text-dim)] group-hover:text-[var(--app-text)] transition-colors" />
          </button>
          <button
            onClick={() => handleCreateNew('src', 'folder')}
            className="p-1.5 rounded-[6px] hover:bg-[var(--app-surface)] transition-colors group"
            title="New Folder"
          >
            <FolderPlus className="h-3.5 w-3.5 text-[var(--app-text-dim)] group-hover:text-[var(--app-text)] transition-colors" />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-3">
        {structure.length === 0 ? (
          <div className="text-center py-8">
            <Folder className="h-8 w-8 text-[var(--app-text-dim)] mx-auto mb-2" />
            <p className="text-xs text-[var(--app-text-muted)]">No files yet</p>
            <p className="text-xs text-[var(--app-text-dim)] mt-1">
              Create a file to get started
            </p>
          </div>
        ) : (
          structure.map((item) => (
            <TreeItem
              key={item.path}
              item={item}
              fileTree={fileTree}
              activePath={activePath}
              onSelect={onSelect}
              expandedFolders={expandedFolders}
              onToggleFolder={handleToggleFolder}
              onCreateNew={handleCreateNew}
              onContextMenu={handleContextMenu}
              editingPath={editingPath}
              editingValue={editingValue}
              onEditingValueChange={setEditingValue}
              onEditConfirm={onEditConfirm}
              onEditCancel={handleEditCancel}
              onEditKeyDown={handleKeyDown}
              inputRef={inputRef}
              depth={0}
            />
          ))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleCreateNew(contextMenu.path, 'file')}
            className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--app-surface)] flex items-center gap-2 text-[var(--app-text)]"
          >
            <FilePlus className="h-3.5 w-3.5" />
            New File
          </button>
          <button
            onClick={() => handleCreateNew(contextMenu.path, 'folder')}
            className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--app-surface)] flex items-center gap-2 text-[var(--app-text)]"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            New Folder
          </button>
          <div className="h-px bg-[var(--app-border)] my-1" />
          <button
            onClick={() => handleRename(contextMenu.path)}
            className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--app-surface)] flex items-center gap-2 text-[var(--app-text)]"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Rename
          </button>
          <button
            onClick={() => handleDelete(contextMenu.path)}
            className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--app-surface)] flex items-center gap-2 text-[var(--app-danger)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

interface TreeItemProps {
  item: TreeNode;
  fileTree: ProjectFileTree;
  activePath: string | null;
  onSelect: (path: string) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onCreateNew: (parentPath: string, type: 'file' | 'folder') => void;
  onContextMenu: (e: React.MouseEvent, path: string, type: 'file' | 'folder') => void;
  editingPath: string | null;
  editingValue: string;
  onEditingValueChange: (value: string) => void;
  onEditConfirm: () => void;
  onEditCancel: () => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  depth: number;
}

function TreeItem({
  item,
  fileTree,
  activePath,
  onSelect,
  expandedFolders,
  onToggleFolder,
  onCreateNew,
  onContextMenu,
  editingPath,
  editingValue,
  onEditingValueChange,
  onEditConfirm,
  onEditCancel,
  onEditKeyDown,
  inputRef,
  depth,
}: TreeItemProps) {
  const isOpen = expandedFolders.has(item.path);
  const isActive = activePath === item.path;
  const file = fileTree.files[item.path];
  const isEditing = editingPath === item.path;

  const statusColor = {
    added: 'text-[var(--app-success)]',
    modified: 'text-[var(--app-warning)]',
    deleted: 'text-[var(--app-danger)] line-through opacity-40',
    unchanged: ''
  }[file?.status || 'unchanged'];

  const ChevronIcon = isOpen ? ChevronDown : ChevronRight;
  const Icon = item.type === 'folder' ? Folder : getFileIcon(item.name);

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
        onClick={(e) => {
          if (isEditing) return;

          if (item.type === 'folder') {
            onToggleFolder(item.path);
          } else if (file?.status !== 'deleted') {
            onSelect(item.path);
          }
        }}
        onContextMenu={(e) => onContextMenu(e, item.path, item.type)}
      >
        {/* Expand/Collapse or Icon */}
        <span className="shrink-0">
          {item.type === 'folder' ? (
            <ChevronIcon className={cn(
              "h-3.5 w-3.3",
              isOpen ? "text-[var(--app-accent)]" : "text-[var(--app-text-dim)]"
            )} />
          ) : (
            <span className="w-[14px]" />
          )}
        </span>

        {/* File/Folder Icon */}
        {isEditing ? (
          <span className="w-3.5 h-3.5" />
        ) : (
          <span className="shrink-0">
            {item.type === 'folder' ? (
              <Folder className={cn(
                "h-3.5 w-3.5",
                isOpen ? "text-[var(--app-accent)]" : "text-[var(--app-text-dim)]"
              )} />
            ) : (
              <Icon className={cn("h-3.5 w-3.5", statusColor || "text-[var(--app-text-dim)]")} />
            )}
          </span>
        )}

        {/* Name / Input */}
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={editingValue}
              onChange={(e) => onEditingValueChange(e.target.value)}
              onKeyDown={onEditKeyDown}
              onBlur={onEditConfirm}
              className={cn(
                "flex-1 text-[12px] font-medium bg-[var(--app-bg)] border border-[var(--app-accent)] rounded px-1.5 py-0.5 outline-none",
                "text-[var(--app-text)]"
              )}
            />
            <button
              onClick={onEditConfirm}
              className="p-0.5 rounded hover:bg-[var(--app-success-soft)] text-[var(--app-success)]"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              onClick={onEditCancel}
              className="p-0.5 rounded hover:bg-[var(--app-danger-soft)] text-[var(--app-danger)]"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <span className={cn(
            "text-[12px] font-medium truncate flex-1 tracking-tight",
            isActive && "font-semibold"
          )}>
            {item.name}
          </span>
        )}

        {/* Status Badge */}
        {!isEditing && file?.status && file.status !== 'unchanged' && (
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

      {/* Children */}
      {item.type === 'folder' && isOpen && (
        <div className="relative">
          <div
            className="absolute top-0 bottom-0 w-px bg-[var(--app-border)]"
            style={{ left: `${(depth + 1) * 14 + 6}px` }}
          />
          {item.children.map((child) => (
            <TreeItem
              key={child.path}
              item={child}
              fileTree={fileTree}
              activePath={activePath}
              onSelect={onSelect}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onCreateNew={onCreateNew}
              onContextMenu={onContextMenu}
              editingPath={editingPath}
              editingValue={editingValue}
              onEditingValueChange={onEditingValueChange}
              onEditConfirm={onEditConfirm}
              onEditCancel={onEditCancel}
              onEditKeyDown={onEditKeyDown}
              inputRef={inputRef}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];

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

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => sortNodes(n.children));
  };

  sortNodes(root);
  return root;
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
