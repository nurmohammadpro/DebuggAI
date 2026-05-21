'use client';

import { useCallback, useEffect, useRef } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useGenerationStore } from '@/store/generation-store';
import { useTheme } from '@/components/theme-provider';

interface CodeEditorProps {
  height?: string;
  readOnly?: boolean;
  className?: string;
  showHeader?: boolean;
  language?: string;
  showDiff?: boolean;
  originalCode?: string;
}

export function CodeEditor({
  height = '100%',
  readOnly = false,
  className,
  showHeader = true,
  language = 'typescript',
  showDiff = false,
  originalCode = '',
}: CodeEditorProps) {
  const { currentCode, setCurrentCode } = useGenerationStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | editor.IStandaloneDiffEditor | null>(null);
  const { resolvedTheme } = useTheme();
  const editorTheme =
    resolvedTheme === 'light' ? 'debuggai-light' : 'debuggai-dark';

  useEffect(() => {
    return () => {
      editorRef.current = null;
    };
  }, []);

  const defineThemes = useCallback((monaco: typeof import('monaco-editor')) => {
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
  }, []);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && !showDiff) {
      setCurrentCode(value);
    }
  };

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor | editor.IStandaloneDiffEditor) => {
    editorRef.current = editor;

    if ('updateOptions' in editor) {
      editor.updateOptions({
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });
    }
  };

  const commonOptions = {
    readOnly,
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
  };

  return (
    <div className={`overflow-hidden flex flex-col rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel)] ${className || ''}`} style={{ height }}>
      {showHeader && (
        <div className="border-b border-[var(--app-border)] px-4 py-2 bg-[var(--app-panel-2)] flex items-center justify-between">
          <h3 className="text-[13px] font-medium text-[var(--app-text)]">Code Editor</h3>
          {showDiff && (
            <span className="text-[10px] bg-[var(--app-warning-soft)] text-[var(--app-warning)] px-2 py-0.5 rounded-[6px] border border-[var(--app-warning)]/20 uppercase font-semibold">
              Diff Mode
            </span>
          )}
        </div>
      )}
      <div className="flex-1 min-h-0">
        {showDiff ? (
          <DiffEditor
            key="diff-editor"
            height="100%"
            language={language}
            original={originalCode}
            modified={currentCode}
            onMount={handleEditorDidMount}
            beforeMount={defineThemes}
            theme={editorTheme}
            options={{
              ...commonOptions,
              renderSideBySide: true,
            }}
          />
        ) : (
          <Editor
            key="editor"
            height="100%"
            language={language}
            value={currentCode}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            beforeMount={defineThemes}
            theme={editorTheme}
            options={commonOptions}
          />
        )}
      </div>
    </div>
  );
}
