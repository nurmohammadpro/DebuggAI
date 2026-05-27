/**
 * Session Store
 *
 * Zustand store for user session state.
 * Handles authentication, credits, and user profile.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PlanType = 'free' | 'pro' | 'team' | 'business' | 'enterprise';

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  plan: PlanType;
  credits: number;
  isAdmin: boolean | null;
}

interface SessionState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  updateUser: (patch: Partial<User>) => void;
  setCredits: (credits: number) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  logout: () => void;

  // Credits actions
  decrementCredits: (amount: number) => void;
  incrementCredits: (amount: number) => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      updateUser: (patch) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...patch } : state.user,
        })),

      setCredits: (credits) =>
        set((state) => ({
          user: state.user ? { ...state.user, credits } : null,
        })),

      setIsAuthenticated: (isAuthenticated) =>
        set({ isAuthenticated }),

      setIsLoading: (isLoading) => set({ isLoading }),

      logout: () => {
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('session-storage');
          } catch {
            // localStorage may be unavailable in some environments
          }
        }
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      decrementCredits: (amount) =>
        set((state) => {
          const newCredits = Math.max(0, (state.user?.credits || 0) - amount);
          return {
            user: state.user ? { ...state.user, credits: newCredits } : null,
          };
        }),

      incrementCredits: (amount) =>
        set((state) => {
          const newCredits = (state.user?.credits || 0) + amount;
          return {
            user: state.user ? { ...state.user, credits: newCredits } : null,
          };
        }),
    }),
    {
      name: 'session-storage',
    }
  )
);
