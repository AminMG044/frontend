/**
 * Tests for usePushNotifications.
 *
 * `navigator.serviceWorker`, `Notification`, and `PushManager` are stubbed
 * per-test since happy-dom doesn't implement them, following the same
 * pattern as src/lib/push-notifications.test.ts and the MockWebSocket used
 * in use-realtime-notifications.test.tsx.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePushNotifications } from './use-push-notifications';
import { usePushNotificationPreferenceStore } from '@/stores/push-notification-preference-store';

function stubNotification(permission: NotificationPermission, requestResult?: NotificationPermission) {
  // Mirrors real browser behavior: once `requestPermission()` resolves, the
  // ambient `Notification.permission` getter reflects the new value too, so
  // any code that re-reads it after the prompt (as `subscribeToPush` does)
  // sees the updated state rather than the stale pre-prompt value.
  const notificationStub = {
    permission,
    requestPermission: vi.fn().mockImplementation(async () => {
      const result = requestResult ?? permission;
      notificationStub.permission = result;
      return result;
    }),
  };
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    writable: true,
    value: notificationStub,
  });
}

function stubPushManager() {
  Object.defineProperty(window, 'PushManager', {
    configurable: true,
    writable: true,
    value: function PushManager() {},
  });
}

function stubServiceWorker(registration: Record<string, unknown>) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    writable: true,
    value: {
      register: vi.fn().mockResolvedValue(registration),
      getRegistration: vi.fn().mockResolvedValue(registration),
    },
  });
}

function clearGlobalStub(target: 'Notification' | 'serviceWorker' | 'PushManager') {
  if (target === 'serviceWorker') {
    // @ts-expect-error - deliberately removing the stub between tests
    delete navigator.serviceWorker;
  } else {
    delete (window as unknown as Record<string, unknown>)[target];
  }
}

function makeRegistration(overrides: Record<string, unknown> = {}) {
  return {
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe: vi.fn().mockResolvedValue({ endpoint: 'https://push.example/sub' }),
      ...overrides,
    },
  };
}

describe('usePushNotifications', () => {
  const originalVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  beforeEach(() => {
    usePushNotificationPreferenceStore.setState({ optedIn: false });
    localStorage.clear();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'BEXAMPLEKEY1234567890abcdefghijklmno-_';
  });

  afterEach(() => {
    clearGlobalStub('Notification');
    clearGlobalStub('PushManager');
    clearGlobalStub('serviceWorker');
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalVapidKey;
    usePushNotificationPreferenceStore.setState({ optedIn: false });
  });

  it('reports isSupported: false and permission: "unsupported" when push APIs are missing', () => {
    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.isSupported).toBe(false);
    expect(result.current.permission).toBe('unsupported');
    expect(result.current.isSubscribed).toBe(false);
  });

  it('reflects the initial "default" permission state', () => {
    stubPushManager();
    stubNotification('default');
    stubServiceWorker(makeRegistration());

    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.permission).toBe('default');
    expect(result.current.isSubscribed).toBe(false);
  });

  it('reflects an initial "denied" permission state', () => {
    stubPushManager();
    stubNotification('denied');
    stubServiceWorker(makeRegistration());

    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.permission).toBe('denied');
  });

  it('subscribe(): requests permission, subscribes, marks isSubscribed and persists opt-in when granted', async () => {
    stubPushManager();
    stubNotification('default', 'granted');
    const registration = makeRegistration();
    stubServiceWorker(registration);

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });
    expect(result.current.permission).toBe('granted');
    expect(result.current.error).toBeNull();
    expect(usePushNotificationPreferenceStore.getState().optedIn).toBe(true);
    expect(registration.pushManager.subscribe).toHaveBeenCalled();
  });

  it('subscribe(): when permission is denied, does not subscribe and leaves opt-in false', async () => {
    stubPushManager();
    stubNotification('default', 'denied');
    const registration = makeRegistration();
    stubServiceWorker(registration);

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.permission).toBe('denied');
    expect(usePushNotificationPreferenceStore.getState().optedIn).toBe(false);
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('subscribe(): when permission is already granted, subscribes without re-prompting', async () => {
    stubPushManager();
    stubNotification('granted');
    const registration = makeRegistration();
    stubServiceWorker(registration);

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });
  });

  it('subscribe(): surfaces an error and clears opt-in when the underlying subscribe call fails', async () => {
    stubPushManager();
    stubNotification('granted');
    const registration = makeRegistration({
      subscribe: vi.fn().mockRejectedValue(new Error('network unreachable')),
    });
    stubServiceWorker(registration);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.error).toBe('network unreachable');
    expect(usePushNotificationPreferenceStore.getState().optedIn).toBe(false);
    consoleSpy.mockRestore();
  });

  it('subscribe(): reports isSupported: false path with a clear error when called unsupported', async () => {
    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.error).toBe('Push notifications are not supported in this browser.');
    expect(result.current.isSubscribed).toBe(false);
  });

  it('unsubscribe(): clears isSubscribed and the persisted opt-in preference', async () => {
    stubPushManager();
    stubNotification('granted');
    const unsubscribeSpy = vi.fn().mockResolvedValue(true);
    const registration = makeRegistration({
      getSubscription: vi.fn().mockResolvedValue({ unsubscribe: unsubscribeSpy }),
    });
    stubServiceWorker(registration);
    usePushNotificationPreferenceStore.getState().setOptedIn(true);

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(result.current.isSubscribed).toBe(false);
    expect(usePushNotificationPreferenceStore.getState().optedIn).toBe(false);
    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  it('unsubscribe(): is safe to call when unsupported (no-op, does not throw)', async () => {
    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(result.current.isSubscribed).toBe(false);
    expect(usePushNotificationPreferenceStore.getState().optedIn).toBe(false);
  });

  it('reconciles an existing subscription on mount when already opted in and permission is granted', async () => {
    stubPushManager();
    stubNotification('granted');
    const registration = makeRegistration({
      getSubscription: vi.fn().mockResolvedValue({ endpoint: 'https://push.example/existing' }),
    });
    stubServiceWorker(registration);
    usePushNotificationPreferenceStore.getState().setOptedIn(true);

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });
  });

  it('does not report subscribed on mount when opted in but permission was revoked', async () => {
    stubPushManager();
    stubNotification('denied');
    const registration = makeRegistration();
    stubServiceWorker(registration);
    usePushNotificationPreferenceStore.getState().setOptedIn(true);

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.permission).toBe('denied');
    });
    expect(result.current.isSubscribed).toBe(false);
  });
});
