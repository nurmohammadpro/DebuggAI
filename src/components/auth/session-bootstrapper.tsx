'use client';

import type { AuthChangeEvent } from '@supabase/supabase-js';

export function shouldClearClientSession(event: AuthChangeEvent | 'INITIAL' | 'ERROR') {
  return event === 'SIGNED_OUT';
}

export function shouldClearMissingSession(hasSupabaseSession: boolean, hasCachedSession: boolean) {
  return !hasSupabaseSession && hasCachedSession;
}

export function SessionBootstrapper() {
  return null;
}
