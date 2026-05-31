'use client';

import { CodeEditor } from '@/components/web-builder/code-editor';
import { EnhancedPreviewPane } from '@/components/web-builder/enhanced-preview-pane';
import { useGenerationStore } from '@/store/generation-store';
import { useSandbox } from '@/hooks/use-sandbox';
import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import {
  FileCode,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Eye,
  Code2,
  FileType,
  Braces,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type EditorView = 'code' | 'preview';

// ── File icon helper ────────────────────────────────────────────────────────
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'jsx':
      return <FileCode className="h-3.5 w-3.5 text-[#61DAFB] shrink-0" />;
    case 'ts':
    case 'js':
      return <FileCode className="h-3.5 w-3.5 text-[#F7DF1E] shrink-0" />;
    case 'css':
      return <Hash className="h-3.5 w-3.5 text-[#264DE4] shrink-0" />;
    case 'json':
      return <Braces className="h-3.5 w-3.5 text-[#FAC863] shrink-0" />;
    case 'md':
    case 'mdx':
      return <FileText className="h-3.5 w-3.5 text-[#88A0A8] shrink-0" />;
    case 'html':
      return <FileType className="h-3.5 w-3.5 text-[#E44D26] shrink-0" />;
    default:
      return <FileText className="h-3.5 w-3.5 text-[var(--app-text-dim)] shrink-0" />;
  }
}

// ── Tree node types ──────────────────────────────────────────────────────────
type TreeFile = {
  type: 'file';
  name: string;
  path: string;
};

type TreeDir = {
  type: 'dir';
  name: string;
  path: string;
  children: TreeNode[];
};

type TreeNode = TreeFile | TreeDir;

// ── Build tree from flat path list ────────────────────────────────────────────
function buildTree(paths: string[]): TreeNode[] {
  const root: Record<string, TreeNode> = {};

  const getOrCreateDir = (
    container: Record<string, TreeNode>,
    name: string,
    path: string
  ): TreeDir => {
    if (!container[name]) {
      container[name] = { type: 'dir', name, path, children: [] };
    }
    return container[name] as TreeDir;
  };

  for (const fullPath of paths) {
    const parts = fullPath.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const partPath = parts.slice(0, i + 1).join('/');
      const isLast = i === parts.length - 1;

      if (isLast) {
        current[part] = { type: 'file', name: part, path: fullPath };
      } else {
        const dir = getOrCreateDir(current, part, partPath);
        const nextContainer: Record<string, TreeNode> = {};
        dir.children.forEach((c) => { nextContainer[c.name] = c; });
        current = nextContainer;
        dir.children = Object.values(nextContainer);
      }
    }
  }

  // Rebuild properly from root
  return buildTreeFromObj(paths);
}

function buildTreeFromObj(paths: string[]): TreeNode[] {
  const dirMap = new Map<string, TreeDir>();
  const rootNodes: TreeNode[] = [];

  // Create all directories first
  const allDirs = new Set<string>();
  for (const path of paths) {
    const parts = path.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      allDirs.add(parts.slice(0, i).join('/'));
    }
  }

  // Sort dirs by depth so parents are created before children
  const sortedDirs = [...allDirs].sort((a, b) => a.split('/').length - b.split('/').length);

  for (const dirPath of sortedDirs) {
    const parts = dirPath.split('/');
    const name = parts[parts.length - 1]!;
    const dir: TreeDir = { type: 'dir', name, path: dirPath, children: [] };
    dirMap.set(dirPath, dir);

    if (parts.length === 1) {
      rootNodes.push(dir);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      const parent = dirMap.get(parentPath);
      if (parent) parent.children.push(dir);
    }
  }

  // Add files
  for (const filePath of paths) {
    const parts = filePath.split('/').filter(Boolean);
    const name = parts[parts.length - 1]!;
    const file: TreeFile = { type: 'file', name, path: filePath };

    if (parts.length === 1) {
      rootNodes.push(file);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      const parent = dirMap.get(parentPath);
      if (parent) parent.children.push(file);
    }
  }

  // Sort: dirs first, then files (alphabetical within each group)
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => { if (n.type === 'dir') sortNodes(n.children); });
  };

  sortNodes(rootNodes);
  return rootNodes;
}

