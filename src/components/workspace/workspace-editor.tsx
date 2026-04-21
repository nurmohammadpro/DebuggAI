'use client';

import { CodeEditor } from '@/components/web-builder/code-editor';

export function WorkspaceEditor() {
  return (
    <section className="flex-1 min-w-0 bg-background flex flex-col">
      <div className="h-11 border-b border-border bg-card flex items-center overflow-x-auto px-2 gap-1">
        <EditorTab name="App.tsx" active />
        <EditorTab name="README.md" />
      </div>

      <div className="flex-1 min-h-0">
        <CodeEditor height="calc(100vh - 44px - 44px)" />
      </div>
    </section>
  );
}

function EditorTab({ name, active = false }: { name: string; active?: boolean }) {
  return (
    <button
      className={`h-8 px-3 rounded-full text-xs border transition-colors ${
        active
          ? 'bg-muted/50 border-border text-foreground'
          : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/30 hover:border-border'
      }`}
      title={name}
    >
      {name}
    </button>
  );
}

