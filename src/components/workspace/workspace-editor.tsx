'use client';

import { CodeEditor } from '@/components/web-builder/code-editor';
import { PreviewPane } from '@/components/web-builder/preview-pane';
import { WorkspaceEditorTabs } from '@/components/workspace/workspace-editor-tabs';
import { useGenerationStore } from '@/store/generation-store';

export type EditorView = 'code' | 'preview';

export function WorkspaceEditor({
  editorView = 'code',
  onEditorViewChange,
}: {
  editorView?: EditorView;
  onEditorViewChange?: (view: EditorView) => void;
}) {
  const { activeFilePath, files } = useGenerationStore();
  const language = activeFilePath ? files?.files[activeFilePath]?.language : undefined;

  return (
    <section className="flex-1 min-w-0 bg-[var(--app-bg)] flex flex-col min-h-0">
      {/* Toolbar: file tabs + code/preview toggle */}
      <div className="h-11 border-b border-[var(--app-border)] bg-[var(--app-panel)] flex items-center overflow-x-auto px-2 gap-2">
        <div className="flex-1 min-w-0 overflow-x-auto flex items-center gap-1">
          <WorkspaceEditorTabs />
          {(!files || Object.keys(files.files).length === 0) && (
            <span className="text-xs text-[var(--app-text-muted)] px-3">No files loaded</span>
          )}
        </div>

        {/* Code / Preview segmented toggle */}
        <div className="flex items-center shrink-0 mr-1 rounded-[8px] bg-[var(--app-panel-2)] p-0.5">
          <button
            className={`h-7 px-3 rounded-[6px] text-[11px] font-normal transition-colors ${
              editorView === 'code'
                ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
            onClick={() => onEditorViewChange?.('code')}
          >
            Code
          </button>
          <button
            className={`h-7 px-3 rounded-[6px] text-[11px] font-normal transition-colors ${
              editorView === 'preview'
                ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
            onClick={() => onEditorViewChange?.('preview')}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0">
        {editorView === 'preview' ? (
          <PreviewPane height="100%" chromeless className="h-full" />
        ) : (
          <CodeEditor
            height="100%"
            showHeader={false}
            language={language}
            className="rounded-none border-0 bg-transparent"
          />
        )}
      </div>
    </section>
  );
}
