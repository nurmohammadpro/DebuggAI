import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '@/store/session-store';

describe('SessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('starts unauthenticated', () => {
    expect(useSessionStore.getState().isAuthenticated).toBe(false);
    expect(useSessionStore.getState().user).toBeNull();
  });

  it('sets user on login', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      displayName: 'Test User',
      credits: 100,
      plan: 'free' as const,
      isAdmin: false,
      avatarUrl: undefined,
      stripeCustomerId: null,
      referralCode: null,
      ambassador: false,
    };

    useSessionStore.setState({ user: mockUser, isAuthenticated: true });
    expect(useSessionStore.getState().isAuthenticated).toBe(true);
    expect(useSessionStore.getState().user?.email).toBe('test@example.com');
    expect(useSessionStore.getState().user?.credits).toBe(100);
  });

  it('detects admin users', () => {
    const adminUser = {
      id: 'admin-1',
      email: 'admin@example.com',
      displayName: 'Admin',
      credits: 999,
      plan: 'enterprise' as const,
      isAdmin: true,
      avatarUrl: undefined,
      stripeCustomerId: null,
      referralCode: null,
      ambassador: false,
    };

    useSessionStore.setState({ user: adminUser, isAuthenticated: true });
    expect(useSessionStore.getState().user?.isAdmin).toBe(true);
  });
});
