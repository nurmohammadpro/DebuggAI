/**
 * Generation Store
 *
 * Zustand store for web builder state.
 * Handles code, versions, and debugging errors.
 */

import { create } from 'zustand';
import {
  extractVirtualFiles,
  serializeVirtualFiles,
  shouldIgnorePreviewPath,
  type VirtualFile,
  type VirtualProjectFiles,
} from '@/lib/project/virtual-files';

export interface CodeVersion {
  id: string;
  code: string;
  timestamp: number;
  description?: string;
}

export interface RuntimeError {
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
}

interface GenerationState {
  // Current code and state
  currentCode: string;
  activeFilePath: string | null;
  files: VirtualProjectFiles | null;
  previewNonce: number;
  savedSnapshot: string;
  isGenerating: boolean;
  accumulated: string; // Accumulated streaming response
  currentProjectId: string | null;
  currentThreadId: string | null;

  // Versions
  versions: CodeVersion[];
  currentVersionId: string | null;

  // Error state (from iframe runtime errors)
  lastError: RuntimeError | null;

  // Inspect-element bridge (Gap 2: visual editor -> agent)
  pendingInspectPrompt: string | null;
  setPendingInspectPrompt: (prompt: string | null) => void;

  // Turn snapshots for diff timeline (Gap 3)
  turnSnapshots: Array<{ turnId: string; timestamp: number; files: Record<string, string> }>;
  snapshotBeforeTurn: (turnId: string) => void;
  getTurnDiffs: (turnId: string) => Array<{ path: string; oldContent: string; newContent: string }>;

