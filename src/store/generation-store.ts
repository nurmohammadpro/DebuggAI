/**
 * Generation Store
 *
 * Zustand store for web builder state.
 * Handles code, versions, and debugging errors.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  extractVirtualFiles,
  serializeVirtualFiles,
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

  // Versions
  versions: CodeVersion[];
  currentVersionId: string | null;

  // Error state (from iframe runtime errors)
  lastError: RuntimeError | null;

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

  // Reset
  reset: () => void;
  loadFromProject: (code: string, description?: string) => void;
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
  currentProjectId: null,
};

export const useGenerationStore = create<GenerationState>()(
  persist(
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

      setProjectId: (id) => set({ currentProjectId: id }),

      reset: () => set(initialState),

      loadFromProject: (code, description) =>
        set(() => {
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
          };
        }),
    }),
    {
      name: 'generation-storage',
      partialize: (state) => ({
        versions: state.versions,
        currentVersionId: state.currentVersionId,
        currentCode: state.currentCode,
        activeFilePath: state.activeFilePath,
        files: state.files,
        savedSnapshot: state.savedSnapshot,
        currentProjectId: state.currentProjectId,
      }),
    }
  )
);
