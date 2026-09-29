/**
 * Dorisio Push Notification Service Worker
 *
 * Plain, standalone JavaScript (no build step / no imports) served from the
 * Next.js public folder at /service-worker.js, as required for a Service
 * Worker script. Handles two responsibilities:
 *
 *  1. `push`            - show a browser Notification built from the push
 *                          event's JSON payload.
 *  2. `notificationclick` - focus an already-open Dorisio tab (navigating it
 *                          to the notification's target URL) or open a new
 *                          one, then close the notification.
 *
 * Expected push payload shape (JSON):
 *   {
 *     "type": "new_tip" | "wallet_verified" | "payout_processed",
 *     "title": "...",        // optional override, else derived from `type`
 *     "body": "...",         // optional override, else derived from `type`
 *     "url": "/creators/alice/dashboard" // path to open on click
 *   }
 *
 * Unknown/missing `type` values still show a generic notification rather
 * than silently dropping the push event, since a swallowed push is worse
 * than a slightly generic one.
 */

/** Per-type default title/body, used when the payload doesn't supply them. */
var NOTIFICATION_DEFAULTS = {
  new_tip: {
    title: 'New tip received',
    body: 'You just received a new tip.',
  },
  wallet_verified: {
    title: 'Wallet verified',
    body: 'Your wallet has been successfully verified.',
  },
  payout_processed: {
    title: 'Payout processed',
    body: 'Your payout has been processed.',
  },
};

var DEFAULT_NOTIFICATION = {
  title: 'Dorisio',
  body: 'You have a new notification.',
};

var FALLBACK_URL = '/';

function parsePushPayload(event) {
  if (!event.data) {
    return null;
  }
  try {
    return event.data.json();
  } catch (err) {
    // Not JSON (or malformed) - fall back to plain text as the body so the
    // push event still results in a visible notification.
    try {
      return { body: event.data.text() };
    } catch (textErr) {
      return null;
    }
  }
}

self.addEventListener('push', function (event) {
  var payload = parsePushPayload(event) || {};
  var typeDefaults = NOTIFICATION_DEFAULTS[payload.type] || DEFAULT_NOTIFICATION;

  var title = payload.title || typeDefaults.title;
  var body = payload.body || typeDefaults.body;
  var url = typeof payload.url === 'string' && payload.url ? payload.url : FALLBACK_URL;

  var options = {
    body: body,
    icon: payload.icon || '/dorisio-logo.svg',
    badge: payload.badge || '/dorisio-logo.svg',
    data: {
      url: url,
      type: payload.type || 'system',
    },
    tag: payload.tag || payload.type,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var targetUrl = (event.notification.data && event.notification.data.url) || FALLBACK_URL;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          var clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin && 'focus' in client) {
            // Navigate the existing tab to the notification's target and
            // bring it to the foreground, rather than piling up new tabs.
            if ('navigate' in client) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      })
  );
});
