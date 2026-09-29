/**
 * usePushNotifications
 *
 * React hook wrapping Service Worker registration + browser Push API
 * subscription state behind a small, component-friendly API. Distinct from
 * `useNotifications` (in-app notification center) and the toast-style
 * `useNotification`/`useAppStore` notifications - this hook is specifically
 * about OS-level browser push notifications (new tip / wallet verified /
 * payout processed) delivered via `public/service-worker.js`.
 *
 * The user's opt-in/opt-out choice is persisted via
 * `usePushNotificationPreferenceStore` (localStorage, same pattern as
 * `useWalletPreferenceStore`) so it survives reloads. Browser permission
 * itself (`Notification.permission`) is read fresh on each check since only
 * the browser can grant/revoke it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getNotificationPermission,
  isPushSupported,
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  type PushPermission,
} from '@/lib/push-notifications';
import { usePushNotificationPreferenceStore } from '@/stores/push-notification-preference-store';

export interface UsePushNotificationsResult {
  /** Whether this browser supports the Service Worker + Push APIs at all. */
  isSupported: boolean;
  /** Current browser notification permission ('default' | 'granted' | 'denied' | 'unsupported'). */
  permission: PushPermission;
  /** True once an active push subscription exists for this browser. */
  isSubscribed: boolean;
  /** True while a register/subscribe/unsubscribe operation is in flight. */
  isLoading: boolean;
  /** Set when the most recent subscribe attempt failed; cleared on the next attempt. */
  error: string | null;
  /** Requests permission (if needed) and subscribes to push. */
  subscribe: () => Promise<void>;
  /** Unsubscribes from push and clears the opt-in preference. */
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const isSupported = isPushSupported();
  const optedIn = usePushNotificationPreferenceStore((state) => state.optedIn);
  const setOptedIn = usePushNotificationPreferenceStore((state) => state.setOptedIn);

  const [permission, setPermission] = useState<PushPermission>(() =>
    isSupported ? getNotificationPermission() : 'unsupported'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount only, if the user was already opted in on a previous visit
  // (persisted preference read at mount time, captured in
  // `optedInAtMountRef`), re-register the service worker and reconcile
  // whether an active push subscription still exists so `isSubscribed`
  // reflects reality rather than just the stored preference - e.g. the
  // subscription may have been silently dropped by the browser, or
  // permission may have been revoked since the last session.
  //
  // This deliberately runs exactly once per mount (empty dependency array)
  // rather than re-running on every `optedIn` change: `subscribe()` and
  // `unsubscribe()` already own the subscribed/opted-in state transition
  // when the user acts within this session, and re-running this
  // reconciliation whenever `optedIn` flips (e.g. immediately after
  // `subscribe()` sets it to true) would race with - and can clobber -
  // that fresher result with a not-yet-consistent `getSubscription()` read.
  const optedInAtMountRef = useRef(optedIn);
  useEffect(() => {
    if (!isSupported || !optedInAtMountRef.current) {
      return;
    }

    let cancelled = false;

    (async () => {
      const registration = await registerServiceWorker();
      if (!registration || cancelled) return;

      const current = getNotificationPermission();
      if (cancelled) return;
      setPermission(current);

      if (current !== 'granted') {
        return;
      }

      const existing = await registration.pushManager.getSubscription().catch(() => null);
      if (!cancelled) {
        setIsSubscribed(Boolean(existing));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await registerServiceWorker();
      if (!registration) {
        setError('Failed to register the service worker.');
        return;
      }

      let currentPermission = getNotificationPermission();
      if (currentPermission === 'default') {
        currentPermission = await requestNotificationPermission();
      }
      setPermission(currentPermission);

      if (currentPermission !== 'granted') {
        setIsSubscribed(false);
        setOptedIn(false);
        return;
      }

      const result = await subscribeToPush(registration);

      if (result.status === 'subscribed') {
        setIsSubscribed(true);
        setOptedIn(true);
        return;
      }

      setIsSubscribed(false);
      setOptedIn(false);
      if (result.status === 'unavailable') {
        setError('Push notifications are not fully configured for this environment yet.');
      } else if (result.status === 'error') {
        setError(result.error ?? 'Failed to subscribe to push notifications.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, setOptedIn]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isSupported && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration('/service-worker.js');
        if (registration) {
          await unsubscribeFromPush(registration);
        }
      }
    } catch (err) {
      console.error('Failed to unsubscribe from push notifications:', err);
    } finally {
      setIsSubscribed(false);
      setOptedIn(false);
      setIsLoading(false);
    }
  }, [isSupported, setOptedIn]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}
