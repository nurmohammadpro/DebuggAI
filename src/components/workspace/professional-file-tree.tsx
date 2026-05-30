/**
 * Professional File Tree Component
 *
 * Production-ready file tree matching IDE standards
 * Features:
 * - Auto-organization of flat files into logical folders
 * - Drag-and-drop reorganization
 * - File sizes and line counts
 * - Git-style status indicators
 * - Context menu (right-click)
 * - Collapsible folders
 * - Search/filter functionality
 * - Create files/folders inline
 */

'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  FilePlus,
  FolderPlus,
  Search,
  X,
  MoreVertical,
  Copy,
  Scissors,
  FileEdit,
  FileSymlink,
  FileX,
  Check,
  Loader2,
  Info,
  FileType,
  FileType2,
  FileImage,
  FileCode,
  FileJson,
  FileText,
  Settings,
  Shield,
  Image,
  Video,
  Music,
  Archive,
  Palette,
  Hash,
  Globe,
  Database,
  Cpu,
  Layers,
  Package,
  Braces,
  Code2,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGenerationStore } from '@/store/generation-store';
import type { VirtualFile, VirtualProjectFiles } from '@/lib/project/virtual-files';
import { buildFileTree, detectEntryPoint, type FileTreeNode } from '@/lib/project/file-tree';

// File type detection with comprehensive icon mapping
const FILE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  // React/TypeScript
  'tsx': FileType2,
  'ts': FileType2,
  'jsx': FileType2,
  'js': FileCode,
  'cjs': FileCode,
  'mjs': FileCode,

  // Styles
  'css': Palette,
  'scss': Palette,
  'sass': Palette,
  'less': Palette,

  // Markup
  'html': Globe,
  'htm': Globe,
  'svg': Image,
  'xml': Code,

  // Data
  'json': FileJson,
  'yaml': FileJson,
  'yml': FileJson,
  'toml': FileJson,
  'graphql': Layers,
  'gql': Layers,

  // Docs
  'md': FileText,
  'markdown': FileText,
  'txt': FileText,
  'pdf': FileText,
  'doc': FileText,
  'docx': FileText,

  // Config
  'config': Settings,
  'conf': Settings,
  'env': Shield,
  'env.local': Shield,
  'env.example': Shield,

  // Python
  'py': FileType2,
  'pyc': Braces,
  'pyd': Braces,

  // Go
  'go': FileCode,

  // Rust
  'rs': FileCode,

  // Ruby
  'rb': FileCode,

  // PHP
  'php': FileCode,

  // Java
  'java': FileCode,
  'jar': Archive,

  // Kotlin
  'kt': FileCode,
  'kts': FileCode,

  // Swift
  'swift': FileCode,

  // C/C++
  'c': FileCode,
  'cpp': FileCode,
  'cc': FileCode,
  'cxx': FileCode,
  'h': FileCode,
  'hpp': FileCode,

  // Vue
  'vue': FileType,

  // Svelte
  'svelte': FileType,

  // Astro
  'astro': FileImage,

  // Next.js specific
  'next.config': Layers,
  'next.config.js': Layers,
  'next.config.mjs': Layers,

  // Web
  'html': Globe,
  'htm': Globe,
  'css': Palette,
  'js': FileCode,

  // Images
  'png': Image,
  'jpg': Image,
  'jpeg': Image,
  'gif': Image,
  'svg': Image,
  'ico': Image,
  'webp': Image,
  'avif': Image,

  // Video
  'mp4': Video,
  'webm': Video,
  'mov': Video,
  'avi': Video,
  'mkv': Video,

  // Audio
  'mp3': Music,
  'wav': Music,
  'ogg': Music,
  'flac': Music,

  // Archives
  'zip': Archive,
  'tar': Archive,
  'gz': Archive,
  '7z': Archive,
  'rar': Archive,

  // Lockfiles
  'lock': Shield,
  'yarn': Package,
  'pnpm': Package,

  // Build
  'dockerfile': Settings,
  'dockerignore': Settings,
  'gitignore': FileEdit,
  'eslintrc': FileEdit,
  'prettierrc': FileEdit,
  'editorconfig': FileEdit,
  'tsconfig': Settings,
  'vite': FileCode,
  'webpack': FileCode,
  'rollup': FileCode,

  // Database
  'db': Database,
  'sql': Database,
  'sqlite': Database,
  'prisma': Database,
};

