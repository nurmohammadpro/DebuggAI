/**
 * Workspace Store
 *
 * Holds UI state for the /dashboard workspace: mode, selected project, and panel preferences.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WorkspaceMode = 'build' | 'debug';

interface WorkspaceState {
  mode: WorkspaceMode;
  selectedProjectId: string | null;
  projectKey: string | null;

  setMode: (mode: WorkspaceMode) => void;
  setSelectedProjectId: (projectId: string | null) => void;
  setProjectKey: (projectKey: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      mode: 'build',
      selectedProjectId: null,
      projectKey: null,

      setMode: (mode) => set({ mode }),
      setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
      setProjectKey: (projectKey) => set({ projectKey }),
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({
        mode: state.mode,
        selectedProjectId: state.selectedProjectId,
        projectKey: state.projectKey,
      }),
    }
  )
);
