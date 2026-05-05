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
    <section className="flex-1 min-w-0 bg-background flex flex-col min-h-0">
      {/* Toolbar: file tabs + code/preview toggle */}
      <div className="h-11 border-b border-border/40 bg-card flex items-center overflow-x-auto px-2 gap-2">
        <div className="flex-1 min-w-0 overflow-x-auto flex items-center gap-1">
          <WorkspaceEditorTabs />
          {(!files || Object.keys(files.files).length === 0) && (
            <span className="text-xs text-muted-foreground px-3">No files loaded</span>
          )}
        </div>

        {/* Code / Preview segmented toggle */}
        <div className="flex items-center shrink-0 mr-1 bg-muted/40 rounded-full p-0.5 border border-border/40">
          <button
            className={`h-7 px-3 rounded-full text-xs transition-colors ${
              editorView === 'code'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => onEditorViewChange?.('code')}
          >
            Code
          </button>
          <button
            className={`h-7 px-3 rounded-full text-xs transition-colors ${
              editorView === 'preview'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
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
          <PreviewPane height="100%" chromeless className="h-full bg-transparent" />
        ) : (
          <CodeEditor
            height="100%"
            showHeader={false}
            language={language}
            className="rounded-none border-0 shadow-none bg-transparent"
          />
        )}
      </div>
    </section>
  );
}
