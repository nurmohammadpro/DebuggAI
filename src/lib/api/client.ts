/**
 * Client-side API fetch wrapper.
 *
 * Automatically attaches:
 * - Authorization: Bearer <token> (from Supabase session)
 * - X-CSRF-Token (from csrf_token cookie, for state-changing methods)
 * - Content-Type: application/json (for requests with a body)
 */

import { supabase } from '@/lib/supabase';
import { getCsrfToken } from '@/lib/csrf-client';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

async function getBearerToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

type FetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export async function apiFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {};

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((v, k) => { headers[k] = v; });
    } else if (Array.isArray(options.headers)) {
      for (const [k, v] of options.headers) headers[k] = v;
    } else {
      Object.assign(headers, options.headers);
    }
  }

  const bearer = await getBearerToken();
  if (bearer && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${bearer}`;
  }

  if (!SAFE_METHODS.has(method)) {
    const csrf = getCsrfToken();
    if (csrf && !headers['x-csrf-token'] && !headers['X-CSRF-Token']) {
      headers['x-csrf-token'] = csrf;
    }
  }

  if (options.body !== undefined && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  const body = options.body !== undefined
    ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
    : undefined;

  return fetch(url, { ...options, method, headers, body });
}
