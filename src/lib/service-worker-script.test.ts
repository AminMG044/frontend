/**
 * Tests for public/service-worker.js's notification-handling behavior.
 *
 * The service worker is deliberately plain, standalone JavaScript (no
 * imports/exports, no build step - Service Workers must be servable as-is
 * from /service-worker.js) rather than a TypeScript module, so it can't be
 * `import`ed directly into a Vitest module graph. Instead, this test loads
 * the script's source text and evaluates it against a minimal fake
 * `self`/`clients` service worker global scope (the same idea as mocking
 * `navigator.serviceWorker` elsewhere in this suite: fake exactly the
 * surface the script touches - `self.addEventListener`,
 * `self.registration.showNotification`, `self.clients.matchAll` /
 * `openWindow`), then drives the registered `push` and `notificationclick`
 * listeners directly to assert on the resulting Notification calls.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const serviceWorkerSource = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/service-worker.js'),
  'utf-8'
);

/** A push or notificationclick event, as far as service-worker.js touches it. */
interface FakeServiceWorkerEvent {
  data?: { json: () => unknown; text: () => string } | null;
  notification?: { data: Record<string, unknown>; close: () => void };
  waitUntil: (promise: Promise<unknown>) => void;
}

type FakeListener = (event: FakeServiceWorkerEvent) => void;
type FakeListenerMap = Record<string, FakeListener[]>;

/** The minimal Service Worker global scope surface service-worker.js touches. */
interface FakeSelf {
  location: { origin: string };
  registration: { showNotification: (title: string, options: unknown) => Promise<void> };
  clients: {
    matchAll: (options?: unknown) => Promise<FakeClient[]>;
    openWindow: (url: string) => Promise<void>;
  };
  addEventListener: (type: string, listener: FakeListener) => void;
}

interface FakeClient {
  url: string;
  focused: boolean;
  navigatedTo?: string;
  focus: () => Promise<FakeClient>;
  navigate: (url: string) => void;
}

function makeFakeClient(url: string): FakeClient {
  const client: FakeClient = {
    url,
    focused: false,
    navigate(target: string) {
      client.navigatedTo = target;
    },
    async focus() {
      client.focused = true;
      return client;
    },
  };
  return client;
}

/**
 * Builds a fresh fake Service Worker global scope, evaluates
 * service-worker.js against it (capturing the listeners it registers via
 * `self.addEventListener`), and returns handles to trigger those listeners
 * and inspect what the script did.
 */
function loadServiceWorker(existingClients: FakeClient[] = []) {
  const listeners: FakeListenerMap = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const matchAll = vi.fn().mockResolvedValue(existingClients);

  const self: FakeSelf = {
    location: { origin: 'https://dorisio.io' },
    registration: { showNotification },
    clients: { matchAll, openWindow },
    addEventListener: (type, listener) => {
      (listeners[type] ??= []).push(listener);
    },
  };

  // Evaluate the script with `self` bound to our fake scope. The script
  // only ever references the implicit global `self` (as real service
  // workers do), so running it as a function body with `self` as a
  // parameter reproduces that environment without needing a real Worker.
  const factory = new Function('self', 'URL', serviceWorkerSource);
  factory(self, URL);

  return { self, listeners, showNotification, openWindow, matchAll };
}

function dispatchPush(listeners: FakeListenerMap, payload: unknown) {
  const waitUntilPromises: Promise<unknown>[] = [];
  const event: FakeServiceWorkerEvent = {
    data: {
      json: () => payload,
      text: () => JSON.stringify(payload),
    },
    waitUntil: (p) => waitUntilPromises.push(p),
  };
  for (const listener of listeners['push'] ?? []) {
    listener(event);
  }
  return Promise.all(waitUntilPromises);
}

function dispatchNotificationClick(listeners: FakeListenerMap, data: Record<string, unknown>) {
  const waitUntilPromises: Promise<unknown>[] = [];
  const close = vi.fn();
  const event: FakeServiceWorkerEvent = {
    notification: { data, close },
    waitUntil: (p) => waitUntilPromises.push(p),
  };
  for (const listener of listeners['notificationclick'] ?? []) {
    listener(event);
  }
  return Promise.all(waitUntilPromises).then(() => ({ close }));
}

