// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { decodeSupabaseCookiePayload } from '@/lib/server/auth';

describe('server auth cookie decoding', () => {
  it('decodes Supabase SSR base64url auth cookie payloads', () => {
    const encoded = Buffer.from(
      JSON.stringify({ access_token: 'token-from-cookie', refresh_token: 'refresh' }),
      'utf8',
    ).toString('base64url');

    expect(decodeSupabaseCookiePayload(`base64-${encoded}`)).toBe('token-from-cookie');
  });

  it('decodes raw auth cookie payloads', () => {
    expect(decodeSupabaseCookiePayload(JSON.stringify({ access_token: 'raw-token' }))).toBe('raw-token');
  });
});
