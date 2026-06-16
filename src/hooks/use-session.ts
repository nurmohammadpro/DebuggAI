import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/store/session-store';

export function useSession() {
  const user = useSessionStore((state) => state.user);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const isLoading = useSessionStore((state) => state.isLoading);

  return {
    user,
    isReady: !isLoading,
    isLoading,
  };
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  const user = useSessionStore.getState().user;
  return {
    user,
    isLoading: false,
    isReady: true,
    session: data.session
      ? { access_token: data.session.access_token, user }
      : null,
  };
}

// Legacy stubs for backward compatibility
export function setCachedSession(..._args: unknown[]) {}
export function setBootstrapperReady() {}
export function getCachedSessionSnapshot() {
  return null;
}
