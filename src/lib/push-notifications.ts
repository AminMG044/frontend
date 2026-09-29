/**
 * Push Notifications - Registration & Subscription
 *
 * Wraps the browser Service Worker + Push API so the rest of the app never
 * has to touch `navigator.serviceWorker` / `PushManager` directly. This is
 * a distinct concern from:
 *   - `src/components/notification-provider.tsx` (in-app toast messages), and
 *   - `src/hooks/use-notifications.ts` (in-app notification center, backed
 *     by the Dorisio SDK's `Notification` records).
 *
 * Naming here deliberately says "push" throughout (pushNotifications*,
 * PushSubscriptionState, etc.) to avoid colliding with either of those.
 *
 * VAPID: subscribing to the browser Push API requires a VAPID public key
 * issued by the backend push service. There is no such backend configured
 * in this environment, so the key is sourced from
 * `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and every function here guards against it
 * being unset - `subscribeToPush` resolves to a clear
 * `{ status: 'unavailable' }` result instead of throwing, so the feature
 * degrades gracefully (permission + preference UI still work) until a real
 * key is provided in the environment.
 */

export type PushPermission = NotificationPermission | 'unsupported';

export interface PushSubscriptionResult {
  status: 'subscribed' | 'denied' | 'unsupported' | 'unavailable' | 'error';
  subscription?: PushSubscription;
  error?: string;
}

/** True when the browser exposes the APIs push notifications need. */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Registers /service-worker.js. Safe to call multiple times - the browser
 * returns the existing registration if one is already active for the same
 * script URL/scope.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register('/service-worker.js');
  } catch (error) {
    console.error('Failed to register service worker:', error);
    return null;
  }
}

/** Current Notification permission, or 'unsupported' if the API doesn't exist. */
export function getNotificationPermission(): PushPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Prompts the user for notification permission. Resolves with the resulting
 * permission state rather than throwing, since a user dismissing/denying
 * the prompt is an expected outcome, not an error.
 */
export async function requestNotificationPermission(): Promise<PushPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    return await Notification.requestPermission();
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return Notification.permission;
  }
}

function getVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}

/**
 * Converts a URL-safe base64 VAPID key into the Uint8Array shape
 * `applicationServerKey` expects. Standard Push API boilerplate.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribes the given registration to the Push API. Requires notification
 * permission to already be granted and a VAPID public key to be configured;
 * either missing condition is reported back via `status` rather than thrown,
 * so callers (the hook/UI) can show an appropriate message instead of
 * crashing.
 */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscriptionResult> {
  if (!isPushSupported()) {
    return { status: 'unsupported' };
  }

  if (Notification.permission !== 'granted') {
    return { status: 'denied' };
  }

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) {
    console.warn(
      'Push notifications: NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set; skipping push subscription.'
    );
    return { status: 'unavailable' };
  }

  try {
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      return { status: 'subscribed', subscription: existing };
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast needed because this TS/lib.dom.d.ts version types
      // `applicationServerKey` against `ArrayBufferView<ArrayBuffer>`
      // specifically, which a plain `Uint8Array` (backed by the broader
      // `ArrayBufferLike`) doesn't structurally satisfy, even though the
      // real Push API accepts any BufferSource here.
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
    });

    return { status: 'subscribed', subscription };
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Unsubscribes from push on the given registration, if a subscription
 * exists. Resolves to true when there is no subscription left afterward
 * (including when there was none to begin with), false only when the
 * browser's `unsubscribe()` call itself reports failure.
 */
export async function unsubscribeFromPush(
  registration: ServiceWorkerRegistration
): Promise<boolean> {
  if (!isPushSupported()) {
    return true;
  }

  try {
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return true;
    }
    return await subscription.unsubscribe();
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

/** Convenience helper: resolves the current push subscription, if any. */
export async function getExistingSubscription(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null;
  }
  try {
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Failed to read existing push subscription:', error);
    return null;
  }
}
