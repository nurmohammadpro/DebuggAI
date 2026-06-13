/**
 * Session Store — Clerk-powered with backward-compat for old consumers.
 *
 * Auth is handled by Clerk. This store tracks profile (credits, plan, isAdmin).
 * Keeps `user`, `isAuthenticated` for components that still use the old API.
 */

import { create } from 'zustand';

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

interface UserProfile {
  credits: number;
  plan: PlanType;
  isAdmin: boolean | null;
}

interface SessionState {
  // ── Backward-compat (used by many existing components) ──
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // ── Clerk bridge ──
  isLoaded: boolean;
  profile: UserProfile | null;

  // ── Actions ──
  setUser: (user: User | null) => void;
  updateUser: (patch: Partial<User>) => void;
  setCredits: (credits: number) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setLoaded: (loaded: boolean) => void;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  logout: () => void;
  decrementCredits: (amount: number) => void;
  incrementCredits: (amount: number) => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isLoaded: false,
  profile: null,

  setUser: (user) => set({
    user: user ? {
      ...user,
      credits: user.credits ?? 0,
      plan: user.plan ?? 'free',
      isAdmin: user.isAdmin ?? null,
    } : null,
    isAuthenticated: !!user,
    isLoading: false,
  }),

  updateUser: (patch) => set((state) => ({
    user: state.user ? { ...state.user, ...patch } : null,
  })),

  setCredits: (credits) => set((state) => ({
    user: state.user ? { ...state.user, credits } : null,
    profile: state.profile ? { ...state.profile, credits } : null,
  })),

  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setIsLoading: (isLoading) => set({ isLoading }),

  setLoaded: (loaded) => set({ isLoaded: loaded, isLoading: false }),
  setProfile: (profile) => set((state) => ({
    profile,
    user: state.user ? { ...state.user, credits: profile.credits, plan: profile.plan, isAdmin: profile.isAdmin } : null,
  })),

  updateProfile: (patch) => set((state) => ({
    profile: state.profile ? { ...state.profile, ...patch } : null,
  })),

  logout: () => set({
    user: null, isAuthenticated: false, isLoading: false,
    isLoaded: false, profile: null,
  }),

  decrementCredits: (amount) => set((state) => {
    const newCredits = Math.max(0, (state.user?.credits || 0) - amount);
    return {
      user: state.user ? { ...state.user, credits: newCredits } : null,
      profile: state.profile ? { ...state.profile, credits: newCredits } : null,
    };
  }),

  incrementCredits: (amount) => set((state) => {
    const newCredits = (state.user?.credits || 0) + amount;
    return {
      user: state.user ? { ...state.user, credits: newCredits } : null,
      profile: state.profile ? { ...state.profile, credits: newCredits } : null,
    };
  }),
}));
