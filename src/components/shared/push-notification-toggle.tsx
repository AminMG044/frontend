/**
 * PushNotificationToggle
 *
 * Opt-in/opt-out UI for browser push notifications (new tip, wallet
 * verified, payout processed - see `public/service-worker.js`). Distinct
 * from the in-app toast/notification-center settings elsewhere in this
 * file's siblings; this one is specifically about OS-level browser push.
 *
 * Handles the three permission states a browser can be in:
 *  - 'default'  - not yet asked; toggling on triggers the browser prompt.
 *  - 'granted'  - subscribed/unsubscribed freely via the toggle.
 *  - 'denied'   - browser-level block that this app cannot re-prompt for;
 *                 shows guidance to change it in browser settings instead.
 */

'use client';

import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/hooks/use-push-notifications';

export function PushNotificationToggle(): JSX.Element | null {
  const { isSupported, permission, isSubscribed, isLoading, error, subscribe, unsubscribe } =
    usePushNotifications();

  if (!isSupported) {
    return (
      <div className="flex items-start gap-3 text-sm text-muted-foreground">
        <BellOff className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>Push notifications aren&apos;t supported in this browser.</p>
      </div>
    );
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          role="switch"
          aria-checked={isSubscribed}
          checked={isSubscribed}
          disabled={isLoading || permission === 'denied'}
          onChange={handleToggle}
          className="w-4 h-4 rounded border-gray-300"
        />
        <Bell className="h-4 w-4" />
        <span className="text-sm">Enable browser push notifications</span>
      </label>
      <p className="text-xs text-muted-foreground">
        Get notified about new tips, wallet verification, and payouts even when Dorisio isn&apos;t
        open.
      </p>

      {permission === 'denied' && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
          Notifications are blocked for this site at the browser level. To enable them, update the
          notification permission for this site in your browser&apos;s settings, then reload the
          page.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </p>
      )}
    </div>
  );
}
