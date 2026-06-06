import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EditorProject, EditorPage } from '@/components/visual-editor/types';

interface VisualEditorState {
  project: EditorProject;
  setProject: (project: EditorProject) => void;
  updatePage: (pageId: string, updater: (page: EditorPage) => EditorPage) => void;
  addPage: (page: EditorPage) => void;
  deletePage: (pageId: string) => void;
  setActivePage: (pageId: string) => void;
  resetProject: () => void;
}

function createDefaultProject(): EditorProject {
  const pageId = `page_${Date.now()}`;
  return {
    pages: [{ id: pageId, name: 'Page 1', route: '/', rootComponents: [] }],
    activePageId: pageId,
    globalCss: '',
    libraries: [],
  };
}

export const useVisualEditorStore = create<VisualEditorState>()(
  persist(
    (set) => ({
      project: createDefaultProject(),

      setProject: (project) => set({ project }),

      updatePage: (pageId, updater) =>
        set((state) => ({
          project: {
            ...state.project,
            pages: state.project.pages.map((p) =>
              p.id === pageId ? updater(p) : p
            ),
          },
        })),

      addPage: (page) =>
        set((state) => ({
          project: {
            ...state.project,
            pages: [...state.project.pages, page],
          },
        })),

      deletePage: (pageId) =>
        set((state) => {
          const remaining = state.project.pages.filter((p) => p.id !== pageId);
          return {
            project: {
              ...state.project,
              pages: remaining,
              activePageId:
                state.project.activePageId === pageId
                  ? (remaining[0]?.id || '')
                  : state.project.activePageId,
            },
          };
        }),

      setActivePage: (pageId) =>
        set((state) => ({
          project: { ...state.project, activePageId: pageId },
        })),

      resetProject: () => set({ project: createDefaultProject() }),
    }),
    { name: 'debuggai-visual-editor' }
  )
);