// Folder-specific icons
const FOLDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'src': FileCode,           // Source code
  'app': FileType2,          // Next.js app directory
  'pages': FileType2,        // Next.js pages
  'components': Layers,    // React components
  'lib': FileCode,         // Library code
  'utils': Hash,            // Utilities
  'hooks': Braces,           // React hooks
  'hooks.ts': Braces,
  'hooks.tsx': Braces,
  'api': Globe,             // API routes
  'routes': Globe,          // Route files
  'styles': Palette,        // Style files
  'assets': Image,          // Assets
  'public': FolderOpen,     // Public folder
  'lib': FileCode,
  'types': FileJson,        // TypeScript types
  'test': FileText,          // Test files
  'tests': FileText,
  '__tests__': FileText,
  'spec': FileText,
  'specs': FileText,
  'stories': FileImage,     // Storybook stories
  '__mocks__': FileCode,
  'node_modules': Folder,   // Dependencies
  '.next': Folder,
  '.vite': Folder,
  'dist': Folder,
  'build': Folder,
  'out': Folder,
  'config': Settings,
  'configs': Settings,
  'scripts': FileText,
  'tools': FileText,
  'docs': FileText,
  'documentation': FileText,
  'examples': Hash,
  'templates': FileImage,
  'template': FileImage,
  'server': Database,
  'client': Globe,
  'shared': Layers,
  'common': Layers,
  'store': FileJson,
  'stores': FileJson,
  'state': FileJson,
  'services': Cpu,
  'controllers': Cpu,
  'middleware': FileSymlink,
  'utils': Hash,
  'helpers': Hash,
  'constants': Braces,
  'context': Braces,
  'providers': Shield,
  'hooks': Braces,
  'types': FileJson,
  'interfaces': FileJson,
  'models': Database,
  'schemas': Database,
  'dto': Database,
  'entities': Database,
  'views': FileImage,
  'layouts': FileType2,
  'components': Layers,
  'elements': Hash,
  'ui': Palette,
  'styles': Palette,
  'themes': Palette,
  'colors': Palette,
  'icons': FileImage,
  'images': Image,
  'fonts': Archive,
  'sounds': Music,
  'videos': Video,
  'data': Database,
  'locales': Globe,
  'translations': Globe,
  'i18n': Globe,
  'config': Settings,
};

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  depth: number;
  children: FileNode[];
  file?: VirtualFile;
  isExpanded?: boolean;
}

interface FileTreeProps {
  className?: string;
  onFileSelect?: (path: string) => void;
  onCreateFile?: (path: string, type: 'file' | 'folder') => void;
  onRename?: (oldPath: string, newPath: string) => void;
  onDelete?: (path: string) => void;
  onDuplicate?: (path: string) => void;
}

