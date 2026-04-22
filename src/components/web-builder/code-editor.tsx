/**
 * Code Editor Component
 *
 * Monaco Editor wrapper with TypeScript/JSX support.
 * Two-way sync with generation store.
 */

'use client';

import { useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useGenerationStore } from '@/store/generation-store';
import { Card } from '@/components/ui/card';
import { useTheme } from 'next-themes';

interface CodeEditorProps {
  height?: string;
  readOnly?: boolean;
  className?: string;
  showHeader?: boolean;
  language?: string;
}

export function CodeEditor({
  height = '600px',
  readOnly = false,
  className,
  showHeader = true,
  language = 'typescript',
}: CodeEditorProps) {
  const { currentCode, setCurrentCode } = useGenerationStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { resolvedTheme } = useTheme();
  const editorTheme =
    resolvedTheme === 'light' ? 'debuggai-light' : 'debuggai-dark';

  const defineThemes = useCallback((monaco: typeof import('monaco-editor')) => {
    // Keep Monaco colors aligned with our design tokens in `src/app/globals.css`
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
    if (value !== undefined) {
      setCurrentCode(value);
    }
  };

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Set editor options
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });
  };

  return (
    <Card className={`overflow-hidden flex flex-col ${className || ''}`} style={{ height }}>
      {showHeader && (
        <div className="border-b px-4 py-2 bg-muted/50">
          <h3 className="text-sm font-medium">Code Editor</h3>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={currentCode}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          beforeMount={defineThemes}
          theme={editorTheme}
          options={{
            readOnly,
            fontSize: 14,
            fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
            fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: 'on',
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
        }}
        />
      </div>
    </Card>
  );
}
