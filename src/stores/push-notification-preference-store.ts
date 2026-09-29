/**
 * Push Notification Preference Store
 * Persists the user's opt-in/opt-out choice for browser push notifications
 * across sessions, following the same zustand `persist` pattern as
 * `wallet-preference-store.ts`.
 *
 * This is distinct from browser-level `Notification.permission` (which the
 * browser owns and this app cannot set/clear) - it's the app-level "the
 * user asked to receive push notifications" preference, used to decide
 * whether to (re)subscribe on load and to drive the toggle UI.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PushNotificationPreferenceStore {
  /** Whether the user has opted in to push notifications. Defaults to false
   *  until they explicitly opt in via the preferences toggle. */
  optedIn: boolean;

  setOptedIn: (optedIn: boolean) => void;
}

export const usePushNotificationPreferenceStore = create<PushNotificationPreferenceStore>()(
  persist(
    (set) => ({
      optedIn: false,

      setOptedIn: (optedIn) => set({ optedIn }),
    }),
    {
      name: 'Dorisio-push-notification-preference',
    }
  )
);
