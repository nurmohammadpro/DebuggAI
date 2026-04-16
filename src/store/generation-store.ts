/**
 * Generation Store
 *
 * Zustand store for web builder state.
 * Handles code, versions, and debugging errors.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  isGenerating: boolean;
  accumulated: string; // Accumulated streaming response

  // Versions
  versions: CodeVersion[];
  currentVersionId: string | null;

  // Error state (from iframe runtime errors)
  lastError: RuntimeError | null;

  // Actions
  setCurrentCode: (code: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setAccumulated: (text: string) => void;
  appendAccumulated: (chunk: string) => void;
  resetAccumulated: () => void;

  // Version management
  addVersion: (code: string, description?: string) => void;
  setCurrentVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;

  // Error management
  setLastError: (error: RuntimeError | null) => void;
  clearError: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  currentCode: '',
  isGenerating: false,
  accumulated: '',
  versions: [],
  currentVersionId: null,
  lastError: null,
};

export const useGenerationStore = create<GenerationState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentCode: (code) => set({ currentCode: code }),

      setIsGenerating: (isGenerating) => set({ isGenerating }),

      setAccumulated: (text) => set({ accumulated: text }),

      appendAccumulated: (chunk) =>
        set((state) => ({ accumulated: state.accumulated + chunk })),

      resetAccumulated: () => set({ accumulated: '' }),

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
          return {
            currentVersionId: versionId,
            currentCode: version?.code || state.currentCode,
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

      reset: () => set(initialState),
    }),
    {
      name: 'generation-storage',
      partialize: (state) => ({
        versions: state.versions,
        currentVersionId: state.currentVersionId,
        currentCode: state.currentCode,
      }),
    }
  )
);
