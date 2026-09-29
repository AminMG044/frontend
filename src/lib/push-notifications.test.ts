/**
 * Tests for the push notification registration/subscription module.
 *
 * `navigator.serviceWorker`, `Notification`, and `PushManager` don't exist
 * in the happy-dom test environment by default, so each is stubbed on
 * `navigator`/`window` per-test (mirroring the MockWebSocket pattern used in
 * use-realtime-notifications.test.tsx: a small controllable fake exposing
 * exactly the surface the module under test calls).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isPushSupported,
  registerServiceWorker,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getExistingSubscription,
} from './push-notifications';

function stubNotification(permission: NotificationPermission, requestResult?: NotificationPermission) {
  const requestPermission = vi.fn().mockResolvedValue(requestResult ?? permission);
  const NotificationStub = {
    permission,
    requestPermission,
  };
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    writable: true,
    value: NotificationStub,
  });
  return NotificationStub;
}

function stubServiceWorker(registerImpl?: () => Promise<unknown>) {
  const register = vi.fn(registerImpl ?? (() => Promise.resolve({ scope: '/' })));
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    writable: true,
    value: { register },
  });
  return { register };
}

function stubPushManager() {
  Object.defineProperty(window, 'PushManager', {
    configurable: true,
    writable: true,
    value: function PushManager() {},
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

describe('isPushSupported', () => {
  afterEach(() => {
    clearGlobalStub('serviceWorker');
    clearGlobalStub('PushManager');
    clearGlobalStub('Notification');
  });

  it('returns false when serviceWorker, PushManager, or Notification is missing', () => {
    expect(isPushSupported()).toBe(false);
  });

  it('returns true when all required APIs are present', () => {
    stubServiceWorker();
    stubPushManager();
    stubNotification('default');

    expect(isPushSupported()).toBe(true);
  });
});

describe('registerServiceWorker', () => {
  afterEach(() => {
    clearGlobalStub('serviceWorker');
    clearGlobalStub('PushManager');
    clearGlobalStub('Notification');
  });

  it('returns null when push is unsupported rather than throwing', async () => {
    const result = await registerServiceWorker();
    expect(result).toBeNull();
  });

  it('registers /service-worker.js and returns the registration', async () => {
    stubPushManager();
    stubNotification('default');
    const { register } = stubServiceWorker(() => Promise.resolve({ scope: '/' }));

    const result = await registerServiceWorker();

    expect(register).toHaveBeenCalledWith('/service-worker.js');
    expect(result).toEqual({ scope: '/' });
  });

  it('returns null and logs rather than throwing when registration rejects', async () => {
    stubPushManager();
    stubNotification('default');
    stubServiceWorker(() => Promise.reject(new Error('registration failed')));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await registerServiceWorker();

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('getNotificationPermission / requestNotificationPermission', () => {
  afterEach(() => {
    clearGlobalStub('Notification');
  });

  it('reports "unsupported" when Notification does not exist', () => {
    expect(getNotificationPermission()).toBe('unsupported');
  });

  it('reads the current permission for each state: default, granted, denied', () => {
    stubNotification('default');
    expect(getNotificationPermission()).toBe('default');

    stubNotification('granted');
    expect(getNotificationPermission()).toBe('granted');

    stubNotification('denied');
    expect(getNotificationPermission()).toBe('denied');
  });

  it('requests permission and resolves with the granted result', async () => {
    stubNotification('default', 'granted');

    const result = await requestNotificationPermission();

    expect(result).toBe('granted');
  });

  it('requests permission and resolves with the denied result', async () => {
    stubNotification('default', 'denied');

    const result = await requestNotificationPermission();

    expect(result).toBe('denied');
  });

  it('resolves to "unsupported" when Notification does not exist', async () => {
    const result = await requestNotificationPermission();
    expect(result).toBe('unsupported');
  });
});

describe('subscribeToPush', () => {
  const originalEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  beforeEach(() => {
    stubServiceWorker();
    stubPushManager();
  });

  afterEach(() => {
    clearGlobalStub('serviceWorker');
    clearGlobalStub('PushManager');
    clearGlobalStub('Notification');
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalEnv;
  });

  function makeRegistration(pushManagerOverrides: Record<string, unknown> = {}) {
    return {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockResolvedValue({ endpoint: 'https://push.example/sub-1' }),
        ...pushManagerOverrides,
      },
    } as unknown as ServiceWorkerRegistration;
  }

  it('returns status "denied" when Notification permission is not granted', async () => {
    stubNotification('default');
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-key';
    const registration = makeRegistration();

    const result = await subscribeToPush(registration);

    expect(result.status).toBe('denied');
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('returns status "unavailable" and does not throw when no VAPID key is configured', async () => {
    stubNotification('granted');
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const registration = makeRegistration();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await subscribeToPush(registration);

    expect(result.status).toBe('unavailable');
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('subscribes and returns status "subscribed" when permission is granted and a VAPID key exists', async () => {
    stubNotification('granted');
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'BEXAMPLEKEY1234567890abcdefghijklmno-_';
    const registration = makeRegistration();

    const result = await subscribeToPush(registration);

    expect(result.status).toBe('subscribed');
    expect(result.subscription).toEqual({ endpoint: 'https://push.example/sub-1' });
    expect(registration.pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true })
    );
  });

  it('reuses an existing subscription instead of creating a duplicate', async () => {
    stubNotification('granted');
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'BEXAMPLEKEY1234567890abcdefghijklmno-_';
    const registration = makeRegistration({
      getSubscription: vi.fn().mockResolvedValue({ endpoint: 'https://push.example/existing' }),
    });

    const result = await subscribeToPush(registration);

    expect(result.status).toBe('subscribed');
    expect(result.subscription).toEqual({ endpoint: 'https://push.example/existing' });
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('returns status "error" without throwing when subscribe() rejects', async () => {
    stubNotification('granted');
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'BEXAMPLEKEY1234567890abcdefghijklmno-_';
    const registration = makeRegistration({
      subscribe: vi.fn().mockRejectedValue(new Error('push service unreachable')),
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await subscribeToPush(registration);

    expect(result.status).toBe('error');
    expect(result.error).toBe('push service unreachable');
    consoleSpy.mockRestore();
  });

  it('returns status "unsupported" when push APIs are unavailable', async () => {
    clearGlobalStub('PushManager');
    const registration = makeRegistration();

    const result = await subscribeToPush(registration);

    expect(result.status).toBe('unsupported');
  });
});

describe('unsubscribeFromPush', () => {
  afterEach(() => {
    clearGlobalStub('serviceWorker');
    clearGlobalStub('PushManager');
    clearGlobalStub('Notification');
  });

  it('unsubscribes an existing subscription and returns true on success', async () => {
    stubServiceWorker();
    stubPushManager();
    stubNotification('granted');
    const unsubscribe = vi.fn().mockResolvedValue(true);
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue({ unsubscribe }),
      },
    } as unknown as ServiceWorkerRegistration;

    const result = await unsubscribeFromPush(registration);

    expect(unsubscribe).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('returns true when there is no subscription to remove', async () => {
    stubServiceWorker();
    stubPushManager();
    stubNotification('granted');
    const registration = {
      pushManager: { getSubscription: vi.fn().mockResolvedValue(null) },
    } as unknown as ServiceWorkerRegistration;

    const result = await unsubscribeFromPush(registration);

    expect(result).toBe(true);
  });

  it('returns false without throwing when unsubscribe() rejects', async () => {
    stubServiceWorker();
    stubPushManager();
    stubNotification('granted');
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockRejectedValue(new Error('boom')),
      },
    } as unknown as ServiceWorkerRegistration;
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await unsubscribeFromPush(registration);

    expect(result).toBe(false);
    consoleSpy.mockRestore();
  });
});

describe('getExistingSubscription', () => {
  afterEach(() => {
    clearGlobalStub('serviceWorker');
    clearGlobalStub('PushManager');
    clearGlobalStub('Notification');
  });

  it('returns null when push is unsupported', async () => {
    const registration = {
      pushManager: { getSubscription: vi.fn() },
    } as unknown as ServiceWorkerRegistration;

    const result = await getExistingSubscription(registration);

    expect(result).toBeNull();
  });

  it('returns the current subscription when supported', async () => {
    stubServiceWorker();
    stubPushManager();
    stubNotification('granted');
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue({ endpoint: 'https://push.example/x' }),
      },
    } as unknown as ServiceWorkerRegistration;

    const result = await getExistingSubscription(registration);

    expect(result).toEqual({ endpoint: 'https://push.example/x' });
  });
});
