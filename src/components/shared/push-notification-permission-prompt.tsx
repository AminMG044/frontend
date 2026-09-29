/**
 * PushNotificationPermissionPrompt
 *
 * A dismissible banner shown on the creator dashboard (per issue #15's
 * "request notification permissions on dashboard or signup") inviting the
 * user to enable browser push notifications. Only renders while permission
 * is still in its 'default' (unasked) state and the user hasn't already
 * dismissed it this session - once permission is granted, denied, or the
 * banner is dismissed, it stays hidden so it isn't a recurring nag.
 *
 * The actual permission request / subscription happens through
 * `usePushNotifications().subscribe()`, same as the settings-page toggle -
 * this is just an earlier, more prominent entry point into the same flow.
 */

'use client';

import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/use-push-notifications';

export function PushNotificationPermissionPrompt(): JSX.Element | null {
  const { isSupported, permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  if (!isSupported || dismissed || isSubscribed || permission !== 'default') {
    return null;
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 mb-6">
      <Bell className="h-5 w-5 flex-shrink-0 mt-0.5 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Stay updated with push notifications</p>
        <p className="text-xs text-muted-foreground mt-1">
          Get notified instantly about new tips, wallet verification, and payouts.
        </p>
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={() => void subscribe()} disabled={isLoading}>
            {isLoading ? 'Enabling...' : 'Enable notifications'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDismissed(true)}>
            Not now
          </Button>
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
