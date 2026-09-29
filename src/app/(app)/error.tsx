'use client';

import { AppErrorFallback } from '@/components/app-error-fallback';

/**
 * Error boundary for the authenticated `(app)` route group. Keeps the app
 * chrome (navigation, providers) mounted while the failed page is replaced
 * with a recoverable fallback.
 */
export default function AppGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return <AppErrorFallback error={error} reset={reset} scope="app/(app)/error" />;
}
