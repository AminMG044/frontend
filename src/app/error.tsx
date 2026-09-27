'use client';

import { AppErrorFallback } from '@/components/app-error-fallback';

/**
 * Route-segment error boundary for the whole `app/` tree.
 *
 * Next.js renders this in place of the failed segment when a render/loader
 * error escapes a child boundary, so the rest of the shell (and the root
 * layout) keeps working.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return <AppErrorFallback error={error} reset={reset} scope="app/error" />;
}