// ── File Tree Component ──────────────────────────────────────────────────────
function FileTreeNode({
  node,
  depth,
  activeFilePath,
  onSelect,
  expandedDirs,
  onToggleDir,
}: {
  node: TreeNode;
  depth: number;
  activeFilePath: string | null;
  onSelect: (path: string) => void;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
}) {
  const indent = depth * 12 + 8;

  if (node.type === 'dir') {
    const isExpanded = expandedDirs.has(node.path);
    return (
      <div>
        <button
          onClick={() => onToggleDir(node.path)}
          className="w-full flex items-center gap-1.5 py-1 hover:bg-[var(--app-surface)] transition-colors text-left group"
          style={{ paddingLeft: indent }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-[var(--app-text-dim)] shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-[var(--app-text-dim)] shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5 text-[var(--app-accent)] shrink-0" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-[var(--app-accent)]/70 shrink-0" />
          )}
          <span className="text-[11px] font-medium text-[var(--app-text)] truncate">
            {node.name}
          </span>
          <span className="ml-auto pr-2 text-[9px] text-[var(--app-text-dim)] opacity-0 group-hover:opacity-100 transition-opacity">
            {node.children.length}
          </span>
        </button>
        {isExpanded && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFilePath={activeFilePath}
                onSelect={onSelect}
                expandedDirs={expandedDirs}
                onToggleDir={onToggleDir}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File node
  const isActive = activeFilePath === node.path;
  return (
    <button
      onClick={() => onSelect(node.path)}
      className={cn(
        'w-full flex items-center gap-1.5 py-1 pr-2 transition-colors text-left',
        isActive
          ? 'bg-[var(--app-accent)]/12 text-[var(--app-accent)]'
          : 'hover:bg-[var(--app-surface)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
      )}
      style={{ paddingLeft: indent + 16 }}
      title={node.path}
    >
      {getFileIcon(node.name)}
      <span
        className={cn(
          'text-[11px] truncate',
          isActive ? 'font-semibold text-[var(--app-accent)]' : 'font-normal'
        )}
      >
        {node.name}
      </span>
    </button>
  );
}

// ── Main WorkspaceEditor ───────────────────────────────────────────────────
export function WorkspaceEditor({
  editorView = 'code',
  onEditorViewChange,
}: {
  editorView?: EditorView;
  onEditorViewChange?: (view: EditorView) => void;
}) {
  const { activeFilePath, files, setActiveFilePath } = useGenerationStore();
  const language = activeFilePath ? files?.files[activeFilePath]?.language : undefined;

  const sandbox = useSandbox();
  const sandboxStartingRef = useRef(false);
  const [dockerFallback, setDockerFallback] = useState(false);

  // Expanded dirs state — auto-expand top-level dirs
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['app', 'src', 'components', 'lib']));

  // Fall back to Sandpack when Docker isn't available
  useEffect(() => {
    if (
      sandbox.error &&
      (sandbox.error.includes('Docker is required') ||
        sandbox.error.includes('Live preview is temporarily disabled'))
    ) {
      setDockerFallback(true);
      sandbox.clearError();
    }
  }, [sandbox.error, sandbox.clearError]);

  // Build file tree from project files
  const fileTree = useMemo(() => {
    if (!files?.files) return [];
    const activePaths = Object.entries(files.files)
      .filter(([, f]) => f.status !== 'deleted')
      .map(([path]) => path);
    return buildTreeFromObj(activePaths);
  }, [files]);

  // Docker files for sandbox
  const dockerFiles = useMemo(() => {
    if (!files?.files) return null;
    const out: Record<string, string> = {};
    for (const [p, f] of Object.entries(files.files)) {
      if (f.status === 'deleted') continue;
      const key = p.startsWith('/') ? p.slice(1) : p;
      out[key] = f.content;
    }
    if (!out['package.json']) {
      const isTs = Object.keys(out).some((p) => p.endsWith('.ts') || p.endsWith('.tsx'));
      out['app/layout.tsx'] =
        out['app/layout.tsx'] ||
        [
          "import './globals.css';",
          '',
          'export default function RootLayout({ children }: { children: React.ReactNode }) {',
          '  return (',
          '    <html lang="en">',
          '      <body>{children}</body>',
          '    </html>',
          '  );',
          '}',
        ].join('\n');

      out['app/page.tsx'] =
        out['app/page.tsx'] ||
        out['src/App.tsx'] ||
        'export default function Page() { return <main style={{ padding: 24 }}>Hello from Next.js</main>; }';

      out['app/globals.css'] = out['app/globals.css'] || 'html,body{height:100%;margin:0}';
      out['next.config.js'] =
        out['next.config.js'] ||
        '/** @type {import("next").NextConfig} */\nconst nextConfig = {};\nmodule.exports = nextConfig;\n';
      out['package.json'] =
        out['package.json'] ||
        JSON.stringify(
          {
            name: 'next-preview-app',
            private: true,
            version: '0.0.0',
            scripts: {
              dev: 'next dev -H 0.0.0.0 -p 3000',
              build: 'next build',
              start: 'next start -H 0.0.0.0 -p 3000',
            },
            dependencies: {
              next: '^16.2.3',
              react: '^19.2.4',
              'react-dom': '^19.2.4',
            },
            devDependencies: isTs
              ? { typescript: '^5.0.0', '@types/node': '^20.0.0', '@types/react': '^19.0.0', '@types/react-dom': '^19.0.0' }
              : {},
          },
          null,
          2
        );
    }
    return out;
  }, [files]);

  const shouldUseDockerSandbox = useMemo(
    () => !dockerFallback && editorView === 'preview',
    [editorView, dockerFallback]
  );

  const ensureSandboxRunning = useCallback(async () => {
    if (!shouldUseDockerSandbox || !dockerFiles) return;
    if (sandbox.status !== 'idle' && sandbox.status !== 'stopped') return;
    if (sandboxStartingRef.current) return;
    sandboxStartingRef.current = true;
    await sandbox.createSandbox(dockerFiles);
    sandboxStartingRef.current = false;
  }, [dockerFiles, sandbox, shouldUseDockerSandbox]);

  const recreateSandbox = useCallback(async () => {
    if (!shouldUseDockerSandbox || !dockerFiles) return;
    try { await sandbox.stopSandbox(); } finally { await sandbox.createSandbox(dockerFiles); }
  }, [dockerFiles, sandbox, shouldUseDockerSandbox]);

  useEffect(() => {
    if (editorView !== 'preview') return;
    void ensureSandboxRunning();
  }, [editorView, ensureSandboxRunning]);

  const handleToggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const fileCount = files ? Object.values(files.files).filter((f) => f.status !== 'deleted').length : 0;

  return (
    <section className="flex-1 min-w-0 bg-[var(--app-bg)] flex flex-col min-h-0 h-full">
      {/* Toolbar */}
      <div className="h-10 border-b border-[var(--app-border)] bg-[var(--app-panel)] flex items-center px-3 gap-2 shrink-0">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {activeFilePath ? (
            <div className="flex items-center gap-1.5 min-w-0">
              {getFileIcon(activeFilePath.split('/').pop() || '')}
              <span className="text-[11px] font-medium text-[var(--app-text)] truncate">
                {activeFilePath}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-[var(--app-text-dim)]">
              {fileCount > 0 ? `${fileCount} files` : 'No files'}
            </span>
          )}
        </div>

        {/* Code / Preview toggle */}
        <div className="flex items-center shrink-0 rounded-[7px] bg-[var(--app-panel-2)] p-0.5 border border-[var(--app-border)]">
          <button
            className={cn(
              'h-7 px-3 rounded-[5px] text-[11px] font-medium transition-colors flex items-center gap-1.5',
              editorView === 'code'
                ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            )}
            onClick={() => onEditorViewChange?.('code')}
          >
            <Code2 className="h-3 w-3" />
            Code
          </button>
          <button
            className={cn(
              'h-7 px-3 rounded-[5px] text-[11px] font-medium transition-colors flex items-center gap-1.5',
              editorView === 'preview'
                ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            )}
            onClick={() => onEditorViewChange?.('preview')}
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex">
        {editorView === 'preview' ? (
          <EnhancedPreviewPane
            height="100%"
            chromeless
            className="flex-1 min-h-0"
            forceSandbox={shouldUseDockerSandbox}
            sandboxUrl={shouldUseDockerSandbox ? sandbox.previewUrl : null}
            sandboxError={shouldUseDockerSandbox ? sandbox.error : null}
            onRefresh={shouldUseDockerSandbox ? recreateSandbox : undefined}
          />
        ) : (
          <>
            {/* File Tree — only shown when files exist */}
            {fileCount > 0 && (
              <div className="w-52 shrink-0 border-r border-[var(--app-border)] bg-[var(--app-panel-2)] flex flex-col overflow-hidden">
                {/* Tree header */}
                <div className="h-8 px-3 flex items-center justify-between border-b border-[var(--app-border)] shrink-0">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--app-text-dim)]">
                    Explorer
                  </span>
                  <span className="text-[9px] text-[var(--app-text-dim)] tabular-nums">
                    {fileCount}
                  </span>
                </div>

                {/* Tree content */}
                <div className="flex-1 overflow-y-auto py-1">
                  {fileTree.map((node) => (
                    <FileTreeNode
                      key={node.path}
                      node={node}
                      depth={0}
                      activeFilePath={activeFilePath}
                      onSelect={setActiveFilePath}
                      expandedDirs={expandedDirs}
                      onToggleDir={handleToggleDir}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Monaco Editor */}
            <CodeEditor
              height="100%"
              showHeader={false}
              language={language}
              className="flex-1 min-w-0 rounded-none border-0 bg-transparent"
            />
          </>
        )}
      </div>
    </section>
  );
}
