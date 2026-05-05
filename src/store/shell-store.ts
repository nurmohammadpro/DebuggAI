/**
 * Shell Store
 *
 * Zustand store for dashboard shell state (sidebar, preferences, etc).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ShellState {
  sidebarCollapsed: boolean;
  pinnedProjectIds: string[];
  pinnedChatIds: string[];
  chatTitleOverrides: Record<string, string>;

  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setPinnedProjectIds: (ids: string[]) => void;
  setPinnedChatIds: (ids: string[]) => void;
  setChatTitleOverrides: (overrides: Record<string, string>) => void;
  togglePinnedProject: (id: string) => void;
  togglePinnedChat: (id: string) => void;
  updateChatTitleOverride: (id: string, title: string) => void;
}

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      pinnedProjectIds: [],
      pinnedChatIds: [],
      chatTitleOverrides: {},

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setPinnedProjectIds: (pinnedProjectIds) => set({ pinnedProjectIds }),

      setPinnedChatIds: (pinnedChatIds) => set({ pinnedChatIds }),

      setChatTitleOverrides: (chatTitleOverrides) => set({ chatTitleOverrides }),

      togglePinnedProject: (id) =>
        set((state) => {
          const exists = state.pinnedProjectIds.includes(id);
          return {
            pinnedProjectIds: exists
              ? state.pinnedProjectIds.filter((x) => x !== id)
              : [id, ...state.pinnedProjectIds],
          };
        }),

      togglePinnedChat: (id) =>
        set((state) => {
          const exists = state.pinnedChatIds.includes(id);
          return {
            pinnedChatIds: exists
              ? state.pinnedChatIds.filter((x) => x !== id)
              : [id, ...state.pinnedChatIds],
          };
        }),

      updateChatTitleOverride: (id, title) =>
        set((state) => ({
          chatTitleOverrides: { ...state.chatTitleOverrides, [id]: title },
        })),
    }),
    {
      name: 'debuggai-shell-storage',
    }
  )
);