describe('service-worker.js', () => {
  it('registers push and notificationclick listeners', () => {
    const { listeners } = loadServiceWorker();

    expect(listeners['push']).toHaveLength(1);
    expect(listeners['notificationclick']).toHaveLength(1);
  });

  it('shows a "new tip" notification with the default title/body for that type', async () => {
    const { listeners, showNotification } = loadServiceWorker();

    await dispatchPush(listeners, { type: 'new_tip', url: '/creators/alice/dashboard' });

    expect(showNotification).toHaveBeenCalledWith(
      'New tip received',
      expect.objectContaining({
        body: expect.stringContaining('tip'),
        data: { url: '/creators/alice/dashboard', type: 'new_tip' },
      })
    );
  });

  it('shows a "wallet verified" notification with the default title/body for that type', async () => {
    const { listeners, showNotification } = loadServiceWorker();

    await dispatchPush(listeners, { type: 'wallet_verified', url: '/settings' });

    expect(showNotification).toHaveBeenCalledWith(
      'Wallet verified',
      expect.objectContaining({ data: { url: '/settings', type: 'wallet_verified' } })
    );
  });

  it('shows a "payout processed" notification with the default title/body for that type', async () => {
    const { listeners, showNotification } = loadServiceWorker();

    await dispatchPush(listeners, {
      type: 'payout_processed',
      url: '/creators/alice/dashboard',
    });

    expect(showNotification).toHaveBeenCalledWith(
      'Payout processed',
      expect.objectContaining({ data: { url: '/creators/alice/dashboard', type: 'payout_processed' } })
    );
  });

  it('lets an explicit title/body in the payload override the per-type default', async () => {
    const { listeners, showNotification } = loadServiceWorker();

    await dispatchPush(listeners, {
      type: 'new_tip',
      title: 'Custom title',
      body: 'Custom body',
      url: '/x',
    });

    expect(showNotification).toHaveBeenCalledWith(
      'Custom title',
      expect.objectContaining({ body: 'Custom body' })
    );
  });

  it('falls back to a generic notification for an unknown/missing type rather than dropping the push', async () => {
    const { listeners, showNotification } = loadServiceWorker();

    await dispatchPush(listeners, {});

    expect(showNotification).toHaveBeenCalledWith(
      'Dorisio',
      expect.objectContaining({ data: expect.objectContaining({ type: 'system' }) })
    );
  });

  it('falls back to a generic notification when the push has no JSON body at all', async () => {
    const { listeners, showNotification } = loadServiceWorker();

    const waitUntilPromises: Promise<unknown>[] = [];
    const event: FakeServiceWorkerEvent = {
      data: null,
      waitUntil: (p) => waitUntilPromises.push(p),
    };
    for (const listener of listeners['push'] ?? []) listener(event);
    await Promise.all(waitUntilPromises);

    expect(showNotification).toHaveBeenCalledWith('Dorisio', expect.any(Object));
  });

  it('focuses and navigates an already-open matching tab on notification click', async () => {
    const existingClient = makeFakeClient('https://dorisio.io/creators/alice/dashboard');
    const { listeners, openWindow } = loadServiceWorker([existingClient]);

    const { close } = await dispatchNotificationClick(listeners, {
      url: '/settings',
      type: 'wallet_verified',
    });

    expect(existingClient.focused).toBe(true);
    expect(existingClient.navigatedTo).toBe('/settings');
    expect(openWindow).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it('opens a new window when no matching tab is already open', async () => {
    const { listeners, openWindow } = loadServiceWorker([]);

    await dispatchNotificationClick(listeners, { url: '/creators/alice/dashboard' });

    expect(openWindow).toHaveBeenCalledWith('/creators/alice/dashboard');
  });

  it('ignores clients from a different origin when looking for a tab to focus', async () => {
    const otherOriginClient = makeFakeClient('https://not-dorisio.example/somewhere');
    const { listeners, openWindow } = loadServiceWorker([otherOriginClient]);

    await dispatchNotificationClick(listeners, { url: '/settings' });

    expect(otherOriginClient.focused).toBe(false);
    expect(openWindow).toHaveBeenCalledWith('/settings');
  });

  it('falls back to "/" when the notification has no url in its data', async () => {
    const { listeners, openWindow } = loadServiceWorker([]);

    await dispatchNotificationClick(listeners, {});

    expect(openWindow).toHaveBeenCalledWith('/');
  });
});
