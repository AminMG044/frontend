/**
 * Sentry — browser runtime
 *
 * Loaded automatically by the Sentry Next.js plugin. Monitoring is a no-op
 * until NEXT_PUBLIC_SENTRY_DSN is configured, so local development and preview
 * environments stay quiet without any extra setup.
 */

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  // Capture a small share of transactions for performance/regression signal.
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  // Breadcrumbs are on by default in Sentry and power the "user actions
  // leading up to an error" trail. Never send PII by default.
  sendDefaultPii: false,
});
