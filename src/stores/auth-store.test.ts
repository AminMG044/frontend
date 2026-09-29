import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the SDK client sync function so we can assert it's called with the
// right token, and so this test doesn't depend on the real `dorisio-sdk`
// package resolving (it's a sibling `file:../sdk` dependency that isn't
// guaranteed to be present in every environment).
const setTokenMock = vi.fn();
const clearTokenMock = vi.fn();

vi.mock('@/lib/sdk-client', () => ({
  updateSDKToken: vi.fn((token: string | null) => {
    if (token) {
      setTokenMock(token);
    } else {
      clearTokenMock();
    }
  }),
}));

describe('useAuthStore persistence and hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    localStorage.clear();
  });

  it('exposes a hasHydrated flag that becomes true once rehydration settles', async () => {
    const { useAuthStore } = await import('./auth-store');

    // Regardless of exactly when the persist middleware's async rehydration
    // resolves relative to module import, the store must always converge on
    // hasHydrated=true with no auth state when nothing was persisted.
    await vi.waitFor(() => {
      expect(useAuthStore.getState().hasHydrated).toBe(true);
    });

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('persists token and user to localStorage on login', async () => {
    const { useAuthStore } = await import('./auth-store');

    useAuthStore
      .getState()
      .login({ id: '1', email: 'a@b.com', username: 'alice', role: 'fan' }, 'token-123');

    const stored = JSON.parse(localStorage.getItem('Dorisio-auth') || '{}');
    expect(stored.state.token).toBe('token-123');
    expect(stored.state.user).toMatchObject({ id: '1', username: 'alice' });
  });

  it('restores token across a simulated reload from the same localStorage state', async () => {
    // Simulate a prior session having persisted its state.
    localStorage.setItem(
      'Dorisio-auth',
      JSON.stringify({
        state: {
          token: 'persisted-token',
          user: { id: '1', email: 'a@b.com', username: 'alice', role: 'fan' },
        },
        version: 0,
      })
    );

    // Re-import the store fresh, as if the app booted anew and Zustand's
    // persist middleware is rehydrating from the storage above.
    const { useAuthStore } = await import('./auth-store');

    // Rehydration runs asynchronously; wait for it to complete.
    await vi.waitFor(() => {
      expect(useAuthStore.getState().hasHydrated).toBe(true);
    });

    expect(useAuthStore.getState().token).toBe('persisted-token');
    expect(useAuthStore.getState().user).toMatchObject({ username: 'alice' });
  });

  it('syncs the SDK client with the persisted token once hydration completes', async () => {
    localStorage.setItem(
      'Dorisio-auth',
      JSON.stringify({
        state: {
          token: 'sdk-sync-token',
          user: { id: '1', email: 'a@b.com', username: 'alice', role: 'fan' },
        },
        version: 0,
      })
    );

    const { useAuthStore } = await import('./auth-store');

    await vi.waitFor(() => {
      expect(useAuthStore.getState().hasHydrated).toBe(true);
    });

    expect(setTokenMock).toHaveBeenCalledWith('sdk-sync-token');
    expect(clearTokenMock).not.toHaveBeenCalled();
  });

  it('clears the SDK client token on rehydration when no session was persisted', async () => {
    const { useAuthStore } = await import('./auth-store');

    await vi.waitFor(() => {
      expect(useAuthStore.getState().hasHydrated).toBe(true);
    });

    expect(clearTokenMock).toHaveBeenCalled();
    expect(setTokenMock).not.toHaveBeenCalled();
  });

  it('flips hasHydrated to true after rehydration even with no persisted session', async () => {
    const { useAuthStore } = await import('./auth-store');

    await vi.waitFor(() => {
      expect(useAuthStore.getState().hasHydrated).toBe(true);
    });

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('clears token and user on logout', async () => {
    const { useAuthStore } = await import('./auth-store');

    useAuthStore
      .getState()
      .login({ id: '1', email: 'a@b.com', username: 'alice', role: 'fan' }, 'token-123');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('useAuthStore logout push notification cleanup', () => {
  afterEach(() => {
    // @ts-expect-error - deliberately removing the stub between tests
    delete navigator.serviceWorker;
    // @ts-expect-error - deliberately removing the stub between tests
    delete window.PushManager;
    // @ts-expect-error - deliberately removing the stub between tests
    delete window.Notification;
  });

  it('unsubscribes from push and clears the push opt-in preference on logout', async () => {
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      writable: true,
      value: function PushManager() {},
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: { permission: 'granted', requestPermission: vi.fn() },
    });
    const unsubscribe = vi.fn().mockResolvedValue(true);
    const getRegistration = vi.fn().mockResolvedValue({
      pushManager: { getSubscription: vi.fn().mockResolvedValue({ unsubscribe }) },
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: { getRegistration },
    });

    const { useAuthStore } = await import('./auth-store');
    const { usePushNotificationPreferenceStore } = await import(
      './push-notification-preference-store'
    );
    usePushNotificationPreferenceStore.getState().setOptedIn(true);

    useAuthStore
      .getState()
      .login({ id: '1', email: 'a@b.com', username: 'alice', role: 'fan' }, 'token-123');
    useAuthStore.getState().logout();

    await vi.waitFor(() => {
      expect(unsubscribe).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(usePushNotificationPreferenceStore.getState().optedIn).toBe(false);
    });
  });

  it('logs out synchronously without waiting on push cleanup, and does not throw when serviceWorker is unavailable', async () => {
    const { useAuthStore } = await import('./auth-store');

    useAuthStore
      .getState()
      .login({ id: '1', email: 'a@b.com', username: 'alice', role: 'fan' }, 'token-123');

    expect(() => useAuthStore.getState().logout()).not.toThrow();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
