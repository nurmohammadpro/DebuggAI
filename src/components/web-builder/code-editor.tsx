/**
 * Code Editor Component
 *
 * Monaco Editor wrapper with TypeScript/JSX support.
 * Two-way sync with generation store.
 */

'use client';

import {  useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useGenerationStore } from '@/store/generation-store';
import { Card } from '@/components/ui/card';

interface CodeEditorProps {
  height?: string;
  readOnly?: boolean;
}

export function CodeEditor({ height = '600px', readOnly = false }: CodeEditorProps) {
  const { currentCode, setCurrentCode } = useGenerationStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

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
    <Card className="overflow-hidden">
      <div className="border-b px-4 py-2 bg-muted/50">
        <h3 className="text-sm font-medium">Code Editor</h3>
      </div>
      <Editor
        height={height}
        defaultLanguage="typescript"
        value={currentCode}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
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
    </Card>
  );
}
