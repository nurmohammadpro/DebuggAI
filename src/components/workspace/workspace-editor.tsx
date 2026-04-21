'use client';

import { CodeEditor } from '@/components/web-builder/code-editor';
import { WorkspaceEditorTabs } from '@/components/workspace/workspace-editor-tabs';
import { useGenerationStore } from '@/store/generation-store';

export function WorkspaceEditor() {
  const { activeFilePath, files } = useGenerationStore();
  const language = activeFilePath ? files?.files[activeFilePath]?.language : undefined;
  return (
    <section className="flex-1 min-w-0 bg-background flex flex-col min-h-0">
      <WorkspaceEditorTabs />

      <div className="flex-1 min-h-0">
        <CodeEditor
          height="100%"
          showHeader={false}
          language={language}
          className="rounded-none border-0 shadow-none bg-transparent"
        />
      </div>
    </section>
  );
}