export function ProfessionalFileTree({
  className,
  onFileSelect,
  onCreateFile,
  onRename,
  onDelete,
  onDuplicate,
}: FileTreeProps) {
  const { files, activeFilePath, setActiveFilePath } = useGenerationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['src', 'app', 'components', 'lib', 'pages', 'styles', 'assets', 'public', 'utils', 'hooks', 'api', 'routes'])
  );
  const [draggedNode, setDraggedNode] = useState<FileNode | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: FileNode;
  } | null>(null);
  const [editingNode, setEditingNode] = useState<FileNode | null>(null);
  const [editValue, setEditValue] = useState('');

  const treeRef = useRef<HTMLDivElement>(null);

  // Build hierarchical tree structure with auto-organization
  const fileTree = useMemo(() => {
    if (!files || Object.keys(files.files).length === 0) {
      return [];
    }

    const paths = Object.keys(files.files).filter(p => files.files[p]?.status !== 'deleted');
    const tree = buildOrganizedTree(paths, files);
    return tree;
  }, [files, expandedFolders]);

  // Detect entry point for highlighting
  const entryPointPath = useMemo(() => {
    if (!files || Object.keys(files.files).length === 0) {
      return null;
    }
    const paths = Object.keys(files.files).filter(p => files.files[p]?.status !== 'deleted');
    return detectEntryPoint(paths);
  }, [files]);

  // Filter tree based on search
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return fileTree;

    const query = searchQuery.toLowerCase();
    const filterNode = (node: FileNode): FileNode[] => {
      const matchesSearch = node.name.toLowerCase().includes(query);
      const filteredChildren = node.children.flatMap(child => filterNode(child));

      if (matchesSearch || filteredChildren.length > 0) {
        return [{
          ...node,
          children: filteredChildren,
        }];
      }
      return [];
    };

    return fileTree.flatMap(node => filterNode(node));
  }, [fileTree, searchQuery]);

  // Get file icon
  const getFileIcon = (fileName: string, isFolder: boolean = false): React.ComponentType<{ className?: string }> => {
    if (isFolder) {
      const folderName = fileName.toLowerCase();
      // Check for specific folder icons
      for (const [key, icon] of Object.entries(FOLDER_ICONS)) {
        if (folderName.includes(key) || folderName === key) {
          return icon;
        }
      }
      return Folder;
    }

    const ext = fileName.split('.').pop()?.toLowerCase();
    return FILE_ICONS[ext || ''] || FileText;
  };

  // Calculate file stats
  const getFileStats = (content: string) => {
    const lines = content.split('\n').length;
    const chars = content.length;
    const sizeKB = (chars / 1024).toFixed(1);
    return { lines, sizeKB };
  };

  // Handle node selection
  const handleNodeClick = (node: FileNode) => {
    if (node.type === 'folder') {
      toggleFolder(node.path);
    } else {
      setActiveFilePath(node.path);
      onFileSelect?.(node.path);
    }
  };

  const toggleFolder = (path: string) => {
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, node: FileNode) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedNode(node);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(targetPath);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, targetPath: string, targetType: 'folder' | 'file') => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedNode || !targetPath) return;

    // Prevent dropping into itself or its descendants
    if (draggedNode.path === targetPath || targetPath.startsWith(`${draggedNode.path}/`)) {
      setDraggedNode(null);
      setDropTarget(null);
      return;
    }

    // Simulate file/folder move
    const oldPath = draggedNode.path;
    const newPath = targetType === 'folder'
      ? `${targetPath}/${draggedNode.name}`
      : targetPath;

    onRename?.(oldPath, newPath);

    setDraggedNode(null);
    setDropTarget(null);
  };

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();

    const { clientX, clientY } = e;
    setContextMenu({
      x: clientX,
      y: clientY,
      node,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Context menu actions
  const handleContextMenuAction = (action: string, node: FileNode) => {
    switch (action) {
      case 'new-file':
        onCreateFile?.(`${node.path}/new-file.tsx`, 'file');
        break;
      case 'new-folder':
        onCreateFile?.(`${node.path}/new-folder`, 'folder');
        break;
      case 'rename':
        setEditingNode(node);
        setEditValue(node.name);
        break;
      case 'delete':
        if (confirm(`Delete ${node.name}?`)) {
          onDelete?.(node.path);
        }
        break;
      case 'duplicate':
        onDuplicate?.(node.path);
        break;
      case 'copy-path':
        navigator.clipboard.writeText(node.path);
        break;
      case 'expand-all':
        // Expand all folders
        const allFolders = new Set<string>();
        const collectFolders = (n: FileNode) => {
          if (n.type === 'folder') {
            allFolders.add(n.path);
            n.children.forEach(collectFolders);
          }
        };
        fileTree.forEach(collectFolders);
        setExpandedFolders(allFolders);
        break;
      case 'collapse-all':
        setExpandedFolders(new Set(['src', 'app', 'components']));
        break;
    }
    closeContextMenu();
  };

  // Save edit
  const handleSaveEdit = () => {
    if (!editingNode || !editValue.trim()) return;

    const oldPath = editingNode.path;
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = parentPath ? `${parentPath}/${editValue}` : editValue;

    onRename?.(oldPath, newPath);

    setEditingNode(null);
    setEditValue('');
  };

  // Render tree node
  const renderNode = (node: FileNode): React.ReactNode => {
    const isActive = node.type === 'file' && activeFilePath === node.path;
    const isEntryPoint = node.type === 'file' && entryPointPath === node.path;
    const isExpanded = node.type === 'folder' && expandedFolders.has(node.path);
    const isDraggingOver = dropTarget === node.path;
    const isDropTarget = node.type === 'folder';

    const Icon = node.type === 'folder'
      ? (isExpanded ? FolderOpen : Folder)
      : getFileIcon(node.name);

    const file = node.type === 'file' ? files?.files[node.path] : undefined;
    const stats = file ? getFileStats(file.content) : null;

    return (
      <div key={node.id} className="relative">
        {/* Node Row */}
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all",
            "hover:bg-[var(--app-surface)]",
            isActive && "bg-[var(--app-accent-soft)] border border-[var(--app-accent)]",
            isEntryPoint && !isActive && "bg-[var(--app-success-soft)] border border-[var(--app-success)]/20",
            isDraggingOver && "border-2 border-dashed border-[var(--app-accent)] bg-[var(--app-accent-soft)]",
            node.type === 'folder' && "font-semibold text-[var(--app-text)]",
            node.type === 'file' && "text-[var(--app-text-muted)] hover:text-[var(--app-text)]",
          )}
          style={{ paddingLeft: `${node.depth * 12 + 8}px` }}
          onClick={() => handleNodeClick(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          draggable={node.type === 'file'}
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={node.type === 'folder' ? (e) => handleDragOver(e, node.path) : undefined}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.path, node.type)}
        >
          {/* Expand/Collapse or Icon */}
          <span className="shrink-0">
            {node.type === 'folder' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(node.path);
                }}
                className="p-0.5 hover:bg-[var(--app-surface)] rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-[var(--app-text-muted)]" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--app-text-muted)]" />
                )}
              </button>
            )}
          </span>

          {/* File/Folder Icon */}
          <span className="shrink-0">
            <Icon className={cn(
              "h-4 w-4",
              node.type === 'folder' && (isExpanded ? "text-[var(--app-accent)]" : "text-[var(--app-text-muted)]"),
              isActive && "text-[var(--app-accent)]",
              file?.status === 'added' && "text-[var(--app-success)]",
              file?.status === 'modified' && "text-[var(--app-warning)]",
            )} />
          </span>

          {/* Name */}
          <span className={cn(
            "flex-1 truncate",
            editingNode?.id === node.id && "flex-1 mr-2"
          )}>
            {editingNode?.id === node.id ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit();
                  } else if (e.key === 'Escape') {
                    setEditingNode(null);
                    setEditValue('');
                  }
                }}
                className={cn(
                  "bg-[var(--app-bg)] border border-[var(--app-accent)] rounded px-1.5 py-0.5 text-xs",
                  "text-[var(--app-text)] outline-none",
                  "focus:ring-1 focus:ring-[var(--var(--app-accent)]"
                )}
                autoFocus
              />
            ) : (
              <span className={cn(
                "truncate",
                isActive && "font-medium",
                file?.status === 'deleted' && "line-through opacity-40"
              )}>
                {node.name}
              </span>
            )}
          </span>

          {/* File Stats */}
          {node.type === 'file' && stats && !editingNode && (
            <span className="shrink-0 text-[var(--app-text-muted)] text-[10px] ml-2">
              {stats.lines} lines
            </span>
          )}

          {/* Status Badge */}
          {node.type === 'file' && file?.status && file?.status !== 'unchanged' && !editingNode && (
            <span className={cn(
              "shrink-0 text-[9px] font-semibold uppercase px-1 rounded",
              file.status === 'added' && "bg-[var(--app-success-soft)] text-[var(--app-success)]",
              file.status === 'modified' && "bg-[var(--app-warning-soft)] text-[var(--app-warning)]",
              file.status === 'deleted' && "bg-[var(--app-danger-soft)] text-[var(--app-danger)]",
            )}>
              {file.status === 'added' ? '+' : file.status === 'modified' ? '~' : '×'}
            </span>
          )}

          {/* Entry Point Badge */}
          {node.type === 'file' && isEntryPoint && !editingNode && !file?.status && (
            <span className="shrink-0 text-[8px] font-semibold uppercase px-1 rounded bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
              ⚡
            </span>
          )}
        </div>

        {/* Children */}
        {node.type === 'folder' && isExpanded && node.children.length > 0 && (
          <div
            className="relative"
            style={{ marginLeft: `${node.depth * 12 + 20}px` }}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-px bg-[var(--app-border)]"
              style={{ height: 'calc(100% - 36px)' }}
            />
            <div className="pl-3">
              {node.children.map(child => renderNode(child))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Empty state
  if (!files || Object.keys(files.files).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
        <File className="h-12 w-12 text-[var(--app-text-muted)] mb-3" />
        <p className="text-sm text-[var(--app-text)] mb-1">No files yet</p>
        <p className="text-xs text-[var(--app-text-muted)]">
          Generate code to see your project files here
        </p>
      </div>
    );
  }

  return (
    <div
      ref={treeRef}
      className={cn("flex flex-col h-full bg-[var(--app-panel)] select-none", className)}
      onClick={closeContextMenu}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--app-border)] bg-[var(--app-panel-2)]">
        <div className="flex items-center gap-2">
          <Folder className="h-3.5 w-3.5 text-[var(--app-accent)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-muted)]">
            Explorer
          </span>
          {files && (
            <span className="text-[9px] text-[var(--app-text-muted)] ml-1">
              {Object.keys(files.files).filter(p => files.files[p]?.status !== 'deleted').length} files
            </span>
          )}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-[160px] ml-auto">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--var(--app-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className={cn(
                "w-full h-7 bg-[var(--app-panel-2)] border border-[var(--app-border)] rounded px-7 py-1",
                "pl-8 text-[11px]",
                "text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]",
                "outline-none focus:ring-1 focus:ring-[var(--app-accent)]/20",
                "transition-colors",
                "focus:border-[var(--app-accent)]"
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 ml-2">
          <button
            onClick={() => handleContextMenuAction('expand-all', fileTree[0])}
            className="h-7 w-7 rounded-[4px] hover:bg-[var(--app-surface)] transition-colors"
            title="Expand all"
          >
            <ChevronDown className="h-3.5 w-3.5 text-[var(--app-text-muted)]" />
          </button>
          <button
            onClick={() => handleContextMenuAction('collapse-all', fileTree[0])}
            className="h-7 w-7 rounded-[4px] hover:bg-[var(--app-surface)] transition-colors"
            title="Collapse all"
          >
            <ChevronRight className="h-3.5 w-3.5 text-[var(--app-text-muted)]" />
          </button>
        </div>
      </div>

      {/* File Tree Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {filteredTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <Search className="h-12 w-12 text-[var(--app-text-muted)] mb-3" />
            <p className="text-sm text-[var(--app-text)] mb-1">No matching files</p>
            <p className="text-xs text-[var(--app-text-muted)]">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredTree.map(node => renderNode(node))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[100] bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg shadow-2xl py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => {
            e.stopPropagation();
            closeContextMenu();
          }}
        >
          <div className="px-1 py-0.5">
            <p className="text-[10px] font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">
              {contextMenu.node.name}
            </p>
          </div>
          <div className="h-px bg-[var(--app-border)] my-1" />

          {contextMenu.node.type === 'folder' && (
            <>
              <button
                onClick={() => handleContextMenuAction('new-file', contextMenu.node)}
                className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--app-surface)] flex items-center gap-2 text-[var(--app-text)] transition-colors"
              >
                <FilePlus className="h-3.5 w-3.5" />
                New File
              </button>
              <button
                onClick={() => handleContextMenuAction('new-folder', contextMenu.node)}
                className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--app-surface)] flex items-center gap-2 text-[var(--app-text)] transition-colors"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                New Folder
              </button>
              <div className="h-px bg-[var(--app-border)] my-1" />
            </>
          )}

          <button
            onClick={() => handleContextMenuAction('rename', contextMenu.node)}
            className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--app-surface)] flex items-center gap-2 text-[var(--app-text)] transition-colors"
          >
            <FileEdit className="h-3.5 w-3.5" />
            Rename
          </button>

          <button
            onClick={() => handleContextMenuAction('duplicate', contextMenu.node)}
            className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--app-surface)] flex items-center gap-2 text-[var(--app-text)] transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>

          <button
            onClick={() => handleContextMenuAction('copy-path', contextMenu.node)}
            className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--app-surface)] flex items-center gap-2 text-[var(--app-text)] transition-colors"
          >
            <Scissors className="h-3.5 w-3.5" />
            Copy Path
          </button>

          <div className="h-px bg-[var(--app-border)] my-1" />

          <button
            onClick={() => handleContextMenuAction('delete', contextMenu.node)}
            className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--app-danger-soft)] text-[var(--app-danger)] flex items-center gap-2 transition-colors"
          >
            <FileX className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Helper function to detect if file structure is mostly flat
function isFlatStructure(paths: string[]): boolean {
  const pathsWithDepth = paths.map(p => p.split('/').length);
  const avgDepth = pathsWithDepth.reduce((a, b) => a + b, 0) / pathsWithDepth.length;
  return avgDepth < 1.5; // Mostly flat if average depth is less than 1.5
}

// Helper function to auto-organize flat files into logical folders
function organizeFlatFiles(paths: string[], files: VirtualProjectFiles): FileNode[] {
  const root: FileNode[] = [];
  const folderMap = new Map<string, FileNode>();
  const processedPaths = new Set<string>();

  // Define logical folder patterns
  const folderPatterns = [
    { pattern: /^(layout|layout\.tsx?|_layout\.tsx?)$/, folder: 'src', priority: 1 },
    { pattern: /^(page|page\.tsx?|_page\.tsx?|index\.tsx?)$/, folder: 'src', priority: 2 },
    { pattern: /\.(css|scss|sass|less)$/i, folder: 'styles', priority: 3 },
    { pattern: /\.(ts|tsx|js|jsx)$/i, folder: 'src', priority: 4 },
    { pattern: /\.(json|toml|yaml|yml)$/i, folder: 'config', priority: 5 },
    { pattern: /\.(md|markdown|txt)$/i, folder: 'docs', priority: 6 },
    { pattern: /\.(png|jpg|jpeg|gif|svg|ico|webp|avif)$/i, folder: 'assets/images', priority: 7 },
    { pattern: /\.(mp4|webm|mov|avi|mkv)$/i, folder: 'assets/videos', priority: 8 },
    { pattern: /\.(mp3|wav|ogg|flac)$/i, folder: 'assets/sounds', priority: 9 },
    { pattern: /\.(env|env\.local|env\.example)$/i, folder: 'config', priority: 10 },
    { pattern: /^(package\.json|tsconfig\.json|next\.config\.|vite\.config\.|webpack\.config\.)/i, folder: 'config', priority: 11 },
    { pattern: /^(README|LICENSE|CHANGELOG|CONTRIBUTING)/i, folder: 'root', priority: 12 },
  ];

  // Sort paths by priority and name
  const sortedPaths = [...paths].sort((a, b) => {
    const aName = a.split('/').pop() || '';
    const bName = b.split('/').pop() || '';

    let aPriority = 999;
    let bPriority = 999;

    for (const { pattern, priority } of folderPatterns) {
      if (pattern.test(aName)) {
        aPriority = Math.min(aPriority, priority);
      }
      if (pattern.test(bName)) {
        bPriority = Math.min(bPriority, priority);
      }
    }

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    return a.localeCompare(b);
  });

  for (const fullPath of sortedPaths) {
    if (processedPaths.has(fullPath)) continue;

    const parts = fullPath.split('/').filter(Boolean);
    if (parts.length === 0) continue;

    const fileName = parts[parts.length - 1]!;

    // Determine which logical folder this file belongs to
    let targetFolder = 'root';
    for (const { pattern, folder } of folderPatterns) {
      if (pattern.test(fileName)) {
        targetFolder = folder;
        break;
      }
    }

    // Create folder node if it doesn't exist
    if (!folderMap.has(targetFolder) && targetFolder !== 'root') {
      const folderParts = targetFolder.split('/');
      let currentPath = '';
      let currentRoot = root;

      for (const folderPart of folderParts) {
        currentPath = currentPath ? `${currentPath}/${folderPart}` : folderPart;

        let folderNode = currentRoot.find(
          (n: FileNode) => n.type === 'folder' && n.name === folderPart
        );

        if (!folderNode) {
          folderNode = {
            id: currentPath,
            name: folderPart,
            path: currentPath,
            type: 'folder',
            depth: currentRoot.length + 1,
            children: [],
          };
          currentRoot.push(folderNode);
          folderMap.set(currentPath, folderNode);
        }

        currentRoot = folderNode.children;
      }
    }

    // Add file to appropriate location
    const fileNode: FileNode = {
      id: fullPath,
      name: fileName,
      path: fullPath,
      type: 'file',
      depth: targetFolder === 'root' ? 1 : folderMap.get(targetFolder)?.depth ? folderMap.get(targetFolder)!.depth + 1 : 2,
      children: [],
      file: files.files[fullPath],
    };

    if (targetFolder === 'root') {
      root.push(fileNode);
    } else {
      const targetFolderNode = folderMap.get(targetFolder);
      if (targetFolderNode) {
        targetFolderNode.children.push(fileNode);
      }
    }

    processedPaths.add(fullPath);
  }

  // Sort folders first, then files
  return root.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// Helper function to build organized tree structure
function buildOrganizedTree(paths: string[], files: VirtualProjectFiles): FileNode[] {
  if (paths.length === 0) return [];

  // Check if structure is mostly flat
  if (isFlatStructure(paths)) {
    return organizeFlatFiles(paths, files);
  }

  // Use the existing hierarchical structure
  const treeNodes = buildFileTree(paths);

  const convertToFileNode = (node: FileTreeNode, depth: number = 1): FileNode => {
    if (node.type === 'file') {
      return {
        id: node.path,
        name: node.name,
        path: node.path,
        type: 'file',
        depth,
        children: [],
        file: files.files[node.path],
      };
    } else {
      return {
        id: node.path,
        name: node.name,
        path: node.path,
        type: 'folder',
        depth,
        children: node.children.map(child => convertToFileNode(child, depth + 1)),
      };
    }
  };

  return treeNodes.map(node => convertToFileNode(node));
}