  // Actions
  setCurrentCode: (code: string) => void;
  setActiveFilePath: (path: string) => void;
  bumpPreviewNonce: () => void;
  markSaved: (snapshot?: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setAccumulated: (text: string) => void;
  appendAccumulated: (chunk: string) => void;
  resetAccumulated: () => void;
  getProjectCode: () => string;

  // Version management
  addVersion: (code: string, description?: string) => void;
  setCurrentVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;

  // Error management
  setLastError: (error: RuntimeError | null) => void;
  clearError: () => void;
  setProjectId: (id: string | null) => void;
  setThreadId: (id: string | null) => void;
  clearThread: () => void;

  // Reset
  reset: () => void;
  loadFromProject: (code: string, description?: string) => void;
  loadFromProjectFiles: (files: Record<string, string>, description?: string) => void;
}

const initialState = {
  currentCode: '',
  activeFilePath: null as string | null,
  files: null as VirtualProjectFiles | null,
  previewNonce: 0,
  savedSnapshot: '',
  isGenerating: false,
  accumulated: '',
  versions: [],
  currentVersionId: null,
  lastError: null,
  pendingInspectPrompt: null,
  turnSnapshots: [],
  currentProjectId: null,
  currentThreadId: null,
};

export const useGenerationStore = create<GenerationState>()(
  (set, get) => ({
    ...initialState,

    setCurrentCode: (code) =>
      set((state) => {
        if (!state.files || !state.activeFilePath) return { currentCode: code };
        const existing = state.files.files[state.activeFilePath];
        if (!existing) return { currentCode: code };
        return {
          currentCode: code,
          files: {
            ...state.files,
            files: {
              ...state.files.files,
              [state.activeFilePath]: { ...existing, content: code },
            },
          },
        };
      }),

    setActiveFilePath: (path) =>
      set((state) => {
        const nextPath = path;
        const nextContent = state.files?.files[nextPath]?.content;
        return {
          activeFilePath: nextPath,
          currentCode: typeof nextContent === 'string' ? nextContent : state.currentCode,
        };
      }),

    bumpPreviewNonce: () =>
      set((state) => ({ previewNonce: (state.previewNonce + 1) % Number.MAX_SAFE_INTEGER })),

    markSaved: (snapshot) =>
      set((state) => ({ savedSnapshot: snapshot ?? serializeVirtualFiles(state.files || extractVirtualFiles(state.currentCode)) })),

    setIsGenerating: (isGenerating) => set({ isGenerating }),

    setAccumulated: (text) => set({ accumulated: text }),

    appendAccumulated: (chunk) =>
      set((state) => ({ accumulated: state.accumulated + chunk })),

    resetAccumulated: () => set({ accumulated: '' }),

    getProjectCode: () => {
      const snapshot = get().files;
      if (snapshot) return serializeVirtualFiles(snapshot);
      return get().currentCode;
    },

    addVersion: (code, description) =>
      set((state) => {
        const newVersion: CodeVersion = {
          id: Date.now().toString(),
          code,
          timestamp: Date.now(),
          description,
        };
        return {
          versions: [...state.versions, newVersion],
          currentVersionId: newVersion.id,
        };
      }),

    setCurrentVersion: (versionId) =>
      set((state) => {
        const version = state.versions.find((v) => v.id === versionId);
        const parsed = version?.code ? extractVirtualFiles(version.code) : null;
        return {
          currentVersionId: versionId,
          currentCode: parsed
            ? parsed.files[parsed.entryPath]?.content || version?.code || state.currentCode
            : version?.code || state.currentCode,
          files: parsed,
          activeFilePath: parsed?.entryPath || state.activeFilePath,
        };
      }),

    deleteVersion: (versionId) =>
      set((state) => ({
        versions: state.versions.filter((v) => v.id !== versionId),
        currentVersionId:
          state.currentVersionId === versionId
            ? null
            : state.currentVersionId,
      })),

    setLastError: (error) => set({ lastError: error }),

    clearError: () => set({ lastError: null }),
    setPendingInspectPrompt: (prompt) => set({ pendingInspectPrompt: prompt }),
    snapshotBeforeTurn: (turnId) =>
      set((s) => {
        if (!s.files) return s;
        const snapshot: Record<string, string> = {};
        for (const [path, f] of Object.entries(s.files.files)) {
          if (f.status !== 'deleted') snapshot[path] = f.content;
        }
        return { turnSnapshots: [...s.turnSnapshots, { turnId, timestamp: Date.now(), files: snapshot }] };
      }),
    getTurnDiffs: (turnId) => {
      const state = get();
      const snapshot = state.turnSnapshots.find((s) => s.turnId === turnId);
      if (!snapshot || !state.files) return [];
      const diffs: Array<{ path: string; oldContent: string; newContent: string }> = [];
      const currentPaths = new Set(Object.keys(state.files.files));
      const snapshotPaths = new Set(Object.keys(snapshot.files));
      for (const path of new Set([...currentPaths, ...snapshotPaths])) {
        const oldContent = snapshot.files[path] ?? '';
        const newFile = state.files.files[path];
        const newContent = newFile && newFile.status !== 'deleted' ? newFile.content : '';
        if (oldContent !== newContent) {
          diffs.push({ path, oldContent, newContent });
        }
      }
      return diffs;
    },

    setProjectId: (id) => set({ currentProjectId: id }),
    setThreadId: (id) => set({ currentThreadId: id }),
    clearThread: () => set({ currentThreadId: null }),

    reset: () => set(initialState),

    loadFromProject: (code, description) =>
      set((state) => {
        const baseVersion: CodeVersion = {
          id: Date.now().toString(),
          code,
          timestamp: Date.now(),
          description: description || 'Loaded',
        };
        const parsed = extractVirtualFiles(code);
        return {
          ...initialState,
          currentCode: parsed.files[parsed.entryPath]?.content || code,
          files: parsed,
          activeFilePath: parsed.entryPath,
          savedSnapshot: code,
          versions: [baseVersion],
          currentVersionId: baseVersion.id,
          // Preserve thread + project context; otherwise the chat panel "resets"
          // when we reload the project code.
          currentProjectId: state.currentProjectId,
          currentThreadId: state.currentThreadId,
        };
      }),

    loadFromProjectFiles: (flatFiles, description) =>
      set((state) => {
        const fileEntries: Record<string, VirtualFile> = {};
        for (const [path, content] of Object.entries(flatFiles)) {
          if (shouldIgnorePreviewPath(path)) continue;
          const ext = path.split('.').pop()?.toLowerCase() || '';
          const langMap: Record<string, string> = {
            tsx: 'typescript', ts: 'typescript', jsx: 'javascript', js: 'javascript',
            css: 'css', scss: 'scss', html: 'html', json: 'json', md: 'markdown',
          };
          fileEntries[path] = { path, content, status: 'unchanged', language: langMap[ext] };
        }

        const entryPath = fileEntries['app/page.tsx'] ? 'app/page.tsx'
          : fileEntries['src/App.tsx'] ? 'src/App.tsx'
          : Object.keys(fileEntries)[0] || 'app/page.tsx';

        const parsed: VirtualProjectFiles = { entryPath, files: fileEntries };

        const serialized = serializeVirtualFiles(parsed);
        const baseVersion: CodeVersion = {
          id: Date.now().toString(),
          code: serialized,
          timestamp: Date.now(),
          description: description || 'Loaded from project_files',
        };
        return {
          ...initialState,
          currentCode: fileEntries[entryPath]?.content || Object.values(flatFiles)[0] || '',
          files: parsed,
          activeFilePath: entryPath,
          savedSnapshot: serialized,
          versions: [baseVersion],
          currentVersionId: baseVersion.id,
          currentProjectId: state.currentProjectId,
          currentThreadId: state.currentThreadId,
        };
      }),
  })
);
