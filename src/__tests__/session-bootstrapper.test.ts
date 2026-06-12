import { describe, expect, it } from 'vitest';
import { shouldClearClientSession } from '@/components/auth/session-bootstrapper';

describe('SessionBootstrapper auth event handling', () => {
  it('only clears the client session for an explicit sign-out', () => {
    expect(shouldClearClientSession('SIGNED_OUT')).toBe(true);
    expect(shouldClearClientSession('INITIAL_SESSION')).toBe(false);
    expect(shouldClearClientSession('TOKEN_REFRESHED')).toBe(false);
    expect(shouldClearClientSession('USER_UPDATED')).toBe(false);
    expect(shouldClearClientSession('ERROR')).toBe(false);
  });
});
