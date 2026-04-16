/**
 * Debug Store
 *
 * Zustand store for debugging state.
 * Handles debug sessions, language detection, and debug history.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language =
  | 'javascript'
  | 'typescript'
  | 'php'
  | 'python'
  | 'go'
  | 'ruby'
  | 'java'
  | 'csharp'
  | 'rust'
  | 'swift'
  | 'kotlin'
  | 'unknown';

export interface DebugSession {
  id: string;
  language: Language;
  code: string;
  errorMessage?: string;
  fix?: string;
  explanation?: string;
  timestamp: number;
  tags?: string[];
}

interface DebugState {
  // Current debug session
  currentLanguage: Language;
  currentCode: string;
  currentError: string;
  isDebugging: boolean;
  debugResult: string;

  // History
  sessions: DebugSession[];

  // Actions
  setCurrentLanguage: (language: Language) => void;
  setCurrentCode: (code: string) => void;
  setCurrentError: (error: string) => void;
  setIsDebugging: (isDebugging: boolean) => void;
  setDebugResult: (result: string) => void;

  // Session management
  addSession: (session: DebugSession) => void;
  clearSessions: () => void;
  deleteSession: (sessionId: string) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  currentLanguage: 'typescript' as Language,
  currentCode: '',
  currentError: '',
  isDebugging: false,
  debugResult: '',
  sessions: [],
};

export const useDebugStore = create<DebugState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentLanguage: (language) => set({ currentLanguage: language }),

      setCurrentCode: (code) => set({ currentCode: code }),

      setCurrentError: (error) => set({ currentError: error }),

      setIsDebugging: (isDebugging) => set({ isDebugging }),

      setDebugResult: (result) => set({ debugResult: result }),

      addSession: (session) =>
        set((state) => ({
          sessions: [session, ...state.sessions].slice(0, 50), // Keep last 50
        })),

      clearSessions: () => set({ sessions: [] }),

      deleteSession: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'debug-storage',
      partialize: (state) => ({
        sessions: state.sessions,
      }),
    }
  )
);
