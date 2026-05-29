/**
 * Enhanced Code Panel
 *
 * Displays code blocks extracted from LLM responses with a file tree interface
 */

'use client';

import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useCodeBlocksStore } from '@/store/code-blocks-store';
import { useTheme } from '@/components/theme-provider';
import { File, ChevronRight, ChevronDown, Copy, Check, Download, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { generateDefaultFilename } from '@/lib/utils/code-extraction';
import { useState } from 'react';

interface EnhancedCodePanelProps {
  className?: string;
}

interface FileNode {
  name: string;
  id: string;
  type: 'file';
  language: string;
  children?: never;
}

export function EnhancedCodePanel({ className }: EnhancedCodePanelProps) {
  const { codeBlocks, activeBlockId, setActiveBlock, removeCodeBlock } = useCodeBlocksStore();
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['code-blocks']));

  const editorTheme = resolvedTheme === 'light' ? 'debuggai-light' : 'debuggai-dark';

  const activeBlock = codeBlocks.find(block => block.id === activeBlockId);
  const activeCode = activeBlock?.code || '';
  const activeLanguage = activeBlock?.language || 'typescript';

  // Set first block as active if none is active
  useEffect(() => {
    if (!activeBlockId && codeBlocks.length > 0) {
      setActiveBlock(codeBlocks[0]?.id || null);
    }
  }, [activeBlockId, codeBlocks.length, setActiveBlock]);

  // Handle copy with timeout
  const handleCopyCode = async () => {
    if (!activeCode) return;

    try {
      await navigator.clipboard.writeText(activeCode);
      setCopiedBlockId(activeBlockId);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopiedBlockId(null), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  // Handle download code block
  const handleDownloadCode = () => {
    if (!activeBlock) return;

    const filename = activeBlock.filename || generateDefaultFilename(activeBlock.language, 0);
    const blob = new Blob([activeBlock.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  // Handle delete code block
  const handleDeleteBlock = () => {
    if (!activeBlockId) return;
    removeCodeBlock(activeBlockId);
    toast.success('Code block removed');
  };

  // Define Monaco themes
  const defineThemes = (monaco: typeof import('monaco-editor')) => {
    monaco.editor.defineTheme('debuggai-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0A0D0A',
        'editor.foreground': '#E8F5E9',
        'editorLineNumber.foreground': '#4D6B4D',
        'editorLineNumber.activeForeground': '#8BAD8B',
        'editorCursor.foreground': '#00C853',
        'editor.selectionBackground': 'rgba(0,200,83,0.18)',
        'editor.inactiveSelectionBackground': 'rgba(0,200,83,0.10)',
        'editorLineHighlightBackground': 'rgba(255,255,255,0.03)',
        'editorWhitespace.foreground': 'rgba(255,255,255,0.06)',
        'editorIndentGuide.background': 'rgba(255,255,255,0.08)',
        'editorIndentGuide.activeBackground': 'rgba(255,255,255,0.12)',
        'editorWidget.background': '#111411',
        'editorWidget.border': '#283228',
        'editorSuggestWidget.background': '#111411',
        'editorSuggestWidget.border': '#283228',
        'editorSuggestWidget.selectedBackground': '#1E261E',
        'editorHoverWidget.background': '#111411',
        'editorHoverWidget.border': '#283228',
      },
    });

    monaco.editor.defineTheme('debuggai-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#F6FAF6',
        'editor.foreground': '#0B1A0B',
        'editorLineNumber.foreground': '#5C745C',
        'editorLineNumber.activeForeground': '#2F4B2F',
        'editorCursor.foreground': '#00A344',
        'editor.selectionBackground': 'rgba(0,163,68,0.18)',
        'editor.inactiveSelectionBackground': 'rgba(0,163,68,0.10)',
        'editorLineHighlightBackground': 'rgba(0,0,0,0.03)',
        'editorWhitespace.foreground': 'rgba(0,0,0,0.10)',
        'editorIndentGuide.background': 'rgba(0,0,0,0.10)',
        'editorIndentGuide.activeBackground': 'rgba(0,0,0,0.16)',
        'editorWidget.background': '#FFFFFF',
        'editorWidget.border': '#C3D5C3',
        'editorSuggestWidget.background': '#FFFFFF',
        'editorSuggestWidget.border': '#C3D5C3',
        'editorSuggestWidget.selectedBackground': '#E6F0E6',
        'editorHoverWidget.background': '#FFFFFF',
        'editorHoverWidget.border': '#C3D5C3',
      },
    });
  };

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    editor.updateOptions({
      fontSize: 14,
      fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
      fontLigatures: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'on' as const,
      lineNumbers: 'on' as const,
      renderLineHighlight: 'all' as const,
      cursorBlinking: 'smooth' as const,
      cursorSmoothCaretAnimation: 'on' as const,
      smoothScrolling: true,
    });
  };

  // Build file tree from code blocks
  const buildFileTree = (): FileNode[] => {
    return codeBlocks.map((block, index) => {
      const filename = block.filename || generateDefaultFilename(block.language, index);
      return {
        name: filename,
        id: block.id,
        type: 'file',
        language: block.language,
      };
    });
  };

  const fileTree = buildFileTree();

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-10 shrink-0 bg-[var(--app-panel-2)] border-b border-[var(--app-border)]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-[var(--app-text-muted)] uppercase tracking-[0.12em]">
            Code
          </span>
          {activeBlock && (
            <span className="text-[10px] bg-[var(--app-accent-soft)] text-[var(--app-accent)] px-1.5 py-0.5 rounded-[4px] font-medium">
              {activeBlock.language}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {activeBlock && (
            <>
              <button
                onClick={handleCopyCode}
                className="h-7 w-7 rounded-[6px] hover:bg-[var(--app-surface)] inline-flex items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-text)] transition-colors"
                title="Copy code"
              >
                {copiedBlockId === activeBlockId ? (
                  <Check className="h-3.5 w-3.5 text-[var(--app-success)]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={handleDownloadCode}
                className="h-7 w-7 rounded-[6px] hover:bg-[var(--app-surface)] inline-flex items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-text)] transition-colors"
                title="Download code"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDeleteBlock}
                className="h-7 w-7 rounded-[6px] hover:bg-[var(--app-surface)] inline-flex items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-danger)] transition-colors"
                title="Remove code block"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* File Tree */}
        {codeBlocks.length > 0 && (
          <div className="w-48 border-r border-[var(--app-border)] bg-[var(--app-panel-2)]">
            <div className="px-3 h-8 flex items-center justify-between border-b border-[var(--app-border)]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                Explorer
              </span>
              <span className="text-[9px] text-[var(--app-text-muted)]">
                {codeBlocks.length}
              </span>
            </div>

            <div className="py-2">
              {/* Code Blocks Folder */}
              <div>
                <button
                  onClick={() => {
                    setExpandedFolders(prev => {
                      const next = new Set(prev);
                      if (next.has('code-blocks')) {
                        next.delete('code-blocks');
                      } else {
                        next.add('code-blocks');
                      }
                      return next;
                    });
                  }}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-[var(--app-surface)] transition-colors"
                >
                  {expandedFolders.has('code-blocks') ? (
                    <ChevronDown className="h-3 w-3 text-[var(--app-text-dim)]" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-[var(--app-text-dim)]" />
                  )}
                  <span className="text-[11px] font-medium text-[var(--app-text)]">
                    Generated Files
                  </span>
                </button>

                {expandedFolders.has('code-blocks') && (
                  <div className="ml-2 border-l border-[var(--app-border)] pl-1">
                    {fileTree.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => setActiveBlock(node.id)}
                        className={cn(
                          "w-full flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] transition-colors text-left",
                          activeBlockId === node.id
                            ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
                            : "hover:bg-[var(--app-surface)] text-[var(--app-text-muted)]"
                        )}
                      >
                        <File className="h-3 w-3 shrink-0" />
                        <span className="text-[11px] truncate">{node.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Code Editor */}
        <div className="flex-1 min-h-0">
          {codeBlocks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <File className="h-10 w-10 text-[var(--app-text-dim)] mb-3" />
              <p className="text-[12px] font-medium text-[var(--app-text)] mb-1">
                No code generated yet
              </p>
              <p className="text-[11px] text-[var(--app-text-muted)] max-w-[200px]">
                Code blocks from AI responses will appear here
              </p>
            </div>
          ) : (
            <Editor
              height="100%"
              language={activeLanguage}
              value={activeCode}
              onMount={handleEditorDidMount}
              beforeMount={defineThemes}
              theme={editorTheme}
              options={{
                readOnly: true,
                fontSize: 14,
                fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                wordWrap: 'on' as const,
                lineNumbers: 'on' as const,
                renderLineHighlight: 'all' as const,
                cursorBlinking: 'smooth' as const,
                cursorSmoothCaretAnimation: 'on' as const,
                smoothScrolling: true,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
